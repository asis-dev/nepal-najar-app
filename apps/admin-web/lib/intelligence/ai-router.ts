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
  return Boolean(getOpenClawAccessToken()) || isOpenClawCliAvailable();
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

  // Priority 1: OpenAI direct (GPT-4.1-nano for classify, GPT-4.1-mini for reasoning)
  // OpenClaw token exists but lacks chat/completions scope — use direct API key instead
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      model: task === 'reason' || task === 'extract' ? 'gpt-4.1-mini' : 'gpt-4.1-nano',
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com/v1',
      maxTokens: task === 'classify' || task === 'summarize' ? 1000 : 4000,
      temperature: task === 'classify' || task === 'summarize' ? 0.1 : 0.2,
    };
  }

  // Priority 3: Gemini 2.5 Flash (free tier)
  if (process.env.GEMINI_API_KEY) {
    return {
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      apiKey: process.env.GEMINI_API_KEY,
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      maxTokens: task === 'classify' || task === 'summarize' ? 1000 : 4000,
      temperature: task === 'classify' || task === 'summarize' ? 0.1 : 0.2,
    };
  }

  // Priority 4: OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    return {
      provider: 'openrouter',
      model: task === 'reason' || task === 'extract'
        ? 'deepseek/deepseek-r1'
        : 'deepseek/deepseek-chat-v3-0324',
      apiKey: process.env.OPENROUTER_API_KEY,
      baseUrl: 'https://openrouter.ai/api/v1',
      maxTokens: task === 'classify' || task === 'summarize' ? 1000 : 4000,
      temperature: task === 'classify' || task === 'summarize' ? 0.1 : 0.2,
    };
  }

  // Priority 5: Local LM Studio
  return getLocalConfig(task);
}

function getLocalConfig(task?: TaskType): AIConfig {
  return {
    provider: 'local',
    model: process.env.AI_MODEL || 'qwen3.5-27b',
    apiKey: process.env.AI_API_KEY || 'lm-studio',
    baseUrl: process.env.AI_BASE_URL || 'http://localhost:1234/v1',
    maxTokens: task === 'classify' || task === 'summarize' ? 2000 : 6000,
    temperature: 0.1,
  };
}

// Cost tracking
const COST_PER_1M_TOKENS: Record<string, { input: number; output: number }> = {
  'gpt-5.3-codex': { input: 2.0, output: 8.0 },
  'deepseek/deepseek-r1': { input: 0.55, output: 2.19 },
  'deepseek/deepseek-chat-v3-0324': { input: 0.27, output: 1.1 },
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
      const message = err instanceof Error ? err.message : String(err);
      const canFallbackToCli = isOpenClawCliAvailable();

      const isRecoverableAuthFailure =
        message.includes('401') ||
        message.toLowerCase().includes('insufficient permissions') ||
        message.toLowerCase().includes('missing scopes');

      if (!canFallbackToCli || !isRecoverableAuthFailure) {
        throw err;
      }

      console.warn(
        '[AI Router] OpenClaw API auth failed, falling back to local CLI.',
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
    headers['HTTP-Referer'] = 'https://nepalnajar.com';
    headers['X-Title'] = 'Nepal Najar Intelligence';
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
  maxRetries = 2,
): Promise<AIResponse> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callGemini(config, systemPrompt, userPrompt);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('429') && attempt < maxRetries) {
        const waitSec = 30 * (attempt + 1);
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
  const config = getModelConfig(task);

  // Try primary model
  try {
    if (config.provider === 'openclaw') {
      return await callOpenClaw(config, systemPrompt, userPrompt);
    }
    if (config.provider === 'gemini') {
      return await callGeminiWithRetry(config, systemPrompt, userPrompt);
    }
    return await callOpenAICompatible(config, systemPrompt, userPrompt);
  } catch (primaryErr) {
    console.warn(`[AI Router] Primary ${config.provider}/${config.model} failed: ${primaryErr instanceof Error ? primaryErr.message : primaryErr}`);
  }

  // Fallback chain: Gemini → Local
  if (config.provider !== 'gemini' && process.env.GEMINI_API_KEY) {
    try {
      const geminiConfig: AIConfig = {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        apiKey: process.env.GEMINI_API_KEY,
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        maxTokens: task === 'classify' || task === 'summarize' ? 1000 : 4000,
        temperature: 0.1,
      };
      return await callGeminiWithRetry(geminiConfig, systemPrompt, userPrompt);
    } catch {
      console.warn('[AI Router] Gemini fallback failed');
    }
  }

  if (config.provider !== 'local') {
    try {
      const localConfig = getLocalConfig(task);
      return await callOpenAICompatible(localConfig, systemPrompt, userPrompt);
    } catch {
      console.warn('[AI Router] Local fallback failed');
    }
  }

  throw new Error('All AI providers failed');
}

export { getModelConfig, type TaskType, type AIResponse, type AIConfig };
