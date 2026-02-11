/**
 * WebLLM Service — LLM dans le navigateur via WebGPU
 *
 * Exécute un modèle Qwen3 directement dans le navigateur, sans serveur.
 * Utilise WebGPU pour l'inférence GPU-accélérée.
 *
 * Modèle par défaut : Qwen3-1.7B-q4f16_1-MLC (~2 Go VRAM)
 * Alternative légère : Qwen3-0.6B-q4f16_1-MLC (~1.4 Go VRAM)
 */

import {
  CreateMLCEngine,
  prebuiltAppConfig,
  type InitProgressReport,
  type MLCEngineInterface,
} from '@mlc-ai/web-llm';
import { hasApiKey } from './apiKeyService';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface WebLLMProgress {
  /** 0 to 1 */
  progress: number;
  /** Human-readable status text */
  text: string;
  /** Time elapsed in seconds */
  timeElapsed: number;
}

export type WebLLMStatus =
  | 'idle'        // Not initialized
  | 'loading'     // Downloading / compiling model
  | 'ready'       // Model loaded, ready for inference
  | 'generating'  // Currently generating a response
  | 'error';      // An error occurred

export interface WebLLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AVAILABLE MODELS
// ═══════════════════════════════════════════════════════════════════════════════

export interface WebLLMModelInfo {
  id: string;
  name: string;
  size: string;
  vramMB: number;
  description: string;
  family: string;
  org: string;
}

export const WEBLLM_MODELS: WebLLMModelInfo[] = [
  // ── Qwen3 (Alibaba) ────────────────────────────────────────────────────
  {
    id: 'Qwen3-0.6B-q4f16_1-MLC',
    name: 'Qwen3 0.6B',
    size: '~1.4 Go',
    vramMB: 1403,
    description: 'Ultra-léger, rapide, idéal pour GPU limité',
    family: 'Qwen3',
    org: 'Alibaba',
  },
  {
    id: 'Qwen3-1.7B-q4f16_1-MLC',
    name: 'Qwen3 1.7B',
    size: '~2 Go',
    vramMB: 2037,
    description: 'Bon compromis qualité/performance',
    family: 'Qwen3',
    org: 'Alibaba',
  },
  {
    id: 'Qwen3-4B-q4f16_1-MLC',
    name: 'Qwen3 4B',
    size: '~3.4 Go',
    vramMB: 3432,
    description: 'Haute qualité, nécessite plus de VRAM',
    family: 'Qwen3',
    org: 'Alibaba',
  },
  // ── SmolLM2 (HuggingFace) ──────────────────────────────────────────────
  {
    id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 360M',
    size: '~0.5 Go',
    vramMB: 500,
    description: 'Nano-modèle, chargement quasi-instantané',
    family: 'SmolLM2',
    org: 'HuggingFace',
  },
  {
    id: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 1.7B',
    size: '~2 Go',
    vramMB: 2048,
    description: 'Léger et polyvalent par HuggingFace',
    family: 'SmolLM2',
    org: 'HuggingFace',
  },
  // ── Llama 3.2 (Meta) ───────────────────────────────────────────────────
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 1B',
    size: '~1.5 Go',
    vramMB: 1506,
    description: 'Compact et efficace par Meta',
    family: 'Llama 3.2',
    org: 'Meta',
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 3B',
    size: '~2.8 Go',
    vramMB: 2828,
    description: 'Bonne qualité, architecture Meta',
    family: 'Llama 3.2',
    org: 'Meta',
  },
  // ── Phi 3.5 (Microsoft) ────────────────────────────────────────────────
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    name: 'Phi 3.5 Mini',
    size: '~3.6 Go',
    vramMB: 3615,
    description: 'Raisonnement avancé par Microsoft',
    family: 'Phi 3.5',
    org: 'Microsoft',
  },
  // ── Gemma 2 (Google) ───────────────────────────────────────────────────
  {
    id: 'gemma-2-2b-it-q4f16_1-MLC',
    name: 'Gemma 2 2B',
    size: '~2.2 Go',
    vramMB: 2200,
    description: 'Modèle ouvert Google, bonne qualité',
    family: 'Gemma 2',
    org: 'Google',
  },
  // ── DeepSeek R1 Distill ────────────────────────────────────────────────
  {
    id: 'DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC',
    name: 'DeepSeek R1 7B',
    size: '~5.5 Go',
    vramMB: 5500,
    description: 'Raisonnement profond, GPU puissant requis',
    family: 'DeepSeek R1',
    org: 'DeepSeek',
  },
  // ── Mistral (Mistral AI) ───────────────────────────────────────────────
  {
    id: 'Mistral-7B-Instruct-v0.3-q4f16_1-MLC',
    name: 'Mistral 7B v0.3',
    size: '~5.2 Go',
    vramMB: 5200,
    description: 'Performant en français, GPU puissant requis',
    family: 'Mistral',
    org: 'Mistral AI',
  },
];

export const DEFAULT_WEBLLM_MODEL = 'Qwen3-1.7B-q4f16_1-MLC';

const STORAGE_KEY = 'aria_webllm_model';

function getSavedModelId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_WEBLLM_MODEL;
  } catch {
    return DEFAULT_WEBLLM_MODEL;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

type ProgressListener = (progress: WebLLMProgress) => void;
type StatusListener = (status: WebLLMStatus) => void;

class WebLLMService {
  private engine: MLCEngineInterface | null = null;
  private status: WebLLMStatus = 'idle';
  private currentModelId: string | null = null;
  private lastProgress: WebLLMProgress = { progress: 0, text: '', timeElapsed: 0 };
  private lastError: string | null = null;
  private loadPromise: Promise<void> | null = null;

  // Listeners for reactive UI updates
  private progressListeners = new Set<ProgressListener>();
  private statusListeners = new Set<StatusListener>();

  // ── WebGPU support check ───────────────────────────────────────────────

  isWebGPUSupported(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  }

  // ── Status & Progress ──────────────────────────────────────────────────

  getStatus(): WebLLMStatus {
    return this.status;
  }

  getLastProgress(): WebLLMProgress {
    return this.lastProgress;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  getCurrentModelId(): string | null {
    return this.currentModelId;
  }

  isReady(): boolean {
    return this.status === 'ready' && this.engine !== null;
  }

  onProgress(listener: ProgressListener): () => void {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private setStatus(status: WebLLMStatus) {
    this.status = status;
    this.statusListeners.forEach(l => l(status));
  }

  private setProgress(report: InitProgressReport) {
    this.lastProgress = {
      progress: report.progress,
      text: report.text,
      timeElapsed: report.timeElapsed,
    };
    this.progressListeners.forEach(l => l(this.lastProgress));
  }

  // ── Model Loading ──────────────────────────────────────────────────────

  /**
   * Ensure the model is loaded. If not loaded yet, triggers loading and waits.
   * If already loading, waits for the current load to complete.
   * This is the main entry point used by the LLM fallback chain.
   */
  async ensureLoaded(modelId?: string): Promise<void> {
    const id = modelId || getSavedModelId();
    if (this.isReady() && this.currentModelId === id) return;
    if (this.loadPromise && this.loadingModelId === id) return this.loadPromise;
    return this.loadModel(id);
  }

  /** Track which model is currently being loaded (before loadPromise completes) */
  private loadingModelId: string | null = null;

  /**
   * Load a model into the browser. Downloads weights on first use (~1-3 Go),
   * then cached in browser storage for instant loads.
   */
  async loadModel(modelId: string = DEFAULT_WEBLLM_MODEL): Promise<void> {
    // Already loaded this model
    if (this.currentModelId === modelId && this.status === 'ready' && this.engine) {
      return;
    }

    // Already loading this model — wait for it
    if (this.loadPromise && this.loadingModelId === modelId) {
      return this.loadPromise;
    }

    if (!this.isWebGPUSupported()) {
      this.lastError = 'WebGPU non supporté par votre navigateur. Utilisez Chrome 113+ ou Edge 113+.';
      this.setStatus('error');
      throw new Error(this.lastError);
    }

    // Verify model exists in prebuilt config
    const modelExists = prebuiltAppConfig.model_list.some(m => m.model_id === modelId);
    if (!modelExists) {
      this.lastError = `Modèle "${modelId}" non trouvé dans la configuration WebLLM.`;
      this.setStatus('error');
      throw new Error(this.lastError);
    }

    this.setStatus('loading');
    this.lastError = null;
    this.loadingModelId = modelId;

    this.loadPromise = (async () => {
      try {
        // Unload previous model if any
        if (this.engine) {
          await this.engine.unload();
          this.engine = null;
        }

        console.log(`[WebLLM] Loading model: ${modelId}`);

        this.engine = await CreateMLCEngine(modelId, {
          initProgressCallback: (report) => {
            this.setProgress(report);
            console.log(`[WebLLM] ${(report.progress * 100).toFixed(0)}% — ${report.text}`);
          },
        });

        this.currentModelId = modelId;
        this.setStatus('ready');
        console.log(`[WebLLM] Model loaded: ${modelId}`);
      } catch (err) {
        const rawMsg = err instanceof Error ? err.message : String(err);
        // Provide a user-friendly message for common network errors
        let userMsg: string;
        if (rawMsg.includes('Failed to fetch') || rawMsg.includes('NetworkError') || rawMsg.includes('net::ERR_')) {
          userMsg = 'Impossible de télécharger les poids du modèle. Vérifiez votre connexion internet. '
            + 'Les fichiers sont hébergés sur HuggingFace (~1-3 Go au premier chargement). '
            + 'Si le problème persiste, configurez une clé API externe dans les paramètres ci-dessus.';
        } else if (rawMsg.includes('WebGPU') || rawMsg.includes('GPU')) {
          userMsg = 'Erreur GPU : votre carte graphique ne supporte peut-être pas ce modèle. '
            + 'Essayez un modèle plus léger (Qwen3 0.6B) ou utilisez une clé API externe.';
        } else if (rawMsg.includes('out of memory') || rawMsg.includes('OOM')) {
          userMsg = 'Mémoire GPU insuffisante pour ce modèle. '
            + 'Essayez Qwen3 0.6B (plus léger) ou fermez d\'autres onglets utilisant le GPU.';
        } else {
          userMsg = rawMsg;
        }
        this.lastError = userMsg;
        this.setStatus('error');
        this.engine = null;
        this.currentModelId = null;
        console.error('[WebLLM] Load failed:', rawMsg);
        throw new Error(userMsg);
      } finally {
        this.loadPromise = null;
        this.loadingModelId = null;
      }
    })();

    return this.loadPromise;
  }

  isLoading(): boolean {
    return this.status === 'loading';
  }

  // ── Unload ─────────────────────────────────────────────────────────────

  async unload(): Promise<void> {
    if (this.engine) {
      await this.engine.unload();
      this.engine = null;
    }
    this.currentModelId = null;
    this.setStatus('idle');
    this.lastProgress = { progress: 0, text: '', timeElapsed: 0 };
  }

  // ── Non-streaming completion ───────────────────────────────────────────

  async complete(
    messages: WebLLMMessage[],
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<string | null> {
    if (!this.engine || this.status !== 'ready') {
      throw new Error('WebLLM: modèle non chargé. Appelez loadModel() d\'abord.');
    }

    const { temperature = 0.7, maxTokens = 2048 } = options;

    this.setStatus('generating');
    try {
      const result = await this.engine.chat.completions.create({
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature,
        max_tokens: maxTokens,
        stream: false,
      });

      // Non-streaming result
      const completion = result as { choices?: { message?: { content?: string } }[] };
      return completion.choices?.[0]?.message?.content || null;
    } finally {
      this.setStatus('ready');
    }
  }

  // ── Streaming completion ───────────────────────────────────────────────

  async streamComplete(
    messages: WebLLMMessage[],
    onChunk: (chunk: string) => void,
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<void> {
    if (!this.engine || this.status !== 'ready') {
      throw new Error('WebLLM: modèle non chargé. Appelez loadModel() d\'abord.');
    }

    const { temperature = 0.7, maxTokens = 2048 } = options;

    this.setStatus('generating');
    try {
      const stream = await this.engine.chat.completions.create({
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature,
        max_tokens: maxTokens,
        stream: true,
      });

      // Iterate over streaming chunks
      const asyncIterable = stream as AsyncIterable<{ choices?: { delta?: { content?: string } }[] }>;
      for await (const chunk of asyncIterable) {
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
          onChunk(content);
        }
      }
    } finally {
      this.setStatus('ready');
    }
  }

  // ── Interrupt ──────────────────────────────────────────────────────────

  interruptGenerate(): void {
    if (this.engine && this.status === 'generating') {
      this.engine.interruptGenerate();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

export const webLlmService = new WebLLMService();

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-PRELOAD : charge le modèle automatiquement au démarrage
// si aucune clé API externe n'est configurée et que WebGPU est disponible
// ═══════════════════════════════════════════════════════════════════════════════

function autoPreload() {
  // Skip in SSR / non-browser environments
  if (typeof window === 'undefined') return;
  // Skip if WebGPU is not supported
  if (!webLlmService.isWebGPUSupported()) return;

  // Only auto-preload when no external API key — WebLLM is the primary LLM
  if (!hasApiKey()) {
    const modelId = getSavedModelId();
    console.log(`[WebLLM] Auto-preloading ${modelId} (no external API key detected)`);
    webLlmService.loadModel(modelId).catch((err) => {
      console.warn('[WebLLM] Auto-preload failed:', err);
    });
  }
}

// Defer auto-preload to avoid blocking initial render
setTimeout(autoPreload, 1000);
