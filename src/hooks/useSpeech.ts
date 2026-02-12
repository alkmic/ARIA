import { useState, useCallback, useEffect, useRef } from 'react';
import {
  getVoiceCapabilities,
  synthesizeWithOpenAI,
  playAudioBlob,
  stopAudioPlayback,
  isAudioPlaying,
  type TTSVoice,
} from '../services/voiceService';

interface SpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: TTSVoice; // Voix OpenAI TTS (nova, alloy, echo, etc.)
}

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [ttsSource, setTtsSource] = useState<'openai-tts' | 'browser'>('browser');
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isCancelledRef = useRef(false);

  // Vérifier le support et charger les voix
  useEffect(() => {
    const caps = getVoiceCapabilities();
    setTtsSource(caps.tts === 'openai-tts' ? 'openai-tts' : 'browser');

    if (caps.tts === 'openai-tts') {
      setIsSupported(true);
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSupported(false);
      return;
    }

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      voicesRef.current = availableVoices;
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback(async (text: string, options?: SpeechOptions) => {
    if (!isSupported || !text.trim()) {
      console.warn('Speech synthesis not supported or empty text');
      return;
    }

    // Arrêter toute lecture en cours
    stopAudioPlayback();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    isCancelledRef.current = false;

    // ── OpenAI TTS (voix IA haute qualité) ──
    const caps = getVoiceCapabilities();
    if (caps.tts === 'openai-tts') {
      try {
        setIsSpeaking(true);
        setIsPaused(false);
        const audioBlob = await synthesizeWithOpenAI(text, options?.voice || 'nova', options?.rate || 1.0);
        if (isCancelledRef.current) return;
        await playAudioBlob(audioBlob);
        if (!isCancelledRef.current) {
          setIsSpeaking(false);
        }
        return;
      } catch (err) {
        console.warn('[useSpeech] OpenAI TTS failed, falling back to browser:', err);
        setIsSpeaking(false);
        // Continuer vers le fallback navigateur
      }
    }

    // ── Fallback: Web SpeechSynthesis ──
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/_/g, '')
      .replace(/`/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    currentUtteranceRef.current = utterance;

    const voices = voicesRef.current.length > 0
      ? voicesRef.current
      : window.speechSynthesis.getVoices();

    const frenchVoice = voices.find(
      (v) => v.lang.startsWith('fr') && (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Natural'))
    ) || voices.find((v) => v.lang.startsWith('fr')) || voices[0];

    if (frenchVoice) utterance.voice = frenchVoice;

    utterance.lang = 'fr-FR';
    utterance.rate = options?.rate || 0.95;
    utterance.pitch = options?.pitch || 1.0;
    utterance.volume = options?.volume || 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      currentUtteranceRef.current = null;
    };

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted') {
        console.error('Speech synthesis error:', e.error);
      }
      setIsSpeaking(false);
      setIsPaused(false);
      currentUtteranceRef.current = null;
    };

    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 50);
  }, [isSupported]);

  const pause = useCallback(() => {
    if (isSupported && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
    // Note: OpenAI TTS (audio element) n'a pas de pause native ici
  }, [isSupported]);

  const resume = useCallback(() => {
    if (isSupported && 'speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isSupported]);

  const stop = useCallback(() => {
    isCancelledRef.current = true;
    // Arrêter OpenAI TTS
    if (isAudioPlaying()) stopAudioPlayback();
    // Arrêter browser TTS
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    currentUtteranceRef.current = null;
  }, []);

  return { speak, pause, resume, stop, isSpeaking, isPaused, isSupported, ttsSource };
}
