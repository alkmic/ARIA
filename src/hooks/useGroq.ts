import { useState, useCallback } from 'react';
import { webLlmService } from '../services/webLlmService';
import { getStoredApiKey, getStoredLLMConfig, resolveProvider, isReasoningModel } from '../services/apiKeyService';

// ═══════════════════════════════════════════════════════════════════════════════
// Multi-provider LLM Hook
// Supports explicit config from Settings + auto-detection from key prefix (legacy)
// Fallback chain: API externe → Ollama local → WebLLM navigateur
// ═══════════════════════════════════════════════════════════════════════════════

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface UseGroqOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

type ProviderType = 'openai-compat' | 'gemini' | 'anthropic';

interface ProviderInfo {
  type: ProviderType;
  name: string;
  url: string;
  defaultModel: string;
  headers: Record<string, string>;
}

// ── Ollama local config ─────────────────────────────────────────────────────
const OLLAMA_DEFAULT_URL = 'http://localhost:11434';
const OLLAMA_DEFAULT_MODEL = 'qwen3:8b';

function getOllamaBaseUrl(): string {
  return (import.meta.env.VITE_OLLAMA_BASE_URL as string) || OLLAMA_DEFAULT_URL;
}

function getOllamaModel(): string {
  return (import.meta.env.VITE_OLLAMA_MODEL as string) || OLLAMA_DEFAULT_MODEL;
}

function getOllamaProvider(): ProviderInfo {
  return {
    type: 'openai-compat',
    name: `Ollama (${getOllamaModel()})`,
    url: `${getOllamaBaseUrl()}/v1/chat/completions`,
    defaultModel: getOllamaModel(),
    headers: { 'Content-Type': 'application/json' },
  };
}

function getProviderConfig(apiKey: string): ProviderInfo {
  // 1. Explicit config from Settings UI
  const config = getStoredLLMConfig();
  if (config) {
    const resolved = resolveProvider(config);
    const type: ProviderType =
      resolved.apiFormat === 'gemini' ? 'gemini' :
      resolved.apiFormat === 'anthropic' ? 'anthropic' : 'openai-compat';
    return {
      type,
      name: resolved.providerName,
      url: type === 'gemini' ? resolved.baseUrl : resolved.url,
      defaultModel: resolved.model,
      headers: resolved.headers,
    };
  }

  // 2. Legacy: auto-detect from key prefix
  const customUrl = import.meta.env.VITE_LLM_BASE_URL;
  if (customUrl && !customUrl.includes('your_') && customUrl.length >= 10) {
    const baseUrl = (customUrl as string).replace(/\/+$/, '');
    return {
      type: 'openai-compat', name: 'Custom', url: `${baseUrl}/chat/completions`,
      defaultModel: 'gpt-4o-mini',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    };
  }
  if (apiKey.startsWith('gsk_')) return {
    type: 'openai-compat', name: 'Groq', url: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
  };
  if (apiKey.startsWith('AIzaSy')) return {
    type: 'gemini', name: 'Gemini', url: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-1.5-flash',
    headers: { 'Content-Type': 'application/json' },
  };
  if (apiKey.startsWith('sk-ant-')) return {
    type: 'anthropic', name: 'Anthropic', url: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-sonnet-4-5-20250929',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
  };
  if (apiKey.startsWith('sk-or-')) return {
    type: 'openai-compat', name: 'OpenRouter', url: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
  };
  return {
    type: 'openai-compat', name: 'OpenAI',
    url: import.meta.env.DEV
      ? '/llm-proxy/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
  };
}

// ── Gemini helpers ───────────────────────────────────────────────────────────

function buildGeminiRequest(apiKey: string, model: string, messages: LLMMessage[], temperature: number, maxTokens: number, baseUrl?: string) {
  const base = baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
  const url = `${base}/models/${model}:generateContent?key=${apiKey}`;
  const systemParts = messages.filter(m => m.role === 'system').map(m => ({ text: m.content }));
  const contents = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  // Merge consecutive same-role messages (Gemini requirement)
  const merged: typeof contents = [];
  for (const msg of contents) {
    if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
      merged[merged.length - 1].parts.push(...msg.parts);
    } else { merged.push(msg); }
  }
  const body: Record<string, unknown> = {
    contents: merged,
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  };
  if (systemParts.length > 0) body.systemInstruction = { parts: systemParts };
  return { url, body };
}

function parseGeminiResponse(data: Record<string, unknown>): string | null {
  const candidates = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] }).candidates;
  return candidates?.[0]?.content?.parts?.[0]?.text || null;
}

// ── Anthropic helpers ────────────────────────────────────────────────────────

function buildAnthropicRequest(messages: LLMMessage[], model: string, temperature: number, maxTokens: number) {
  const systemContent = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  const chatMessages = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role as string, content: m.content }));
  // Merge consecutive same-role messages, ensure starts with user
  const merged: typeof chatMessages = [];
  for (const msg of chatMessages) {
    if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
      merged[merged.length - 1].content += '\n\n' + msg.content;
    } else { merged.push({ ...msg }); }
  }
  if (merged.length === 0 || merged[0].role !== 'user') merged.unshift({ role: 'user', content: '...' });
  const body: Record<string, unknown> = { model, max_tokens: maxTokens, messages: merged, temperature };
  if (systemContent) body.system = systemContent;
  return body;
}

function parseAnthropicResponse(data: Record<string, unknown>): string | null {
  const content = (data as { content?: { type: string; text?: string }[] }).content;
  return content?.find(c => c.type === 'text')?.text || null;
}

// ── Simulate streaming for non-streaming providers ──────────────────────────

async function simulateStream(text: string, onChunk: (chunk: string) => void) {
  const words = text.split(' ');
  for (const word of words) {
    onChunk(word + ' ');
    await new Promise(r => setTimeout(r, 12));
  }
}

// ── OpenAI-compatible streaming ─────────────────────────────────────────────

async function streamOpenAICompat(
  url: string,
  headers: Record<string, string>,
  model: string,
  messages: LLMMessage[],
  temperature: number,
  maxTokens: number,
  onChunk: (chunk: string) => void,
): Promise<void> {
  const reasoning = isReasoningModel(model);
  const body: Record<string, unknown> = { model, messages, stream: true };
  if (reasoning) {
    body.max_completion_tokens = maxTokens;
  } else {
    body.temperature = temperature;
    body.max_tokens = maxTokens;
  }
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error: ${response.status}`);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No reader available');
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        const d = trimmed.slice(6);
        if (d === '[DONE]') continue;
        try {
          const parsed = JSON.parse(d);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onChunk(content);
        } catch { /* incomplete chunk */ }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useGroq(options: UseGroqOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { temperature = 0.7, maxTokens = 2048 } = options;

  // Streaming completion — with automatic Ollama fallback
  const streamCompletion = useCallback(
    async (messages: LLMMessage[], onChunk: (chunk: string) => void, onComplete?: () => void) => {
      setIsLoading(true);
      setError(null);

      // Re-read key at call time (may have been updated in Settings)
      const currentKey = getStoredApiKey();

      try {
        if (currentKey) {
          // ── External provider ──
          const provider = getProviderConfig(currentKey);
          const model = options.model || provider.defaultModel;

          try {
            if (provider.type === 'gemini') {
              const { url, body } = buildGeminiRequest(currentKey, model, messages, temperature, maxTokens, provider.url || undefined);
              const response = await fetch(url, { method: 'POST', headers: provider.headers, body: JSON.stringify(body) });
              if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error?.message || `Gemini error: ${response.status}`);
              }
              const data = await response.json();
              const text = parseGeminiResponse(data) || '';
              await simulateStream(text, onChunk);
            } else if (provider.type === 'anthropic') {
              const body = buildAnthropicRequest(messages, model, temperature, maxTokens);
              const response = await fetch(provider.url, { method: 'POST', headers: provider.headers, body: JSON.stringify(body) });
              if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error?.message || `Anthropic error: ${response.status}`);
              }
              const data = await response.json();
              const text = parseAnthropicResponse(data) || '';
              await simulateStream(text, onChunk);
            } else {
              await streamOpenAICompat(provider.url, provider.headers, model, messages, temperature, maxTokens, onChunk);
            }
            onComplete?.();
            return;
          } catch (externalErr) {
            // External API failed — fallback to Ollama
            console.warn(`[useGroq] ${provider.name} failed, falling back to Ollama local:`, externalErr);
          }
        }

        // ── Ollama local fallback (or primary if no API key) ──
        try {
          const ollama = getOllamaProvider();
          await streamOpenAICompat(ollama.url, ollama.headers, ollama.defaultModel, messages, temperature, maxTokens, onChunk);
          onComplete?.();
          return;
        } catch (ollamaErr) {
          console.warn('[useGroq] Ollama failed, trying WebLLM browser...', ollamaErr);
        }

        // ── WebLLM browser fallback (dernier recours) ──
        if (webLlmService.isWebGPUSupported()) {
          try {
            await webLlmService.ensureLoaded();
            await webLlmService.streamComplete(messages, onChunk, { temperature, maxTokens });
            onComplete?.();
            return;
          } catch (webErr) {
            console.warn('[useGroq] WebLLM failed:', webErr);
          }
        }

        // Tout a échoué
        setError('LLM indisponible. Vérifiez que WebGPU est supporté par votre navigateur (Chrome 113+).');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
        console.error('LLM Error:', msg);
      } finally {
        setIsLoading(false);
      }
    },
    [temperature, maxTokens, options.model]
  );

  // Non-streaming completion — with automatic Ollama fallback
  const complete = useCallback(
    async (messages: LLMMessage[]): Promise<string | null> => {
      setIsLoading(true);
      setError(null);

      // Re-read key at call time (may have been updated in Settings)
      const currentKey = getStoredApiKey();

      try {
        if (currentKey) {
          // ── External provider ──
          const provider = getProviderConfig(currentKey);
          const model = options.model || provider.defaultModel;

          try {
            if (provider.type === 'gemini') {
              const { url, body } = buildGeminiRequest(currentKey, model, messages, temperature, maxTokens, provider.url || undefined);
              const response = await fetch(url, { method: 'POST', headers: provider.headers, body: JSON.stringify(body) });
              if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error?.message || `Gemini error: ${response.status}`);
              }
              return parseGeminiResponse(await response.json());
            }
            if (provider.type === 'anthropic') {
              const body = buildAnthropicRequest(messages, model, temperature, maxTokens);
              const response = await fetch(provider.url, { method: 'POST', headers: provider.headers, body: JSON.stringify(body) });
              if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error?.message || `Anthropic error: ${response.status}`);
              }
              return parseAnthropicResponse(await response.json());
            }
            // OpenAI-compatible
            const reasoning = isReasoningModel(model);
            const reqBody: Record<string, unknown> = { model, messages, stream: false };
            if (reasoning) {
              reqBody.max_completion_tokens = maxTokens;
            } else {
              reqBody.temperature = temperature;
              reqBody.max_tokens = maxTokens;
            }
            const response = await fetch(provider.url, {
              method: 'POST',
              headers: provider.headers,
              body: JSON.stringify(reqBody),
            });
            if (!response.ok) {
              const err = await response.json().catch(() => ({}));
              throw new Error(err.error?.message || `API error: ${response.status}`);
            }
            const data = await response.json();
            return data.choices?.[0]?.message?.content || null;
          } catch (externalErr) {
            // External API failed — fallback to Ollama
            console.warn(`[useGroq] External API failed, falling back to Ollama local:`, externalErr);
          }
        }

        // ── Ollama local fallback ──
        try {
          const ollama = getOllamaProvider();
          const response = await fetch(ollama.url, {
            method: 'POST',
            headers: ollama.headers,
            body: JSON.stringify({
              model: ollama.defaultModel, messages, temperature, max_tokens: maxTokens, stream: false,
            }),
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `Ollama error: ${response.status}`);
          }
          const data = await response.json();
          return data.choices?.[0]?.message?.content || null;
        } catch (ollamaErr) {
          console.warn('[useGroq] Ollama failed, trying WebLLM browser...', ollamaErr);
        }

        // ── WebLLM browser fallback (dernier recours) ──
        if (webLlmService.isWebGPUSupported()) {
          try {
            await webLlmService.ensureLoaded();
            return await webLlmService.complete(messages, { temperature, maxTokens });
          } catch (webErr) {
            console.warn('[useGroq] WebLLM failed:', webErr);
          }
        }

        // Tout a échoué
        setError('LLM indisponible. Vérifiez que WebGPU est supporté par votre navigateur (Chrome 113+).');
        return null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [temperature, maxTokens, options.model]
  );

  return { streamCompletion, complete, isLoading, error };
}
