import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Volume2,
  VolumeX,
  Pause,
  Copy,
  Check,
  RefreshCw,
  ArrowLeft,
  Settings,
  Loader2
} from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { useGroq } from '../hooks/useGroq';
import { useSpeech } from '../hooks/useSpeech';
import { buildSystemPrompt, buildUserPrompt, buildRegenerateSectionPrompt } from '../services/pitchPrompts';
import type { PitchConfig, PitchSection } from '../types/pitch';

// Produits Air Liquide disponibles
const PRODUCTS = [
  'VitalAire Confort+',
  'Télésuivi O2',
  'Station extracteur concentrateur',
  'Oxygène liquide portable',
  'Service 24/7',
];

// Concurrents identifiés
const COMPETITORS = [
  'Vivisol',
  'Linde Healthcare',
  'SOS Oxygène',
  'Bastide Médical',
];

export function PitchGenerator() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const practitioners = useAppStore((state) => state.practitioners);

  const practitionerId = searchParams.get('practitionerId');
  const practitioner = practitioners.find((p) => p.id === practitionerId);

  // Configuration du pitch
  const [config, setConfig] = useState<PitchConfig>({
    length: 'medium',
    tone: 'conversational',
    products: ['VitalAire Confort+', 'Télésuivi O2'],
    competitors: ['Vivisol'],
    additionalInstructions: '',
  });

  // États de génération
  const [sections, setSections] = useState<PitchSection[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [copied, setCopied] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editInstruction, setEditInstruction] = useState('');

  // Hooks IA et Speech
  const { streamCompletion, complete, isLoading: groqLoading } = useGroq({
    temperature: 0.8,
    maxTokens: 2048,
  });
  const { speak, pause, resume, stop, isSpeaking, isPaused } = useSpeech();

  useEffect(() => {
    if (!practitioner) {
      navigate('/practitioners');
    }
  }, [practitioner, navigate]);

  // Parser le texte streamé en sections
  const parsePitchSections = (text: string): PitchSection[] => {
    const sectionRegex = /\[([A-Z_]+)\]\s*\n([\s\S]*?)(?=\n\[|$)/g;
    const parsed: PitchSection[] = [];
    let match;

    const sectionMap: Record<string, { id: 'hook' | 'proposition' | 'competition' | 'cta'; title: string; icon: string }> = {
      ACCROCHE: { id: 'hook', title: 'Accroche', icon: '🎯' },
      PROPOSITION: { id: 'proposition', title: 'Proposition de valeur', icon: '💡' },
      CONCURRENCE: { id: 'competition', title: 'Différenciation', icon: '⚡' },
      CALL_TO_ACTION: { id: 'cta', title: 'Call to Action', icon: '🚀' },
    };

    while ((match = sectionRegex.exec(text)) !== null) {
      const [, key, content] = match;
      const section = sectionMap[key];
      if (section) {
        parsed.push({
          ...section,
          content: content.trim(),
        });
      }
    }

    return parsed;
  };

  // Générer le pitch complet
  const generatePitch = async () => {
    if (!practitioner) return;

    setIsGenerating(true);
    setStreamedText('');
    setSections([]);

    const systemPrompt = buildSystemPrompt(config);
    const userPrompt = buildUserPrompt(practitioner, config);

    await streamCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      (chunk) => {
        setStreamedText((prev) => {
          const newText = prev + chunk;
          // Parser en temps réel pour afficher les sections
          const parsed = parsePitchSections(newText);
          if (parsed.length > 0) {
            setSections(parsed);
          }
          return newText;
        });
      },
      () => {
        setIsGenerating(false);
      }
    );
  };

  // Régénérer une section spécifique
  const regenerateSection = async (sectionId: string) => {
    if (!practitioner) return;

    const section = sections.find((s) => s.id === sectionId);
    if (!section || !editInstruction.trim()) return;

    setEditingSection(sectionId);

    const systemPrompt = buildSystemPrompt(config);
    const regeneratePrompt = buildRegenerateSectionPrompt(
      sectionId,
      section.content,
      editInstruction,
      streamedText
    );

    const newContent = await complete([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: regeneratePrompt },
    ]);

    if (newContent) {
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId ? { ...s, content: newContent.trim() } : s
        )
      );

      // Mettre à jour le texte complet
      const updatedText = streamedText.replace(
        new RegExp(`\\[${section.id.toUpperCase()}\\][\\s\\S]*?(?=\\n\\[|$)`),
        `[${section.id.toUpperCase()}]\n${newContent.trim()}`
      );
      setStreamedText(updatedText);
    }

    setEditingSection(null);
    setEditInstruction('');
  };

  // Copier le pitch complet
  const copyToClipboard = () => {
    const fullText = sections.map((s) => `${s.title.toUpperCase()}\n\n${s.content}`).join('\n\n---\n\n');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Lire le pitch à voix haute
  const handleSpeak = () => {
    if (isSpeaking) {
      if (isPaused) {
        resume();
      } else {
        pause();
      }
    } else {
      const fullText = sections.map((s) => s.content).join('. ');
      speak(fullText, { rate: 0.95 });
    }
  };

  if (!practitioner) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-airLiquide-teal" />
                Générateur de Pitch IA
              </h1>
              <p className="text-gray-600 mt-1">
                Pitch personnalisé pour {practitioner.title} {practitioner.firstName} {practitioner.lastName}
              </p>
            </div>
          </div>

          {sections.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSpeak}
                disabled={isGenerating}
                className="btn-primary flex items-center gap-2"
              >
                {isSpeaking && !isPaused ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Pause
                  </>
                ) : isSpeaking && isPaused ? (
                  <>
                    <Volume2 className="w-4 h-4" />
                    Reprendre
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    Écouter
                  </>
                )}
              </button>
              {isSpeaking && (
                <button
                  onClick={stop}
                  className="btn-primary bg-red-500 hover:bg-red-600"
                >
                  <VolumeX className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={copyToClipboard}
                className="btn-primary bg-white text-airLiquide-primary border-2 border-airLiquide-primary hover:bg-airLiquide-primary hover:text-white"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copié!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copier
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Configuration Panel */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-6 sticky top-8"
            >
              <div className="flex items-center gap-2 mb-6">
                <Settings className="w-5 h-5 text-airLiquide-primary" />
                <h2 className="text-xl font-bold text-gray-900">Configuration</h2>
              </div>

              <div className="space-y-6">
                {/* Longueur */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Longueur du pitch
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['short', 'medium', 'long'] as const).map((len) => (
                      <button
                        key={len}
                        onClick={() => setConfig({ ...config, length: len })}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          config.length === len
                            ? 'bg-airLiquide-primary text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {len === 'short' ? 'Court' : len === 'medium' ? 'Moyen' : 'Long'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ton */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Ton du discours
                  </label>
                  <div className="space-y-2">
                    {(['formal', 'conversational', 'technical'] as const).map((tone) => (
                      <button
                        key={tone}
                        onClick={() => setConfig({ ...config, tone })}
                        className={`w-full px-4 py-2 rounded-lg text-sm font-medium text-left transition-all ${
                          config.tone === tone
                            ? 'bg-airLiquide-primary text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tone === 'formal'
                          ? 'Formel'
                          : tone === 'conversational'
                          ? 'Conversationnel'
                          : 'Technique'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Produits */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Produits à mettre en avant
                  </label>
                  <div className="space-y-2">
                    {PRODUCTS.map((product) => (
                      <label key={product} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.products.includes(product)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setConfig({ ...config, products: [...config.products, product] });
                            } else {
                              setConfig({
                                ...config,
                                products: config.products.filter((p) => p !== product),
                              });
                            }
                          }}
                          className="w-4 h-4 text-airLiquide-primary rounded"
                        />
                        <span className="text-sm text-gray-700">{product}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Concurrents */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Concurrents à adresser
                  </label>
                  <div className="space-y-2">
                    {COMPETITORS.map((competitor) => (
                      <label key={competitor} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.competitors.includes(competitor)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setConfig({
                                ...config,
                                competitors: [...config.competitors, competitor],
                              });
                            } else {
                              setConfig({
                                ...config,
                                competitors: config.competitors.filter((c) => c !== competitor),
                              });
                            }
                          }}
                          className="w-4 h-4 text-airLiquide-primary rounded"
                        />
                        <span className="text-sm text-gray-700">{competitor}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Instructions additionnelles */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Instructions spéciales (optionnel)
                  </label>
                  <textarea
                    value={config.additionalInstructions}
                    onChange={(e) =>
                      setConfig({ ...config, additionalInstructions: e.target.value })
                    }
                    placeholder="Ex: Insister sur le service 24/7, mentionner la dernière étude clinique..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-airLiquide-primary focus:border-transparent"
                    rows={4}
                  />
                </div>

                {/* Bouton Générer */}
                <button
                  onClick={generatePitch}
                  disabled={isGenerating || groqLoading}
                  className="w-full btn-primary flex items-center justify-center gap-2 py-3"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Générer le pitch
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>

          {/* Pitch Display */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {sections.length === 0 && !isGenerating ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="glass-card p-12 text-center"
                >
                  <Sparkles className="w-16 h-16 text-airLiquide-teal mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Prêt à générer votre pitch
                  </h3>
                  <p className="text-gray-600">
                    Configurez les paramètres et cliquez sur "Générer le pitch" pour commencer
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="sections"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  {sections.map((section, index) => (
                    <motion.div
                      key={section.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="glass-card p-6 group relative"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{section.icon}</span>
                          <h3 className="text-xl font-bold text-gray-900">{section.title}</h3>
                        </div>
                        <button
                          onClick={() => {
                            setEditingSection(section.id);
                            setEditInstruction('');
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-airLiquide-lightBlue/20"
                        >
                          <RefreshCw className="w-4 h-4 text-airLiquide-primary" />
                        </button>
                      </div>

                      {editingSection === section.id ? (
                        <div className="space-y-3">
                          <textarea
                            value={editInstruction}
                            onChange={(e) => setEditInstruction(e.target.value)}
                            placeholder="Ex: Rendre plus percutant, ajouter des chiffres, raccourcir..."
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-airLiquide-primary focus:border-transparent"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => regenerateSection(section.id)}
                              disabled={groqLoading || !editInstruction.trim()}
                              className="btn-primary text-sm"
                            >
                              {groqLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Régénération...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-4 h-4" />
                                  Régénérer
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setEditingSection(null);
                                setEditInstruction('');
                              }}
                              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {section.content}
                        </p>
                      )}
                    </motion.div>
                  ))}

                  {isGenerating && sections.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="glass-card p-8 text-center"
                    >
                      <Loader2 className="w-12 h-12 text-airLiquide-primary mx-auto mb-4 animate-spin" />
                      <p className="text-gray-600">L'IA génère votre pitch personnalisé...</p>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
