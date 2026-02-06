import { useState, useCallback, useMemo } from 'react';

// --- Multi-provider LLM support ---
// Supports: Groq (default), OpenAI, Anthropic (via OpenAI-compatible proxy)
// Auto-detects provider from API key format or explicit VITE_LLM_PROVIDER env var

type LLMProvider = 'groq' | 'openai' | 'anthropic';

interface ProviderConfig {
  url: string;
  defaultModel: string;
  name: string;
  authHeader: (key: string) => Record<string, string>;
}

const PROVIDERS: Record<LLMProvider, ProviderConfig> = {
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
    name: 'Groq',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}` }),
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    name: 'OpenAI',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}` }),
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-sonnet-4-20250514',
    name: 'Anthropic',
    authHeader: (key) => ({
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    }),
  },
};

function detectProvider(apiKey: string): LLMProvider {
  const explicit = import.meta.env.VITE_LLM_PROVIDER?.toLowerCase();
  if (explicit && explicit in PROVIDERS) return explicit as LLMProvider;

  if (apiKey.startsWith('gsk_')) return 'groq';
  if (apiKey.startsWith('sk-ant-')) return 'anthropic';
  if (apiKey.startsWith('sk-')) return 'openai';

  return 'groq'; // default
}

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface UseGroqOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export function useGroq(options: UseGroqOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiKey = import.meta.env.VITE_GROQ_API_KEY
    || import.meta.env.VITE_LLM_API_KEY
    || '';

  const provider = useMemo(() => detectProvider(apiKey), [apiKey]);
  const config = PROVIDERS[provider];

  const {
    model = config.defaultModel,
    temperature = 0.7,
    maxTokens = 2048,
  } = options;

  const isApiKeyValid = apiKey
    && apiKey !== 'your_groq_api_key_here'
    && apiKey !== 'your_api_key_here'
    && apiKey.length > 10;

  // Helper to format request body for Anthropic vs OpenAI-compatible
  const buildRequestBody = useCallback((messages: GroqMessage[], stream: boolean) => {
    if (provider === 'anthropic') {
      // Extract system message
      const systemMsg = messages.find(m => m.role === 'system');
      const nonSystemMsgs = messages.filter(m => m.role !== 'system');

      return JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        stream,
        ...(systemMsg ? { system: systemMsg.content } : {}),
        messages: nonSystemMsgs.map(m => ({
          role: m.role,
          content: m.content,
        })),
      });
    }

    return JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream,
    });
  }, [provider, model, temperature, maxTokens]);

  // Streaming completion
  const streamCompletion = useCallback(
    async (
      messages: GroqMessage[],
      onChunk: (chunk: string) => void,
      onComplete?: () => void
    ) => {
      setIsLoading(true);
      setError(null);

      if (!isApiKeyValid) {
        setError(`Cle API non configuree. Ajoutez VITE_GROQ_API_KEY (ou VITE_LLM_API_KEY) dans votre fichier .env`);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(config.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...config.authHeader(apiKey),
          },
          body: buildRequestBody(messages, true),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errMsg = errorData.error?.message || errorData.message || `${config.name} API error: ${response.status}`;
          throw new Error(errMsg);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error('No reader available');

        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;

            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);

              // Handle both OpenAI-compatible and Anthropic streaming formats
              let content: string | undefined;
              if (provider === 'anthropic') {
                if (parsed.type === 'content_block_delta') {
                  content = parsed.delta?.text;
                }
              } else {
                content = parsed.choices?.[0]?.delta?.content;
              }

              if (content) {
                onChunk(content);
              }
            } catch {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }

        onComplete?.();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error(`${config.name} API Error:`, errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [model, temperature, maxTokens, apiKey, isApiKeyValid, config, provider, buildRequestBody]
  );

  // Non-streaming completion
  const complete = useCallback(
    async (messages: GroqMessage[]): Promise<string | null> => {
      setIsLoading(true);
      setError(null);

      if (!isApiKeyValid) {
        setError(`Cle API non configuree. Ajoutez VITE_GROQ_API_KEY (ou VITE_LLM_API_KEY) dans votre fichier .env`);
        setIsLoading(false);
        return null;
      }

      try {
        const response = await fetch(config.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...config.authHeader(apiKey),
          },
          body: buildRequestBody(messages, false),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errMsg = errorData.error?.message || errorData.message || `${config.name} API error: ${response.status}`;
          throw new Error(errMsg);
        }

        const data = await response.json();

        // Handle both OpenAI-compatible and Anthropic response formats
        if (provider === 'anthropic') {
          return data.content?.[0]?.text || null;
        }
        return data.choices?.[0]?.message?.content || null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [model, temperature, maxTokens, apiKey, isApiKeyValid, config, provider, buildRequestBody]
  );

  return {
    streamCompletion,
    complete,
    isLoading,
    error,
    provider: config.name,
    isConfigured: isApiKeyValid,
  };
}
