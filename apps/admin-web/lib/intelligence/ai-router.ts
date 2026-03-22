/**
 * AI Model Router — picks the right model for each task
 *
 * Strategy (priority order):
 * 1. OpenClaw/GPT 5.3 via OpenAI API (OAuth token, best quality)
 * 2. DeepSeek R1 via OpenRouter (cheap + smart)
 * 3. Gemini Flash (free tier)
 * 4. Local Qwen via LM Studio (offline fallback)
 *
 * Transcription: Groq Whisper (fast + cheap)
 */

interface AIConfig {
  provider: 'openai-codex' | 'openrouter' | 'gemini' | 'groq' | 'local' | 'kimi';
  model: string;
  apiKey: string;
  baseUrl: string;
  maxTokens: number;
  temperature: number;
}

type TaskType = 'classify' | 'reason' | 'summarize' | 'transcribe' | 'extract';

// Environment variables:
// OPENCLAW_AUTH_PATH — path to OpenClaw auth profiles JSON (defaults to ~/.openclaw/agents/main/agent/auth-profiles.json)
// OPENROUTER_API_KEY — for DeepSeek, Kimi K2
// GEMINI_API_KEY — for Gemini Flash (free tier)
// GROQ_API_KEY — for Whisper transcription
// AI_BASE_URL + AI_API_KEY + AI_MODEL — existing local LM Studio

/**
 * Read the OpenClaw OAuth bearer token dynamically.
 * The token may be refreshed at any time, so we read from disk on every call.
 */
function getOpenClawToken(): string | null {
  try {
    const fs = require('fs');
    const authPath = process.env.OPENCLAW_AUTH_PATH ||
      require('os').homedir() + '/.openclaw/agents/main/agent/auth-profiles.json';
    const data = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
    return data?.profiles?.['openai-codex:default']?.access || null;
  } catch {
    return null;
  }
}

function getModelConfig(task: TaskType): AIConfig {
  // For transcription: always Groq Whisper (specialized)
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

  // For all other tasks (classify, reason, extract, summarize):
  // Priority 1: OpenClaw/GPT 5.3 (best quality)
  const openClawToken = getOpenClawToken();
  if (openClawToken) {
    return {
      provider: 'openai-codex',
      model: 'gpt-5.3-codex',
      apiKey: openClawToken,
      baseUrl: 'https://api.openai.com/v1',
      maxTokens: task === 'classify' || task === 'summarize' ? 1000 : 4000,
      temperature: task === 'classify' || task === 'summarize' ? 0.1 : 0.2,
    };
  }

  // Priority 2: OpenRouter (DeepSeek R1 for reasoning, or general)
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

  // Priority 3: Gemini Flash (free tier)
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

  // Priority 4: Local LM Studio
  return getLocalConfig();
}

function getLocalConfig(): AIConfig {
  return {
    provider: 'local',
    model: process.env.AI_MODEL || 'qwen3.5-27b',
    apiKey: process.env.AI_API_KEY || 'lm-studio',
    baseUrl: process.env.AI_BASE_URL || 'http://localhost:1234/v1',
    maxTokens: 4000,
    temperature: 0.2,
  };
}

// Cost tracking
const COST_PER_1M_TOKENS: Record<string, { input: number; output: number }> = {
  'gpt-5.3-codex': { input: 2.0, output: 8.0 },
  'deepseek/deepseek-r1': { input: 0.55, output: 2.19 },
  'deepseek/deepseek-chat-v3-0324': { input: 0.27, output: 1.1 },
  'google/gemini-2.0-flash-001': { input: 0.1, output: 0.4 },
  'moonshot/kimi-k2': { input: 0.6, output: 2.4 },
  'gemini-2.0-flash': { input: 0, output: 0 }, // free tier
  'gemini-2.5-flash': { input: 0, output: 0 }, // free tier
  local: { input: 0, output: 0 },
};

interface AIResponse {
  content: string;
  tokensUsed: { input: number; output: number };
  costUsd: number;
  model: string;
  provider: string;
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

  // OpenClaw uses OAuth bearer token (not API key format)
  if (config.provider === 'openai-codex') {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
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
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown');
    throw new Error(
      `AI ${config.provider}/${config.model} error ${res.status}: ${text}`,
    );
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0 };
  const costs =
    COST_PER_1M_TOKENS[config.model] || COST_PER_1M_TOKENS['local'];
  const costUsd =
    (usage.prompt_tokens * costs.input +
      usage.completion_tokens * costs.output) /
    1_000_000;

  return {
    content,
    tokensUsed: {
      input: usage.prompt_tokens,
      output: usage.completion_tokens,
    },
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
  const content =
    data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const usage = data.usageMetadata || {};

  return {
    content,
    tokensUsed: {
      input: usage.promptTokenCount || 0,
      output: usage.candidatesTokenCount || 0,
    },
    costUsd: 0, // free tier
    model: config.model,
    provider: 'gemini',
  };
}

export async function aiComplete(
  task: TaskType,
  systemPrompt: string,
  userPrompt: string,
): Promise<AIResponse> {
  const config = getModelConfig(task);

  if (config.provider === 'gemini') {
    return callGemini(config, systemPrompt, userPrompt);
  }

  // OpenClaw, OpenRouter, Groq, Local, Kimi all use OpenAI-compatible API
  return callOpenAICompatible(config, systemPrompt, userPrompt);
}

export { getModelConfig, type TaskType, type AIResponse, type AIConfig };
