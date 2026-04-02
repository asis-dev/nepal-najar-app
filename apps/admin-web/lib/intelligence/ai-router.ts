/**
 * AI Model Router — picks the right model for each task
 *
 * Strategy (priority order):
 * 1. OpenClaw API/CLI → GPT 5.3 (best quality, local only)
 * 2. OpenAI direct → GPT-4.1-nano (classify) / GPT-4.1-mini (reasoning)
 * 3. Gemini 2.5 Flash (free tier, rate-limited)
 * 4. OpenRouter (DeepSeek)
 * 5. Local Qwen via LM Studio (offline fallback)
 *
 * Transcription: Groq Whisper (fast + cheap)
 */

// Dynamic import — child_process doesn't exist on some runtimes
let execFileSync: typeof import('child_process').execFileSync | null = null;
try {
  execFileSync = require('child_process').execFileSync;
} catch {
  // Not available (Edge Runtime / Vercel) — OpenClaw will be skipped
}

const fs = require('fs');
const os = require('os');
const path = require('path');

interface AIConfig {
  provider: 'openclaw' | 'openai' | 'openrouter' | 'gemini' | 'groq' | 'local';
  model: string;
  apiKey: string;
  baseUrl: string;
  maxTokens: number;
  temperature: number;
}

type TaskType = 'classify' | 'reason' | 'summarize' | 'transcribe' | 'extract';

const OPENCLAW_PATH =
  process.env.OPENCLAW_PATH || `${os.homedir()}/.openclaw/bin/openclaw`;
const OPENCLAW_AUTH_PATH = resolveHomePath(
  process.env.OPENCLAW_AUTH_PATH ||
    `${os.homedir()}/.openclaw/agents/main/agent/auth-profiles.json`,
);
const OPENCLAW_MODEL = process.env.OPENCLAW_MODEL || 'gpt-5.3-codex';
const OPENCLAW_BASE_URL =
  process.env.OPENCLAW_BASE_URL || 'https://api.openai.com/v1';
const OPENCLAW_FORCE_CLI = process.env.OPENCLAW_FORCE_CLI === 'true';
const OPENCLAW_AGENT = process.env.OPENCLAW_AGENT || 'main';
const OPENCLAW_ONLY =
  process.env.INTELLIGENCE_OPENCLAW_ONLY === 'true' ||
  process.env.OPENCLAW_ONLY === 'true';
const OPENCLAW_PREFERRED =
  process.env.INTELLIGENCE_PREFER_OPENCLAW !== 'false';

function resolveHomePath(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }

  return filePath;
}

function getOpenClawAccessToken(): string | null {
  if (OPENCLAW_FORCE_CLI) return null;

  const envToken =
    process.env.OPENCLAW_API_KEY || process.env.OPENCLAW_ACCESS_TOKEN;
  if (envToken) return envToken;

  try {
    if (!fs.existsSync(OPENCLAW_AUTH_PATH)) return null;

    const parsed = JSON.parse(fs.readFileSync(OPENCLAW_AUTH_PATH, 'utf-8')) as {
      profiles?: Record<string, { access?: string }>;
    };

    const explicit = parsed.profiles?.['openai-codex:default']?.access;
    if (explicit) return explicit;

    const fallback = Object.values(parsed.profiles || {}).find(
      (profile) => typeof profile?.access === 'string' && profile.access.length > 0,
    );

    return fallback?.access || null;
  } catch {
    return null;
  }
}

function isOpenClawCliAvailable(): boolean {
  if (!execFileSync) return false; // No child_process = no CLI support
  try {
    return fs.existsSync(OPENCLAW_PATH);
  } catch {
    return false;
  }
}

function isOpenClawAvailable(): boolean {
  if (process.env.OPENCLAW_DISABLED === 'true') return false;
  return Boolean(getOpenClawAccessToken()) || isOpenClawCliAvailable();
}

function getOpenClawConfig(task: TaskType): AIConfig | null {
  if (!isOpenClawAvailable()) return null;
  return {
    provider: 'openclaw',
    model: OPENCLAW_MODEL,
    apiKey: getOpenClawAccessToken() || '',
    baseUrl: OPENCLAW_BASE_URL,
    maxTokens: task === 'classify' ? 1000 : 4000,
    temperature: task === 'classify' ? 0.1 : 0.2,
  };
}

function getModelConfig(task: TaskType): AIConfig {
  if (task === 'transcribe') {
    return {
      provider: 'groq',
      model: 'whisper-large-v3',
      apiKey: process.env.GROQ_API_KEY || '',
      baseUrl: 'https://api.groq.com/openai/v1',
      maxTokens: 0,
      temperature: 0,
    };
  }

  // Priority 1: Qwen via OpenRouter (FREE)
  if (process.env.OPENROUTER_API_KEY) {
    return {
      provider: 'openrouter',
      model: 'qwen/qwen3.6-plus-preview:free',
      apiKey: process.env.OPENROUTER_API_KEY,
      baseUrl: 'https://openrouter.ai/api/v1',
      maxTokens: task === 'classify' ? 1000 : 4000,
      temperature: task === 'classify' ? 0.1 : 0.2,
    };
  }

  // Priority 2: OpenAI (paid)
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      model: task === 'reason' || task === 'extract' || task === 'summarize' ? 'gpt-4.1-mini' : 'gpt-4.1-nano',
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com/v1',
      maxTokens: task === 'classify' ? 1000 : 4000,
      temperature: task === 'classify' ? 0.1 : 0.2,
    };
  }

  // Local LM Studio (offline only)
  return getLocalConfig(task);
}

function buildProviderChain(task: TaskType): AIConfig[] {
  if (task === 'transcribe') {
    return [getModelConfig(task)];
  }

  if (OPENCLAW_ONLY) {
    const openClawConfig = getOpenClawConfig(task);
    if (!openClawConfig) {
      return [];
    }

    return [openClawConfig];
  }

  const chain: AIConfig[] = [];
  const openClawConfig = getOpenClawConfig(task);

  // ── SUMMARIZE tasks (daily brief) → OpenAI ONLY ──
  // The editorial brief prompt is tuned for OpenAI. Free models produce garbage.
  if (task === 'summarize') {
    if (OPENCLAW_PREFERRED && openClawConfig) {
      chain.push(openClawConfig);
    }
    if (process.env.OPENAI_API_KEY) {
      chain.push({
        provider: 'openai',
        model: 'gpt-4.1-mini',
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: 'https://api.openai.com/v1',
        maxTokens: 4000,
        temperature: 0.1,
      });
    }
    // Fallback only: Qwen (no Gemini — it produces unparseable responses)
    if (process.env.OPENROUTER_API_KEY) {
      chain.push({
        provider: 'openrouter',
        model: 'qwen/qwen3.6-plus-preview:free',
        apiKey: process.env.OPENROUTER_API_KEY,
        baseUrl: 'https://openrouter.ai/api/v1',
        maxTokens: 4000,
        temperature: 0.1,
      });
    }
    return chain;
  }

  // ── All other tasks (classify, reason, extract) ──
  if (OPENCLAW_PREFERRED && openClawConfig) {
    chain.push(openClawConfig);
  }

  // Priority 1: OpenRouter/Qwen (FREE — try first)
  if (process.env.OPENROUTER_API_KEY) {
    chain.push({
      provider: 'openrouter',
      model: 'qwen/qwen3.6-plus-preview:free',
      apiKey: process.env.OPENROUTER_API_KEY,
      baseUrl: 'https://openrouter.ai/api/v1',
      maxTokens: task === 'classify' ? 1000 : 4000,
      temperature: task === 'classify' ? 0.1 : 0.2,
    });
  }

  // Priority 2: OpenAI (paid fallback)
  if (process.env.OPENAI_API_KEY) {
    chain.push({
      provider: 'openai',
      model: task === 'reason' || task === 'extract' ? 'gpt-4.1-mini' : 'gpt-4.1-nano',
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com/v1',
      maxTokens: task === 'classify' ? 1000 : 4000,
      temperature: task === 'classify' ? 0.1 : 0.2,
    });
  }

  // Local LM Studio (offline fallback)
  chain.push(getLocalConfig(task));
  return chain;
}

function getLocalConfig(task?: TaskType): AIConfig {
  return {
    provider: 'local',
    model: process.env.AI_MODEL || 'qwen3.5-27b',
    apiKey: process.env.AI_API_KEY || 'lm-studio',
    baseUrl: process.env.AI_BASE_URL || 'http://localhost:1234/v1',
    maxTokens: task === 'classify' ? 2000 : 6000,
    temperature: 0.1,
  };
}

// Cost tracking
const COST_PER_1M_TOKENS: Record<string, { input: number; output: number }> = {
  'gpt-5.3-codex': { input: 2.0, output: 8.0 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
  'gpt-4.1-nano': { input: 0.1, output: 0.4 },
  'deepseek/deepseek-r1': { input: 0.55, output: 2.19 },
  'deepseek/deepseek-chat-v3-0324': { input: 0.27, output: 1.1 },
  'qwen/qwen3.6-plus-preview:free': { input: 0, output: 0 },
  'gemini-2.5-flash': { input: 0, output: 0 },
  local: { input: 0, output: 0 },
};

interface AIResponse {
  content: string;
  tokensUsed: { input: number; output: number };
  costUsd: number;
  model: string;
  provider: string;
}

/**
 * Call OpenClaw with either a token-backed OpenAI-compatible API request
 * or the local CLI as a fallback.
 *
 * The API path works anywhere a valid OpenClaw/OpenAI-compatible access token
 * is available. The CLI path is kept as a local fallback.
 */
async function callOpenClaw(
  config: AIConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<AIResponse> {
  if (config.apiKey && !OPENCLAW_FORCE_CLI) {
    try {
      return await callOpenAICompatible(config, systemPrompt, userPrompt);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      const authScopeFailure =
        message.includes(' 401') ||
        message.includes(' 403') ||
        message.toLowerCase().includes('insufficient permissions') ||
        message.toLowerCase().includes('missing scopes') ||
        message.toLowerCase().includes('invalid api key');

      if (!authScopeFailure || !execFileSync || !isOpenClawCliAvailable()) {
        throw err;
      }

      console.warn(
        '[AI Router] OpenClaw API auth failed; falling back to OpenClaw CLI.',
      );
    }
  }

  if (!execFileSync || !isOpenClawCliAvailable()) {
    throw new Error('OpenClaw not configured — skipping to next provider');
  }

  const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

  try {
    const result = execFileSync(
      OPENCLAW_PATH,
      [
        'agent',
        '--agent',
        OPENCLAW_AGENT,
        '--local',
        '--timeout',
        '120',
        '--message',
        fullPrompt,
      ],
      {
        timeout: 180_000,
        maxBuffer: 1024 * 1024,
        encoding: 'utf-8',
        env: { ...process.env, HOME: os.homedir() },
      },
    );

    return {
      content: result.trim(),
      tokensUsed: { input: 0, output: 0 },
      costUsd: 0,
      model: config.model,
      provider: 'openclaw',
    };
  } catch (err) {
    throw new Error(
      `OpenClaw error: ${err instanceof Error ? err.message : 'unknown'}`,
    );
  }
}

async function callOpenAICompatible(
  config: AIConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<AIResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
  };

  if (config.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://nepalrepublic.org';
    headers['X-Title'] = 'Nepal Republic Intelligence';
  }

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    }),
    signal: AbortSignal.timeout(180_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown');
    throw new Error(
      `AI ${config.provider}/${config.model} error ${res.status}: ${text}`,
    );
  }

  const data = await res.json();
  const message = data.choices?.[0]?.message;
  let content = message?.content || '';

  // Handle reasoning models that put content in reasoning_content
  if (!content && message?.reasoning_content) {
    const jsonMatch = message.reasoning_content.match(/\{[\s\S]*"isRelevant"[\s\S]*\}/);
    if (jsonMatch) content = jsonMatch[0];
  }

  const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0 };
  const costs = COST_PER_1M_TOKENS[config.model] || COST_PER_1M_TOKENS['local'];
  const costUsd =
    (usage.prompt_tokens * costs.input +
      usage.completion_tokens * costs.output) /
    1_000_000;

  return {
    content,
    tokensUsed: { input: usage.prompt_tokens, output: usage.completion_tokens },
    costUsd,
    model: config.model,
    provider: config.provider,
  };
}

async function callGemini(
  config: AIConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<AIResponse> {
  const url = `${config.baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: {
        maxOutputTokens: config.maxTokens,
        temperature: config.temperature,
      },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown');
    throw new Error(`Gemini error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const usage = data.usageMetadata || {};

  return {
    content,
    tokensUsed: {
      input: usage.promptTokenCount || 0,
      output: usage.candidatesTokenCount || 0,
    },
    costUsd: 0,
    model: config.model,
    provider: 'gemini',
  };
}

async function callGeminiWithRetry(
  config: AIConfig,
  systemPrompt: string,
  userPrompt: string,
  maxRetries = 1,
): Promise<AIResponse> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callGemini(config, systemPrompt, userPrompt);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      // Daily quota exhausted — don't retry, fall back immediately
      if (msg.includes('FreeTier') || msg.includes('per_day') || msg.includes('PerDay')) {
        console.log(`[AI Router] Gemini daily quota exhausted — falling back to next provider`);
        throw err;
      }
      if (msg.includes('429') && attempt < maxRetries) {
        const waitSec = 10 * (attempt + 1); // shorter wait — 10s, not 30s
        console.log(`[AI Router] Gemini rate limited, waiting ${waitSec}s...`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Gemini max retries exceeded');
}

export async function aiComplete(
  task: TaskType,
  systemPrompt: string,
  userPrompt: string,
): Promise<AIResponse> {
  const chain = buildProviderChain(task);
  if (chain.length === 0) {
    if (OPENCLAW_ONLY && task !== 'transcribe') {
      throw new Error(
        'OpenClaw-only mode is enabled, but OpenClaw is not configured. Set OPENCLAW_AUTH_PATH or OPENCLAW_API_KEY/OPENCLAW_ACCESS_TOKEN, or install the OpenClaw CLI.',
      );
    }
    throw new Error('No AI providers configured.');
  }
  const failures: string[] = [];

  for (const config of chain) {
    try {
      if (config.provider === 'openclaw') {
        return await callOpenClaw(config, systemPrompt, userPrompt);
      }
      if (config.provider === 'gemini') {
        return await callGeminiWithRetry(config, systemPrompt, userPrompt);
      }
      return await callOpenAICompatible(config, systemPrompt, userPrompt);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failures.push(`${config.provider}/${config.model}: ${message}`);
      console.warn(`[AI Router] ${config.provider}/${config.model} failed: ${message}`);
    }
  }

  throw new Error(`All AI providers failed: ${failures.join(' | ')}`);
}

export { getModelConfig, type TaskType, type AIResponse, type AIConfig };
