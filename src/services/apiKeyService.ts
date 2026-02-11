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
