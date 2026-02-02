import { useState, useCallback, useEffect, useRef } from 'react';

interface SpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
}

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Vérifier le support et charger les voix
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSupported(false);
      return;
    }

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      voicesRef.current = availableVoices;
    };

    // Charger immédiatement si déjà disponibles
    loadVoices();

    // Écouter les changements de voix
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Cleanup: annuler toute lecture en cours quand le composant est démonté
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback((text: string, options?: SpeechOptions) => {
    if (!isSupported || !text.trim()) {
      console.warn('Speech synthesis not supported or empty text');
      return;
    }

    // Arrêter toute lecture en cours
    window.speechSynthesis.cancel();

    // Nettoyer le texte du markdown pour une meilleure lecture
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

    // Récupérer les voix fraîchement (au cas où elles n'étaient pas encore chargées)
    const voices = voicesRef.current.length > 0
      ? voicesRef.current
      : window.speechSynthesis.getVoices();

    // Trouver une voix française de qualité
    const frenchVoice = voices.find(
      (v) => v.lang.startsWith('fr') && (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Natural'))
    ) || voices.find((v) => v.lang.startsWith('fr')) || voices[0];

    if (frenchVoice) {
      utterance.voice = frenchVoice;
    }

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
      // Ignorer les erreurs 'interrupted' qui surviennent lors de l'annulation
      if (e.error !== 'interrupted') {
        console.error('Speech synthesis error:', e.error);
      }
      setIsSpeaking(false);
      setIsPaused(false);
      currentUtteranceRef.current = null;
    };

    // Petit délai pour s'assurer que tout est prêt
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 50);
  }, [isSupported]);

  const pause = useCallback(() => {
    if (isSupported && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isSupported]);

  const resume = useCallback(() => {
    if (isSupported && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isSupported]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
      currentUtteranceRef.current = null;
    }
  }, [isSupported]);

  return { speak, pause, resume, stop, isSpeaking, isPaused, isSupported };
}
