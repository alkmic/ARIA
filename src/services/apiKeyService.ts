/**
 * Service centralisé pour la configuration LLM
 *
 * Stocke la configuration complète : provider, clé API, modèle, URL personnalisée.
 * Compatible avec n'importe quel service LLM (OpenAI, Groq, Anthropic, etc.).
 *
 * Priorité : localStorage (saisie UI) > variable d'environnement VITE_LLM_API_KEY
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type LLMProviderType =
  | 'groq' | 'openai' | 'gemini' | 'anthropic' | 'openrouter'
  | 'mistral' | 'azure' | 'together' | 'deepseek' | 'custom';

export type ApiFormat = 'openai-compat' | 'gemini' | 'anthropic';

export interface LLMConfig {
  provider: LLMProviderType;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface ProviderDefinition {
  id: LLMProviderType;
  name: string;
  description: string;
  apiFormat: ApiFormat;
  defaultBaseUrl: string;
  defaultModel: string;
  models: { id: string; name: string }[];
  apiKeyPlaceholder: string;
  needsBaseUrl: boolean;
  docUrl: string;
}

export interface ResolvedProvider {
  apiFormat: ApiFormat;
  url: string;
  headers: Record<string, string>;
  model: string;
  providerName: string;
  providerType: LLMProviderType;
  baseUrl: string;
}

export interface ApiKeyTestResult {
  success: boolean;
  provider: string;
  model?: string;
  latencyMs: number;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER CATALOG
// ═══════════════════════════════════════════════════════════════════════════════

export const LLM_PROVIDERS: ProviderDefinition[] = [
  {
    id: 'groq',
    name: 'Groq',
    description: 'Inférence ultra-rapide, gratuit (tier limité)',
    apiFormat: 'openai-compat',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant (rapide)' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B IT' },
    ],
    apiKeyPlaceholder: 'gsk_...',
    needsBaseUrl: false,
    docUrl: 'https://console.groq.com',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4o-mini, o3',
    apiFormat: 'openai-compat',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (économique)' },
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'o3-mini', name: 'o3 Mini (raisonnement)' },
    ],
    apiKeyPlaceholder: 'sk-...',
    needsBaseUrl: false,
    docUrl: 'https://platform.openai.com',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Gemini 2.0 Flash, 1.5 Pro',
    apiFormat: 'gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash-lite',
    models: [
      { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite (rapide)' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    ],
    apiKeyPlaceholder: 'AIzaSy...',
    needsBaseUrl: false,
    docUrl: 'https://aistudio.google.com',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude Sonnet, Claude Haiku',
    apiFormat: 'anthropic',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4-5-20250929',
    models: [
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5 (rapide)' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    ],
    apiKeyPlaceholder: 'sk-ant-...',
    needsBaseUrl: false,
    docUrl: 'https://console.anthropic.com',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Passerelle multi-providers, modèles gratuits',
    apiFormat: 'openai-compat',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct',
    models: [
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
      { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (gratuit)' },
      { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (gratuit)' },
      { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B' },
    ],
    apiKeyPlaceholder: 'sk-or-...',
    needsBaseUrl: false,
    docUrl: 'https://openrouter.ai',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    description: 'Modèles européens, performant en français',
    apiFormat: 'openai-compat',
    defaultBaseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-small-latest',
    models: [
      { id: 'mistral-small-latest', name: 'Mistral Small (économique)' },
      { id: 'mistral-large-latest', name: 'Mistral Large' },
      { id: 'open-mistral-7b', name: 'Mistral 7B (open)' },
      { id: 'codestral-latest', name: 'Codestral (code)' },
    ],
    apiKeyPlaceholder: 'Votre clé Mistral',
    needsBaseUrl: false,
    docUrl: 'https://console.mistral.ai',
  },
  {
    id: 'azure',
    name: 'Azure OpenAI',
    description: 'OpenAI via Azure (endpoint entreprise)',
    apiFormat: 'openai-compat',
    defaultBaseUrl: '',
    defaultModel: 'gpt-4o-mini',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4', name: 'GPT-4' },
    ],
    apiKeyPlaceholder: 'Votre clé Azure',
    needsBaseUrl: true,
    docUrl: 'https://portal.azure.com',
  },
  {
    id: 'together',
    name: 'Together AI',
    description: 'Modèles open-source hébergés',
    apiFormat: 'openai-compat',
    defaultBaseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    models: [
      { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', name: 'Llama 3.1 70B Turbo' },
      { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', name: 'Llama 3.1 8B Turbo' },
      { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral 8x7B' },
    ],
    apiKeyPlaceholder: 'Votre clé Together',
    needsBaseUrl: false,
    docUrl: 'https://api.together.xyz',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'Raisonnement avancé (R1)',
    apiFormat: 'openai-compat',
    defaultBaseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat (V3)' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)' },
    ],
    apiKeyPlaceholder: 'sk-...',
    needsBaseUrl: false,
    docUrl: 'https://platform.deepseek.com',
  },
  {
    id: 'custom',
    name: 'Personnalisé',
    description: 'N\'importe quel endpoint OpenAI-compatible',
    apiFormat: 'openai-compat',
    defaultBaseUrl: '',
    defaultModel: '',
    models: [],
    apiKeyPlaceholder: 'Votre clé API',
    needsBaseUrl: true,
    docUrl: '',
  },
];

export function getProviderDef(id: LLMProviderType): ProviderDefinition | undefined {
  return LLM_PROVIDERS.find(p => p.id === id);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG STORAGE
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG_KEY = 'aria_llm_config';
const LEGACY_KEY = 'aria_llm_api_key';

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

/** Sauvegarde la configuration LLM complète. */
export function saveLLMConfig(config: LLMConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    // Aussi en clé legacy pour backward-compat
    localStorage.setItem(LEGACY_KEY, config.apiKey);
  } catch { /* ignore */ }
}

/** Récupère la configuration LLM complète, ou null. */
export function getStoredLLMConfig(): LLMConfig | null {
  // 1. Nouveau format (config complète)
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const config = JSON.parse(raw) as LLMConfig;
      if (config.apiKey && config.provider && config.model) {
        return config;
      }
    }
  } catch { /* ignore */ }

  // 2. Migration depuis l'ancien format (clé seule)
  const legacyKey = getLegacyApiKey();
  if (legacyKey) {
    const detected = detectProviderFromKey(legacyKey);
    const providerDef = LLM_PROVIDERS.find(p => p.id === detected.type);
    return {
      provider: detected.type as LLMProviderType,
      apiKey: legacyKey,
      model: providerDef?.defaultModel || 'gpt-4o-mini',
    };
  }

  return null;
}

/** Efface toute la config LLM. */
export function clearLLMConfig(): void {
  try {
    localStorage.removeItem(CONFIG_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch { /* ignore */ }
}

function getLegacyApiKey(): string | null {
  try {
    const stored = localStorage.getItem(LEGACY_KEY);
    if (isValidKey(stored)) return stored;
  } catch { /* ignore */ }
  return null;
}

// ── Backward-compatible API (utilisé par les engines) ──────────────────────

/** Récupère la clé API (depuis config ou env var). */
export function getStoredApiKey(): string | null {
  const config = getStoredLLMConfig();
  if (config && isValidKey(config.apiKey)) return config.apiKey;

  const envKey = import.meta.env.VITE_LLM_API_KEY as string | undefined;
  if (isValidKey(envKey)) return envKey;

  return null;
}

/** Vérifie si une clé API est configurée. */
export function hasApiKey(): boolean {
  return getStoredApiKey() !== null;
}

/** Sauvegarde une clé API (auto-détecte le provider — legacy). */
export function saveApiKey(key: string): void {
  const detected = detectProviderFromKey(key);
  const providerDef = LLM_PROVIDERS.find(p => p.id === detected.type);
  saveLLMConfig({
    provider: (detected.type as LLMProviderType) || 'openai',
    apiKey: key.trim(),
    model: providerDef?.defaultModel || 'gpt-4o-mini',
  });
}

/** Efface la clé API (legacy wrapper). */
export function clearApiKey(): void {
  clearLLMConfig();
}

/** Détecte le provider depuis le préfixe de clé (legacy). */
export function detectProviderFromKey(key: string): { name: string; type: string } {
  if (key.startsWith('gsk_')) return { name: 'Groq', type: 'groq' };
  if (key.startsWith('AIzaSy')) return { name: 'Google Gemini', type: 'gemini' };
  if (key.startsWith('sk-ant-')) return { name: 'Anthropic', type: 'anthropic' };
  if (key.startsWith('sk-or-')) return { name: 'OpenRouter', type: 'openrouter' };
  if (key.startsWith('sk-')) return { name: 'OpenAI', type: 'openai' };
  return { name: 'OpenAI-compatible', type: 'openai' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESOLVE PROVIDER — Construit URL + headers depuis la config
// ═══════════════════════════════════════════════════════════════════════════════

export function resolveProvider(config: LLMConfig): ResolvedProvider {
  const providerDef = getProviderDef(config.provider);
  const apiFormat: ApiFormat = providerDef?.apiFormat || 'openai-compat';
  const baseUrl = (config.baseUrl?.replace(/\/+$/, '')) || providerDef?.defaultBaseUrl || '';

  let url: string;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  switch (apiFormat) {
    case 'gemini':
      url = `${baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`;
      break;
    case 'anthropic':
      url = `${baseUrl}/messages`;
      headers['x-api-key'] = config.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
      break;
    default: {
      // OpenAI-compatible
      if (config.provider === 'openai' && import.meta.env.DEV && !config.baseUrl) {
        url = '/llm-proxy/openai/v1/chat/completions';
      } else {
        url = `${baseUrl}/chat/completions`;
      }
      if (config.provider === 'azure') {
        headers['api-key'] = config.apiKey;
      } else {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }
      break;
    }
  }

  return {
    apiFormat,
    url,
    headers,
    model: config.model,
    providerName: providerDef?.name || config.provider,
    providerType: config.provider,
    baseUrl,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST — Valide la connexion avec une requête minimale (max_tokens=1)
// ═══════════════════════════════════════════════════════════════════════════════

export async function testLLMConfig(config: LLMConfig): Promise<ApiKeyTestResult> {
  const resolved = resolveProvider(config);
  const start = performance.now();

  try {
    let response: Response;

    if (resolved.apiFormat === 'gemini') {
      response = await fetch(resolved.url, {
        method: 'POST',
        headers: resolved.headers,
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hi' }] }],
          generationConfig: { maxOutputTokens: 1, temperature: 0 },
        }),
      });
    } else if (resolved.apiFormat === 'anthropic') {
      response = await fetch(resolved.url, {
        method: 'POST',
        headers: resolved.headers,
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1,
        }),
      });
    } else {
      response = await fetch(resolved.url, {
        method: 'POST',
        headers: resolved.headers,
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1,
          temperature: 0,
        }),
      });
    }

    const latencyMs = Math.round(performance.now() - start);

    if (response.ok) {
      return { success: true, provider: resolved.providerName, model: config.model, latencyMs };
    }

    const errData = await response.json().catch(() => ({}));
    const errMsg = (errData as { error?: { message?: string } }).error?.message
      || `HTTP ${response.status}`;
    return { success: false, provider: resolved.providerName, model: config.model, latencyMs, error: errMsg };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      provider: resolved.providerName,
      latencyMs,
      error: msg.includes('Failed to fetch')
        ? 'Impossible de contacter le serveur. Vérifiez votre connexion internet et l\'URL de l\'API.'
        : msg,
    };
  }
}

/** Legacy wrapper — teste en auto-détectant le provider depuis la clé. */
export async function testApiKey(apiKey: string): Promise<ApiKeyTestResult> {
  const detected = detectProviderFromKey(apiKey);
  const providerDef = LLM_PROVIDERS.find(p => p.id === detected.type);
  return testLLMConfig({
    provider: (detected.type as LLMProviderType) || 'openai',
    apiKey,
    model: providerDef?.defaultModel || 'gpt-4o-mini',
  });
}
