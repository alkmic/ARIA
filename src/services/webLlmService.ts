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
}

export const WEBLLM_MODELS: WebLLMModelInfo[] = [
  {
    id: 'Qwen3-1.7B-q4f16_1-MLC',
    name: 'Qwen3 1.7B',
    size: '~2 Go',
    vramMB: 2037,
    description: 'Bon compromis qualité/performance pour le navigateur',
  },
  {
    id: 'Qwen3-0.6B-q4f16_1-MLC',
    name: 'Qwen3 0.6B',
    size: '~1.4 Go',
    vramMB: 1403,
    description: 'Ultra-léger, rapide, pour GPU limité',
  },
  {
    id: 'Qwen3-4B-q4f16_1-MLC',
    name: 'Qwen3 4B',
    size: '~3.4 Go',
    vramMB: 3432,
    description: 'Meilleure qualité, nécessite plus de VRAM',
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
        const msg = err instanceof Error ? err.message : String(err);
        this.lastError = msg;
        this.setStatus('error');
        this.engine = null;
        this.currentModelId = null;
        console.error('[WebLLM] Load failed:', msg);
        throw err;
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

  // Check if an external API key is configured
  const apiKey = (import.meta.env.VITE_LLM_API_KEY as string) || '';
  const hasExternalKey = apiKey && apiKey.length > 10
    && apiKey !== 'your_groq_api_key_here'
    && apiKey !== 'your_llm_api_key_here'
    && apiKey !== 'your_api_key_here';

  // Only auto-preload when no external API key — WebLLM is the primary LLM
  if (!hasExternalKey) {
    const modelId = getSavedModelId();
    console.log(`[WebLLM] Auto-preloading ${modelId} (no external API key detected)`);
    webLlmService.loadModel(modelId).catch((err) => {
      console.warn('[WebLLM] Auto-preload failed:', err);
    });
  }
}

// Defer auto-preload to avoid blocking initial render
setTimeout(autoPreload, 1000);
