/**
 * Service vocal unifié — STT (Whisper) + TTS (OpenAI) avec fallback navigateur
 *
 * Détecte les capacités du provider LLM configuré et utilise :
 * - STT : Whisper API (OpenAI, Azure, Groq) → fallback Web Speech API
 * - TTS : OpenAI TTS API (OpenAI, Azure) → fallback Web SpeechSynthesis
 */

import { getStoredLLMConfig, getStoredApiKey, resolveProvider, type LLMConfig } from './apiKeyService';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type STTSource = 'whisper' | 'browser' | 'none';
export type TTSSource = 'openai-tts' | 'browser' | 'none';

export interface VoiceCapabilities {
  stt: STTSource;
  tts: TTSSource;
  providerName: string;
  sttModel: string;
  ttsModel: string;
  ttsVoices: string[];
}

export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' | 'coral';

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER CAPABILITIES DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

const WHISPER_PROVIDERS = ['openai', 'groq', 'azure'] as const;
const TTS_PROVIDERS = ['openai', 'azure'] as const;

/**
 * Détecte les capacités vocales du provider LLM configuré
 */
export function getVoiceCapabilities(): VoiceCapabilities {
  const config = getStoredLLMConfig();
  const apiKey = getStoredApiKey();
  const provider = config?.provider || '';

  const hasWhisper = apiKey && WHISPER_PROVIDERS.includes(provider as typeof WHISPER_PROVIDERS[number]);
  const hasTTS = apiKey && TTS_PROVIDERS.includes(provider as typeof TTS_PROVIDERS[number]);

  const hasBrowserSTT = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  const hasBrowserTTS = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return {
    stt: hasWhisper ? 'whisper' : hasBrowserSTT ? 'browser' : 'none',
    tts: hasTTS ? 'openai-tts' : hasBrowserTTS ? 'browser' : 'none',
    providerName: config?.provider || 'browser',
    sttModel: provider === 'groq' ? 'whisper-large-v3-turbo' : 'whisper-1',
    ttsModel: 'tts-1',
    ttsVoices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer', 'coral'],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STT — WHISPER API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Construit l'URL Whisper en fonction du provider
 */
function getWhisperEndpoint(config: LLMConfig): { url: string; headers: Record<string, string> } {
  const resolved = resolveProvider(config);

  if (config.provider === 'azure') {
    // Azure: {endpoint}/openai/deployments/whisper-1/audio/transcriptions?api-version=2024-12-01-preview
    const baseUrl = config.baseUrl?.replace(/\/+$/, '') || '';
    const apiVersion = config.apiVersion || '2024-12-01-preview';
    return {
      url: `${baseUrl}/openai/deployments/whisper-1/audio/transcriptions?api-version=${apiVersion}`,
      headers: { 'api-key': config.apiKey },
    };
  }

  if (config.provider === 'groq') {
    return {
      url: 'https://api.groq.com/openai/v1/audio/transcriptions',
      headers: { 'Authorization': `Bearer ${config.apiKey}` },
    };
  }

  // OpenAI (direct or custom)
  const baseUrl = resolved.baseUrl || 'https://api.openai.com/v1';
  return {
    url: `${baseUrl}/audio/transcriptions`,
    headers: { 'Authorization': `Bearer ${config.apiKey}` },
  };
}

/**
 * Transcrit un fichier audio via l'API Whisper
 */
export async function transcribeWithWhisper(audioBlob: Blob): Promise<string> {
  const config = getStoredLLMConfig();
  if (!config) throw new Error('Aucun LLM configuré');

  const capabilities = getVoiceCapabilities();
  if (capabilities.stt !== 'whisper') throw new Error('Whisper non disponible pour ce provider');

  const { url, headers } = getWhisperEndpoint(config);

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', capabilities.sttModel);
  formData.append('language', 'fr');
  formData.append('response_format', 'text');

  const response = await fetch(url, {
    method: 'POST',
    headers, // pas de Content-Type — FormData le gère
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Whisper error: ${response.status}`);
  }

  return (await response.text()).trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// TTS — OPENAI TTS API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Construit l'URL TTS en fonction du provider
 */
function getTTSEndpoint(config: LLMConfig): { url: string; headers: Record<string, string> } {
  if (config.provider === 'azure') {
    const baseUrl = config.baseUrl?.replace(/\/+$/, '') || '';
    const apiVersion = config.apiVersion || '2024-12-01-preview';
    return {
      url: `${baseUrl}/openai/deployments/tts-1/audio/speech?api-version=${apiVersion}`,
      headers: { 'api-key': config.apiKey, 'Content-Type': 'application/json' },
    };
  }

  // OpenAI
  const baseUrl = config.baseUrl?.replace(/\/+$/, '') || 'https://api.openai.com/v1';
  return {
    url: `${baseUrl}/audio/speech`,
    headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
  };
}

/**
 * Synthétise du texte en audio via l'API OpenAI TTS
 * Retourne un Blob audio MP3 prêt à être lu
 */
export async function synthesizeWithOpenAI(
  text: string,
  voice: TTSVoice = 'nova',
  speed: number = 1.0,
): Promise<Blob> {
  const config = getStoredLLMConfig();
  if (!config) throw new Error('Aucun LLM configuré');

  const capabilities = getVoiceCapabilities();
  if (capabilities.tts !== 'openai-tts') throw new Error('TTS OpenAI non disponible');

  // Nettoyer le texte du markdown
  const cleanText = text
    .replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '')
    .replace(/`/g, '').replace(/#{1,6}\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();

  if (!cleanText) throw new Error('Texte vide');

  const { url, headers } = getTTSEndpoint(config);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: capabilities.ttsModel,
      input: cleanText,
      voice,
      speed,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `TTS error: ${response.status}`);
  }

  return response.blob();
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIO RECORDER — Capture microphone en WebM/Opus pour Whisper
// ═══════════════════════════════════════════════════════════════════════════════

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    this.chunks = [];
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm',
    });
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.start(1000); // collect chunks every 1s
  }

  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(new Blob(this.chunks, { type: 'audio/webm' }));
        return;
      }
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'audio/webm' });
        // Release microphone
        this.stream?.getTracks().forEach((t) => t.stop());
        this.stream = null;
        resolve(blob);
      };
      this.mediaRecorder.stop();
    });
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIO PLAYER — Lit un Blob audio (pour TTS API)
// ═══════════════════════════════════════════════════════════════════════════════

let currentAudio: HTMLAudioElement | null = null;

export function playAudioBlob(blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    stopAudioPlayback();
    const url = URL.createObjectURL(blob);
    currentAudio = new Audio(url);
    currentAudio.onended = () => {
      URL.revokeObjectURL(url);
      currentAudio = null;
      resolve();
    };
    currentAudio.onerror = (e) => {
      URL.revokeObjectURL(url);
      currentAudio = null;
      reject(e);
    };
    currentAudio.play().catch(reject);
  });
}

export function stopAudioPlayback(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

export function isAudioPlaying(): boolean {
  return currentAudio !== null && !currentAudio.paused;
}
