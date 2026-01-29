import { useState, useCallback, useEffect } from 'react';

interface SpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
}

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Charger les voix disponibles
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback((text: string, options?: SpeechOptions) => {
    // Arrêter toute lecture en cours
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Trouver une voix française de qualité
    const frenchVoice = voices.find(
      (v) => v.lang.startsWith('fr') && (v.name.includes('Google') || v.name.includes('Microsoft'))
    ) || voices.find((v) => v.lang.startsWith('fr'));

    if (frenchVoice) {
      utterance.voice = frenchVoice;
    }

    utterance.lang = 'fr-FR';
    utterance.rate = options?.rate || 1.0;
    utterance.pitch = options?.pitch || 1.0;
    utterance.volume = options?.volume || 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      setIsSpeaking(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  }, [voices]);

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  return { speak, pause, resume, stop, isSpeaking, isPaused };
}
