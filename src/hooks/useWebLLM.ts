/**
 * React hook for WebLLM — gère l'état du modèle dans le navigateur
 */

import { useState, useEffect, useCallback } from 'react';
import {
  webLlmService,
  DEFAULT_WEBLLM_MODEL,
  type WebLLMStatus,
  type WebLLMProgress,
} from '../services/webLlmService';

const STORAGE_KEY = 'aria_webllm_model';
const ENABLED_KEY = 'aria_webllm_enabled';

export function useWebLLM() {
  const [status, setStatus] = useState<WebLLMStatus>(webLlmService.getStatus());
  const [progress, setProgress] = useState<WebLLMProgress>(webLlmService.getLastProgress());
  const [error, setError] = useState<string | null>(webLlmService.getLastError());
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_WEBLLM_MODEL;
    } catch {
      return DEFAULT_WEBLLM_MODEL;
    }
  });
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ENABLED_KEY) !== 'false';
    } catch {
      return true;
    }
  });

  // Subscribe to service events
  useEffect(() => {
    const unsub1 = webLlmService.onStatusChange((s) => {
      setStatus(s);
      setError(webLlmService.getLastError());
    });
    const unsub2 = webLlmService.onProgress(setProgress);
    return () => { unsub1(); unsub2(); };
  }, []);

  const loadModel = useCallback(async (modelId?: string) => {
    const id = modelId || selectedModel;
    try {
      setError(null);
      await webLlmService.loadModel(id);
      try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
      setSelectedModel(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [selectedModel]);

  const unloadModel = useCallback(async () => {
    await webLlmService.unload();
    setError(null);
  }, []);

  const toggleEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    try { localStorage.setItem(ENABLED_KEY, String(enabled)); } catch { /* ignore */ }
    if (!enabled && webLlmService.isReady()) {
      webLlmService.unload();
    }
  }, []);

  return {
    status,
    progress,
    error,
    isReady: status === 'ready',
    isLoading: status === 'loading',
    isWebGPUSupported: webLlmService.isWebGPUSupported(),
    selectedModel,
    isEnabled,
    loadModel,
    unloadModel,
    toggleEnabled,
  };
}
