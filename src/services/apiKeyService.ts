/**
 * Service centralisé pour la gestion des clés API LLM
 *
 * Priorité : localStorage (saisie utilisateur) > variable d'environnement
 * Ceci permet à un utilisateur non-développeur de configurer sa clé API
 * directement depuis l'interface des paramètres.
 */

const STORAGE_KEY = 'aria_llm_api_key';

const PLACEHOLDER_VALUES = [
  'your_groq_api_key_here',
  'your_llm_api_key_here',
  'your_api_key_here',
];

function isValidKey(key: string | null | undefined): key is string {
  if (!key || key.length < 10) return false;
  if (PLACEHOLDER_VALUES.includes(key)) return false;
  return true;
}

/**
 * Récupère la clé API LLM.
 * Cherche d'abord dans localStorage (saisie utilisateur),
 * puis dans la variable d'environnement VITE_LLM_API_KEY.
 */
export function getStoredApiKey(): string | null {
  // 1. localStorage (saisie utilisateur dans les paramètres)
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isValidKey(stored)) return stored;
  } catch { /* ignore localStorage errors */ }

  // 2. Variable d'environnement (pour les développeurs)
  const envKey = import.meta.env.VITE_LLM_API_KEY as string | undefined;
  if (isValidKey(envKey)) return envKey;

  return null;
}

/**
 * Sauvegarde une clé API dans localStorage.
 */
export function saveApiKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } catch { /* ignore */ }
}

/**
 * Supprime la clé API de localStorage.
 */
export function clearApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

/**
 * Vérifie si une clé API externe est configurée.
 */
export function hasApiKey(): boolean {
  return getStoredApiKey() !== null;
}

/**
 * Détecte le provider LLM à partir du préfixe de la clé API.
 */
export function detectProviderFromKey(key: string): { name: string; type: string } {
  if (key.startsWith('gsk_')) return { name: 'Groq', type: 'groq' };
  if (key.startsWith('AIzaSy')) return { name: 'Google Gemini', type: 'gemini' };
  if (key.startsWith('sk-ant-')) return { name: 'Anthropic Claude', type: 'anthropic' };
  if (key.startsWith('sk-or-')) return { name: 'OpenRouter', type: 'openrouter' };
  if (key.startsWith('sk-')) return { name: 'OpenAI', type: 'openai' };
  return { name: 'Provider compatible OpenAI', type: 'openai-compat' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// API KEY VALIDATION TEST
// ═══════════════════════════════════════════════════════════════════════════════

export interface ApiKeyTestResult {
  success: boolean;
  provider: string;
  model?: string;
  latencyMs: number;
  error?: string;
}

/**
 * Teste une clé API en envoyant une requête minimale au provider.
 * Utilise max_tokens=1 pour minimiser le coût et la latence.
 */
export async function testApiKey(apiKey: string): Promise<ApiKeyTestResult> {
  const provider = detectProviderFromKey(apiKey);
  const start = performance.now();

  try {
    let result: { ok: boolean; status: number; model: string; errorMsg?: string };

    if (provider.type === 'gemini') {
      result = await testGemini(apiKey);
    } else if (provider.type === 'anthropic') {
      result = await testAnthropic(apiKey);
    } else {
      // OpenAI-compatible (Groq, OpenAI, OpenRouter, etc.)
      result = await testOpenAICompat(apiKey, provider.type);
    }

    const latencyMs = Math.round(performance.now() - start);

    if (result.ok) {
      return {
        success: true,
        provider: provider.name,
        model: result.model,
        latencyMs,
      };
    }
    return {
      success: false,
      provider: provider.name,
      latencyMs,
      error: result.errorMsg || `Erreur HTTP ${result.status}`,
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      provider: provider.name,
      latencyMs,
      error: msg.includes('Failed to fetch')
        ? 'Impossible de contacter le serveur. Vérifiez votre connexion internet.'
        : msg,
    };
  }
}

async function testOpenAICompat(
  apiKey: string,
  providerType: string,
): Promise<{ ok: boolean; status: number; model: string; errorMsg?: string }> {
  const urlMap: Record<string, string> = {
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    openai: 'https://api.openai.com/v1/chat/completions',
    openrouter: 'https://openrouter.ai/api/v1/chat/completions',
    'openai-compat': 'https://api.openai.com/v1/chat/completions',
  };
  const modelMap: Record<string, string> = {
    groq: 'llama-3.1-8b-instant',
    openai: 'gpt-4o-mini',
    openrouter: 'meta-llama/llama-3.1-8b-instruct:free',
    'openai-compat': 'gpt-4o-mini',
  };
  const url = urlMap[providerType] || urlMap['openai-compat'];
  const model = modelMap[providerType] || modelMap['openai-compat'];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 1,
      temperature: 0,
    }),
  });

  if (response.ok) {
    return { ok: true, status: response.status, model };
  }

  const errData = await response.json().catch(() => ({}));
  const errMsg = (errData as { error?: { message?: string } }).error?.message
    || `HTTP ${response.status}`;
  return { ok: false, status: response.status, model, errorMsg: errMsg };
}

async function testGemini(
  apiKey: string,
): Promise<{ ok: boolean; status: number; model: string; errorMsg?: string }> {
  const model = 'gemini-2.0-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Hi' }] }],
      generationConfig: { maxOutputTokens: 1, temperature: 0 },
    }),
  });

  if (response.ok) {
    return { ok: true, status: response.status, model };
  }

  const errData = await response.json().catch(() => ({}));
  const errMsg = (errData as { error?: { message?: string } }).error?.message
    || `HTTP ${response.status}`;
  return { ok: false, status: response.status, model, errorMsg: errMsg };
}

async function testAnthropic(
  apiKey: string,
): Promise<{ ok: boolean; status: number; model: string; errorMsg?: string }> {
  const model = 'claude-3-5-haiku-20241022';
  const url = 'https://api.anthropic.com/v1/messages';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 1,
    }),
  });

  if (response.ok) {
    return { ok: true, status: response.status, model };
  }

  const errData = await response.json().catch(() => ({}));
  const errMsg = (errData as { error?: { message?: string } }).error?.message
    || `HTTP ${response.status}`;
  return { ok: false, status: response.status, model, errorMsg: errMsg };
}
