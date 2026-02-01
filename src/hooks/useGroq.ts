import { useState, useCallback } from 'react';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

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

  const {
    model = 'llama-3.3-70b-versatile',
    temperature = 0.7,
    maxTokens = 2048,
  } = options;

  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  console.log('🔵 [useGroq] Hook initialisé:', {
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length,
    apiKeyPrefix: apiKey?.substring(0, 10),
    isDefault: apiKey === 'your_groq_api_key_here'
  });

  // Vérifier si la clé API est configurée
  const isApiKeyValid = apiKey && apiKey !== 'your_groq_api_key_here' && apiKey.length > 10;

  console.log('🔵 [useGroq] Validation:', { isApiKeyValid });

  // Streaming completion - LE PLUS IMPORTANT POUR L'EFFET WOW
  const streamCompletion = useCallback(
    async (
      messages: GroqMessage[],
      onChunk: (chunk: string) => void,
      onComplete?: () => void
    ) => {
      setIsLoading(true);
      setError(null);

      // Vérifier la clé API avant d'appeler l'API
      if (!isApiKeyValid) {
        const errMsg = 'Clé API Groq non configurée.';
        setError(errMsg);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
            stream: true,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `Groq API error: ${response.status}`);
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
            if (trimmed.startsWith('data: ')) {
              const data = trimmed.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  onChunk(content);
                }
              } catch (e) {
                // Ignore parsing errors for incomplete chunks
              }
            }
          }
        }

        onComplete?.();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('Groq API Error:', errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [model, temperature, maxTokens, apiKey, isApiKeyValid]
  );

  // Non-streaming completion (pour régénération de section)
  const complete = useCallback(
    async (messages: GroqMessage[]): Promise<string | null> => {
      console.log('🔵 [useGroq.complete] Début appel');
      console.log('🔵 [useGroq.complete] Messages:', {
        count: messages.length,
        roles: messages.map(m => m.role),
        contentLengths: messages.map(m => m.content.length)
      });

      setIsLoading(true);
      setError(null);

      // Vérifier la clé API avant d'appeler l'API
      if (!isApiKeyValid) {
        const errMsg = 'Clé API Groq non configurée.';
        console.error('🔴 [useGroq.complete] Clé API invalide!', {
          hasApiKey: !!apiKey,
          apiKeyLength: apiKey?.length
        });
        setError(errMsg);
        setIsLoading(false);
        return null;
      }

      console.log('🔵 [useGroq.complete] Clé API validée, envoi fetch...');

      try {
        const requestBody = {
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false,
        };

        console.log('🔵 [useGroq.complete] Requête:', {
          url: GROQ_API_URL,
          model,
          bodySize: JSON.stringify(requestBody).length
        });

        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });

        console.log('🔵 [useGroq.complete] Réponse fetch:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('🔴 [useGroq.complete] Erreur API:', errorData);
          throw new Error(errorData.error?.message || `Groq API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || null;

        console.log('✅ [useGroq.complete] Succès:', {
          hasContent: !!content,
          contentLength: content?.length,
          model: data.model,
          tokens: data.usage?.total_tokens
        });

        return content;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('🔴 [useGroq.complete] Exception:', {
          error: err,
          message: errorMessage,
          name: err instanceof Error ? err.name : 'unknown'
        });
        setError(errorMessage);
        console.error('Groq API Error:', errorMessage);
        return null;
      } finally {
        setIsLoading(false);
        console.log('🔵 [useGroq.complete] Fin appel');
      }
    },
    [model, temperature, maxTokens, apiKey, isApiKeyValid]
  );

  return { streamCompletion, complete, isLoading, error };
}
