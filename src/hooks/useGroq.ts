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

  // Debug: afficher l'état de la clé API au chargement du hook
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    console.warn('⚠️ useGroq Hook Init: VITE_GROQ_API_KEY not configured!');
    console.warn('   All Groq API calls will fail.');
    console.warn('   Set VITE_GROQ_API_KEY in Vercel Environment Variables.');
  } else {
    console.log('✅ useGroq Hook Init: API Key loaded:', apiKey.substring(0, 10) + '...');
  }

  // Vérifier si la clé API est configurée
  const isApiKeyValid = apiKey && apiKey !== 'your_groq_api_key_here' && apiKey.length > 10;

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
        const errMsg = 'Clé API Groq non configurée. Consultez CONFIGURATION_IA.md pour configurer votre clé API Groq.';
        console.error('❌ useGroq.streamCompletion:', errMsg);
        console.error('   API Key présente:', !!apiKey);
        console.error('   API Key length:', apiKey?.length);
        console.error('   import.meta.env.VITE_GROQ_API_KEY:', import.meta.env.VITE_GROQ_API_KEY);
        setError(errMsg);
        setIsLoading(false);
        return;
      }

      try {
        console.log('🚀 Groq API Stream Call:', {
          url: GROQ_API_URL,
          model,
          messagesCount: messages.length,
          apiKeyPrefix: apiKey?.substring(0, 10) + '...'
        });

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

        console.log('📥 Groq Stream Response:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Groq Stream Error Response:', errorData);
          throw new Error(errorData.error?.message || `Groq API error: ${response.status} ${response.statusText}`);
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

        console.log('✅ Groq Stream Complete');
        onComplete?.();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ useGroq.streamCompletion ERROR:', {
          error: err,
          message: errorMessage,
          stack: err instanceof Error ? err.stack : undefined
        });
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [model, temperature, maxTokens, apiKey, isApiKeyValid]
  );

  // Non-streaming completion (pour régénération de section)
  const complete = useCallback(
    async (messages: GroqMessage[]): Promise<string | null> => {
      setIsLoading(true);
      setError(null);

      // Vérifier la clé API avant d'appeler l'API
      if (!isApiKeyValid) {
        const errMsg = 'Clé API Groq non configurée. Consultez CONFIGURATION_IA.md pour configurer votre clé API Groq.';
        console.error('❌ useGroq.complete:', errMsg);
        console.error('   API Key présente:', !!apiKey);
        console.error('   API Key length:', apiKey?.length);
        setError(errMsg);
        setIsLoading(false);
        return null;
      }

      try {
        console.log('🚀 Groq API Call:', {
          url: GROQ_API_URL,
          model,
          messagesCount: messages.length,
          firstMessageRole: messages[0]?.role,
          apiKeyPrefix: apiKey?.substring(0, 10) + '...'
        });

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
            stream: false,
          }),
        });

        console.log('📥 Groq API Response:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Groq API Error Response:', errorData);
          throw new Error(errorData.error?.message || `Groq API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || null;

        console.log('✅ Groq API Success:', {
          hasContent: !!content,
          contentLength: content?.length,
          contentPreview: content?.substring(0, 100) + '...'
        });

        return content;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ useGroq.complete ERROR:', {
          error: err,
          message: errorMessage,
          stack: err instanceof Error ? err.stack : undefined
        });
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [model, temperature, maxTokens, apiKey, isApiKeyValid]
  );

  return { streamCompletion, complete, isLoading, error };
}
