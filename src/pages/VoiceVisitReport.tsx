import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Check,
  AlertCircle,
  User,
  Calendar,
  Clock,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Edit3,
  Trash2,
  Plus,
  Tag,
  Target,
  TrendingUp,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  FileText
} from 'lucide-react';
import { useGroq } from '../hooks/useGroq';
import { quickSearch } from '../services/universalSearch';
import { DataService } from '../services/dataService';
import { useAppStore } from '../stores/useAppStore';
import { useUserDataStore } from '../stores/useUserDataStore';
import { useTranslation } from '../i18n';
import type { PractitionerProfile } from '../types/database';

interface ExtractedInfo {
  practitioner?: {
    id: string;
    name: string;
    confidence: number;
  };
  topics: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  nextActions: string[];
  keyPoints: string[];
  productsDiscussed: string[];
  competitorsMentioned: string[];
  objections: string[];
  opportunities: string[];
}

export default function VoiceVisitReport() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { complete } = useGroq();
  const { upcomingVisits } = useAppStore();
  const { t } = useTranslation();

  // State
  const [step, setStep] = useState<'select' | 'record' | 'review' | 'ai_deductions' | 'saved'>('select');
  const [selectedPractitioner, setSelectedPractitioner] = useState<PractitionerProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState<ExtractedInfo | null>(null);
  const [editedNotes, setEditedNotes] = useState('');
  const [_isSaved, setIsSaved] = useState(false);

  // AI deductions for profile enrichment
  interface AIDeduction {
    id: string;
    category: 'preference' | 'objection' | 'competitor' | 'opportunity' | 'relationship' | 'product_interest';
    label: string;
    detail: string;
    accepted: boolean;
  }
  const [aiDeductions, setAiDeductions] = useState<AIDeduction[]>([]);

  const recognitionRef = useRef<any>(null);
  const interimTranscriptRef = useRef('');

  // Auto-select from URL param or today's visit
  useEffect(() => {
    const practitionerId = searchParams.get('practitioner') || searchParams.get('practitionerId');
    if (practitionerId) {
      const p = DataService.getPractitionerById(practitionerId);
      if (p) {
        setSelectedPractitioner(p);
        setStep('record');
      }
    }
  }, [searchParams]);

  // Today's visits for quick selection
  const todayVisits = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return upcomingVisits.filter(v => v.date === today);
  }, [upcomingVisits]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return quickSearch(searchQuery, 8);
  }, [searchQuery]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'fr-FR';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
        }
        interimTranscriptRef.current = interimTranscript;
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setIsRecording(false);
        }
      };

      recognitionRef.current.onend = () => {
        // Auto-restart if still recording
        if (isRecording && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            // Ignore
          }
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isRecording]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('La reconnaissance vocale n\'est pas supportée. Utilisez Chrome ou Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setTranscript('');
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  // Process transcript with AI
  const processTranscript = async () => {
    if (!transcript.trim() || !selectedPractitioner) return;

    setIsProcessing(true);

    try {
      const prompt = `Tu es un assistant IA pour visiteurs médicaux Air Liquide. Analyse ce compte-rendu de visite et extrais les informations structurées.

PRATICIEN VISITÉ: ${selectedPractitioner.title} ${selectedPractitioner.firstName} ${selectedPractitioner.lastName}
SPÉCIALITÉ: ${selectedPractitioner.specialty}
VILLE: ${selectedPractitioner.address.city}

TRANSCRIPTION DU COMPTE-RENDU:
"${transcript}"

Réponds UNIQUEMENT avec un JSON valide (pas de texte avant ou après) avec cette structure exacte:
{
  "topics": ["liste des sujets abordés"],
  "sentiment": "positive" | "neutral" | "negative",
  "nextActions": ["actions à faire après cette visite"],
  "keyPoints": ["points clés à retenir"],
  "productsDiscussed": ["produits Air Liquide mentionnés: Oxygène, BPCO, VNI, etc."],
  "competitorsMentioned": ["concurrents mentionnés: Vivisol, Linde, etc."],
  "objections": ["objections ou freins exprimés par le praticien"],
  "opportunities": ["opportunités détectées"]
}`;

      const response = await complete([{ role: 'user', content: prompt }]);

      if (response) {
        try {
          // Extract JSON from response
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            setExtractedInfo({
              practitioner: {
                id: selectedPractitioner.id,
                name: `${selectedPractitioner.title} ${selectedPractitioner.firstName} ${selectedPractitioner.lastName}`,
                confidence: 1
              },
              topics: parsed.topics || [],
              sentiment: parsed.sentiment || 'neutral',
              nextActions: parsed.nextActions || [],
              keyPoints: parsed.keyPoints || [],
              productsDiscussed: parsed.productsDiscussed || [],
              competitorsMentioned: parsed.competitorsMentioned || [],
              objections: parsed.objections || [],
              opportunities: parsed.opportunities || []
            });
            setEditedNotes(transcript);
            setStep('review');
          }
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          // Fallback: create basic extraction
          setExtractedInfo({
            practitioner: {
              id: selectedPractitioner.id,
              name: `${selectedPractitioner.title} ${selectedPractitioner.firstName} ${selectedPractitioner.lastName}`,
              confidence: 1
            },
            topics: ['Discussion générale'],
            sentiment: 'neutral',
            nextActions: ['Suivi à planifier'],
            keyPoints: [transcript.substring(0, 100) + '...'],
            productsDiscussed: [],
            competitorsMentioned: [],
            objections: [],
            opportunities: []
          });
          setEditedNotes(transcript);
          setStep('review');
        }
      }
    } catch (error) {
      console.error('Processing error:', error);
      // Fallback without AI
      setExtractedInfo({
        practitioner: {
          id: selectedPractitioner.id,
          name: `${selectedPractitioner.title} ${selectedPractitioner.firstName} ${selectedPractitioner.lastName}`,
          confidence: 1
        },
        topics: ['Visite standard'],
        sentiment: 'neutral',
        nextActions: [],
        keyPoints: [],
        productsDiscussed: [],
        competitorsMentioned: [],
        objections: [],
        opportunities: []
      });
      setEditedNotes(transcript);
      setStep('review');
    } finally {
      setIsProcessing(false);
    }
  };

  // Get store methods
  const { addVisitReport, addUserNote } = useUserDataStore();

  // Generate AI deductions for profile enrichment (before saving)
  const generateDeductions = () => {
    if (!selectedPractitioner || !extractedInfo) return;

    const deductions: AIDeduction[] = [];
    let id = 0;

    // Analyze extracted info to generate profile deductions
    extractedInfo.productsDiscussed.forEach(product => {
      deductions.push({
        id: `d-${id++}`,
        category: 'product_interest',
        label: `Intérêt pour ${product}`,
        detail: `Le praticien a discuté de ${product} lors de cette visite. Ajouter à ses centres d'intérêt produits.`,
        accepted: true,
      });
    });

    extractedInfo.competitorsMentioned.forEach(competitor => {
      deductions.push({
        id: `d-${id++}`,
        category: 'competitor',
        label: `${competitor} mentionné`,
        detail: `Le praticien utilise ou a mentionné ${competitor}. Veille concurrentielle activée.`,
        accepted: true,
      });
    });

    extractedInfo.objections.forEach(objection => {
      deductions.push({
        id: `d-${id++}`,
        category: 'objection',
        label: 'Frein identifié',
        detail: objection,
        accepted: true,
      });
    });

    extractedInfo.opportunities.forEach(opportunity => {
      deductions.push({
        id: `d-${id++}`,
        category: 'opportunity',
        label: 'Opportunité détectée',
        detail: opportunity,
        accepted: true,
      });
    });

    // Sentiment-based deduction
    if (extractedInfo.sentiment === 'positive') {
      deductions.push({
        id: `d-${id++}`,
        category: 'relationship',
        label: 'Relation positive',
        detail: `Le sentiment global est positif. Le praticien est réceptif — bon moment pour proposer des services additionnels ou une montée en gamme.`,
        accepted: true,
      });
    } else if (extractedInfo.sentiment === 'negative') {
      deductions.push({
        id: `d-${id++}`,
        category: 'relationship',
        label: 'Alerte insatisfaction',
        detail: `Le sentiment global est négatif. Mettre en place un suivi renforcé et identifier les causes d'insatisfaction. Risque de churn potentiel.`,
        accepted: true,
      });
    }

    // Action-based deductions
    if (extractedInfo.nextActions.length > 0) {
      deductions.push({
        id: `d-${id++}`,
        category: 'preference',
        label: `${extractedInfo.nextActions.length} action(s) à planifier`,
        detail: `Actions identifiées : ${extractedInfo.nextActions.join(' | ')}. Ces actions seront ajoutées au suivi du praticien.`,
        accepted: true,
      });
    }

    setAiDeductions(deductions);
    setStep('ai_deductions');
  };

  // Final save with validated deductions
  const saveReportWithDeductions = () => {
    if (!selectedPractitioner || !extractedInfo) return;

    // Save the visit report to the persistent store
    const savedReport = addVisitReport({
      practitionerId: selectedPractitioner.id,
      practitionerName: `${selectedPractitioner.title} ${selectedPractitioner.firstName} ${selectedPractitioner.lastName}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      transcript: editedNotes,
      extractedInfo: {
        topics: extractedInfo.topics,
        sentiment: extractedInfo.sentiment,
        nextActions: extractedInfo.nextActions,
        keyPoints: extractedInfo.keyPoints,
        productsDiscussed: extractedInfo.productsDiscussed,
        competitorsMentioned: extractedInfo.competitorsMentioned,
        objections: extractedInfo.objections,
        opportunities: extractedInfo.opportunities
      }
    });

    // Filter only accepted deductions
    const accepted = aiDeductions.filter(d => d.accepted);

    // Save key points as observation notes
    if (extractedInfo.keyPoints.length > 0) {
      addUserNote({
        practitionerId: selectedPractitioner.id,
        content: `Points clés de la visite du ${new Date().toLocaleDateString('fr-FR')}:\n${extractedInfo.keyPoints.map(p => `• ${p}`).join('\n')}`,
        type: 'observation'
      });
    }

    // Save accepted opportunity deductions
    const acceptedOpportunities = accepted.filter(d => d.category === 'opportunity');
    if (acceptedOpportunities.length > 0) {
      addUserNote({
        practitionerId: selectedPractitioner.id,
        content: `Opportunités validées le ${new Date().toLocaleDateString('fr-FR')}:\n${acceptedOpportunities.map(o => `• ${o.detail}`).join('\n')}`,
        type: 'strategy'
      });
    }

    // Save accepted competitor intelligence
    const acceptedCompetitors = accepted.filter(d => d.category === 'competitor');
    if (acceptedCompetitors.length > 0) {
      addUserNote({
        practitionerId: selectedPractitioner.id,
        content: `Intelligence concurrentielle du ${new Date().toLocaleDateString('fr-FR')}:\n${acceptedCompetitors.map(c => `• ${c.detail}`).join('\n')}`,
        type: 'competitive'
      });
    }

    // Save relationship alerts
    const relationshipAlerts = accepted.filter(d => d.category === 'relationship' && d.label.includes('Alerte'));
    if (relationshipAlerts.length > 0) {
      addUserNote({
        practitionerId: selectedPractitioner.id,
        content: `Alerte relationnelle du ${new Date().toLocaleDateString('fr-FR')}:\n${relationshipAlerts.map(r => `• ${r.detail}`).join('\n')}`,
        type: 'observation'
      });
    }

    console.log('Saved report to store:', savedReport.id, `(${accepted.length} deductions accepted)`);
    setIsSaved(true);
    setStep('saved');
  };

  // Render based on step
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            {t('voiceReport.title')}
          </span>
        </h1>
        <p className="text-slate-600">
          {t('voiceReport.subtitle')}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[t('voiceReport.steps.select'), t('voiceReport.steps.record'), t('voiceReport.steps.verify'), t('voiceReport.steps.aiDeductions'), t('voiceReport.steps.done')].map((label, i) => {
            const stepIndex = ['select', 'record', 'review', 'ai_deductions', 'saved'].indexOf(step);
            const isActive = i === stepIndex;
            const isCompleted = i < stepIndex;

            return (
              <div key={label} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-medium text-sm transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-100'
                    : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                }`}>
                  {isCompleted ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`ml-2 text-sm font-medium hidden sm:inline ${
                  isActive ? 'text-emerald-600' : isCompleted ? 'text-slate-600' : 'text-slate-400'
                }`}>
                  {label}
                </span>
                {i < 4 && (
                  <div className={`flex-1 h-1 mx-2 rounded ${
                    isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Select Practitioner */}
        {step === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Today's visits */}
            {todayVisits.length > 0 && (
              <div className="glass-card p-6">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-500" />
                  {t('voiceReport.todayVisits')}
                </h3>
                <div className="grid gap-3">
                  {todayVisits.map(visit => (
                    <button
                      key={visit.id}
                      onClick={() => {
                        const p = DataService.getPractitionerById(visit.practitionerId);
                        if (p) {
                          setSelectedPractitioner(p);
                          setStep('record');
                        }
                      }}
                      className="flex items-center gap-4 p-4 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors text-left border border-emerald-200"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                        {visit.practitioner.firstName[0]}{visit.practitioner.lastName[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800">
                          {visit.practitioner.title} {visit.practitioner.firstName} {visit.practitioner.lastName}
                        </p>
                        <p className="text-sm text-slate-500">
                          {visit.time} • {visit.practitioner.specialty}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-emerald-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search */}
            <div className="glass-card p-6">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-al-blue-500" />
                {t('voiceReport.searchPractitioner')}
              </h3>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('voiceReport.searchPlaceholder')}
                className="input-field w-full mb-4"
              />

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPractitioner(p);
                        setStep('record');
                      }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                        {p.firstName[0]}{p.lastName[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">
                          {p.title} {p.firstName} {p.lastName}
                          {p.metrics.isKOL && (
                            <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">KOL</span>
                          )}
                        </p>
                        <p className="text-sm text-slate-500">{p.specialty} • {p.address.city}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 2: Record */}
        {step === 'record' && selectedPractitioner && (
          <motion.div
            key="record"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Practitioner Card */}
            <div className="glass-card p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-al-blue-500 to-al-blue-600 flex items-center justify-center text-white font-bold">
                {selectedPractitioner.firstName[0]}{selectedPractitioner.lastName[0]}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800">
                  {selectedPractitioner.title} {selectedPractitioner.firstName} {selectedPractitioner.lastName}
                </p>
                <p className="text-sm text-slate-500">
                  {selectedPractitioner.specialty} • {selectedPractitioner.address.city}
                </p>
              </div>
              <button
                onClick={() => { setSelectedPractitioner(null); setStep('select'); }}
                className="text-sm text-al-blue-600 hover:text-al-blue-700"
              >
                Changer
              </button>
            </div>

            {/* Input Area - Voice OR Text */}
            <div className="glass-card p-6">
              <h3 className="font-semibold text-slate-800 mb-4 text-center">
                {t('voiceReport.howToInput')}
              </h3>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {/* Voice Option */}
                <div className="p-4 border-2 border-slate-200 rounded-xl hover:border-emerald-300 transition-colors">
                  <div className="text-center">
                    <motion.button
                      onClick={toggleRecording}
                      whileTap={{ scale: 0.95 }}
                      className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center transition-all shadow-lg ${
                        isRecording
                          ? 'bg-gradient-to-br from-red-500 to-rose-500 shadow-red-500/30'
                          : 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30 hover:shadow-emerald-500/40'
                      }`}
                    >
                      {isRecording ? (
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                        >
                          <MicOff className="w-8 h-8 text-white" />
                        </motion.div>
                      ) : (
                        <Mic className="w-8 h-8 text-white" />
                      )}
                    </motion.button>

                    <p className={`mt-3 font-medium text-sm ${isRecording ? 'text-red-600' : 'text-slate-600'}`}>
                      {isRecording ? t('voiceReport.recording') : t('voiceReport.dictate')}
                    </p>
                  </div>
                </div>

                {/* Text Option */}
                <div className="p-4 border-2 border-slate-200 rounded-xl">
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Ou tapez directement votre compte-rendu ici...

Ex: Visite très positive, le Dr a montré un vif intérêt pour la VNI. Il a mentionné avoir 3 patients candidats. Prochaine étape: envoyer la documentation technique."
                    className="w-full h-32 p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    disabled={isRecording}
                  />
                </div>
              </div>

              {/* Live transcription display when recording */}
              {(isRecording || transcript) && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    {isRecording && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                    {isRecording ? t('voiceReport.transcriptionInProgress') : t('voiceReport.yourReport')}
                  </label>
                  <div className="bg-slate-50 rounded-xl p-4 max-h-48 overflow-y-auto min-h-[80px]">
                    <p className="text-slate-700 whitespace-pre-wrap">{transcript}</p>
                    {isRecording && interimTranscriptRef.current && (
                      <span className="text-slate-400 italic">{interimTranscriptRef.current}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setTranscript(''); }}
                  disabled={!transcript || isRecording}
                  className="btn-secondary flex-1 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('voiceReport.clearText')}
                </button>
                <button
                  onClick={processTranscript}
                  disabled={!transcript || isRecording || isProcessing}
                  className="btn-primary flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyse...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {t('voiceReport.analyzeWithAI')}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
              <p className="text-sm font-medium text-emerald-800 mb-2">{t('voiceReport.tips.title')}</p>
              <ul className="text-sm text-emerald-700 space-y-1">
                <li>• {t('voiceReport.tips.products')}</li>
                <li>• {t('voiceReport.tips.reactions')}</li>
                <li>• {t('voiceReport.tips.competitors')}</li>
                <li>• {t('voiceReport.tips.actions')}</li>
              </ul>
            </div>
          </motion.div>
        )}

        {/* Step 3: Review & Validate AI Extraction */}
        {step === 'review' && selectedPractitioner && extractedInfo && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* AI Validation Banner */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-800">{t('voiceReport.aiAnalysis')}</p>
                  <p className="text-sm text-amber-700 mt-1">
                    {t('voiceReport.aiAnalysisDesc')}
                  </p>
                </div>
              </div>
            </div>

            {/* Practitioner + Date + Sentiment */}
            <div className="glass-card p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-al-blue-500 to-al-blue-600 flex items-center justify-center text-white font-bold">
                {selectedPractitioner.firstName[0]}{selectedPractitioner.lastName[0]}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800">
                  {selectedPractitioner.title} {selectedPractitioner.firstName} {selectedPractitioner.lastName}
                </p>
                <p className="text-sm text-slate-500 flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  <Clock className="w-3 h-3 ml-2" />
                  {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {/* Editable Sentiment */}
              <div className="flex gap-1">
                {(['positive', 'neutral', 'negative'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setExtractedInfo({ ...extractedInfo, sentiment: s })}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition-all ${
                      extractedInfo.sentiment === s
                        ? s === 'positive' ? 'bg-green-100 text-green-700 ring-2 ring-green-300'
                          : s === 'negative' ? 'bg-red-100 text-red-700 ring-2 ring-red-300'
                          : 'bg-slate-100 text-slate-700 ring-2 ring-slate-300'
                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {s === 'positive' ? <ThumbsUp className="w-3 h-3" /> :
                     s === 'negative' ? <ThumbsDown className="w-3 h-3" /> :
                     <MessageSquare className="w-3 h-3" />}
                    {s === 'positive' ? t('common.sentiment.positive') : s === 'negative' ? t('common.sentiment.negative') : t('common.sentiment.neutral')}
                  </button>
                ))}
              </div>
            </div>

            {/* Editable Extracted Info Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Editable Tags Section */}
              <EditableTagsSection
                title={t('voiceReport.topicsDiscussed')}
                items={extractedInfo.topics}
                onChange={(items) => setExtractedInfo({ ...extractedInfo, topics: items })}
                icon={<Tag className="w-4 h-4 text-blue-500" />}
                color="blue"
                placeholder="Ajouter un sujet..."
              />

              <EditableTagsSection
                title={t('voiceReport.productsDiscussed')}
                items={extractedInfo.productsDiscussed}
                onChange={(items) => setExtractedInfo({ ...extractedInfo, productsDiscussed: items })}
                icon={<FileText className="w-4 h-4 text-emerald-500" />}
                color="emerald"
                placeholder="Ajouter un produit..."
                suggestions={['VitalAire Confort+', 'Télésuivi O2', 'VNI DreamStation', 'FreeStyle Comfort', 'PPC ResMed', 'O2 liquide portable', 'Service 24/7', 'Formation patient']}
              />

              <EditableListSection
                title={t('voiceReport.nextActions')}
                items={extractedInfo.nextActions}
                onChange={(items) => setExtractedInfo({ ...extractedInfo, nextActions: items })}
                icon={<Target className="w-4 h-4 text-purple-500" />}
                color="purple"
                placeholder="Ajouter une action..."
              />

              <EditableListSection
                title={t('voiceReport.opportunitiesDetected')}
                items={extractedInfo.opportunities}
                onChange={(items) => setExtractedInfo({ ...extractedInfo, opportunities: items })}
                icon={<TrendingUp className="w-4 h-4 text-amber-500" />}
                color="amber"
                placeholder="Ajouter une opportunité..."
              />

              <EditableListSection
                title={t('voiceReport.objectionsBarriers')}
                items={extractedInfo.objections}
                onChange={(items) => setExtractedInfo({ ...extractedInfo, objections: items })}
                icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
                color="red"
                placeholder="Ajouter une objection..."
              />

              <EditableListSection
                title={t('voiceReport.keyPoints')}
                items={extractedInfo.keyPoints}
                onChange={(items) => setExtractedInfo({ ...extractedInfo, keyPoints: items })}
                icon={<Check className="w-4 h-4 text-green-500" />}
                color="green"
                placeholder="Ajouter un point clé..."
              />

              <EditableTagsSection
                title={t('voiceReport.competitorsMentioned')}
                items={extractedInfo.competitorsMentioned}
                onChange={(items) => setExtractedInfo({ ...extractedInfo, competitorsMentioned: items })}
                icon={<AlertCircle className="w-4 h-4 text-orange-500" />}
                color="orange"
                placeholder="Ajouter un concurrent..."
                suggestions={['Vivisol', 'Linde Healthcare', 'SOS Oxygène', 'Bastide Médical', 'France Oxygène']}
              />
            </div>

            {/* Editable Notes */}
            <div className="glass-card p-4">
              <label className="block font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                Transcription (modifiable)
              </label>
              <textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                rows={4}
                className="input-field w-full resize-none"
              />
            </div>

            {/* Integration Preview */}
            <div className="glass-card p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
              <h4 className="font-medium text-emerald-800 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {t('voiceReport.integrationPreview', { name: `${selectedPractitioner.title} ${selectedPractitioner.lastName}` })}
              </h4>
              <ul className="text-sm text-emerald-700 space-y-1">
                <li>• Compte-rendu de visite avec transcription complète</li>
                {extractedInfo.keyPoints.length > 0 && <li>• {extractedInfo.keyPoints.length} point(s) clé(s) → Note d'observation</li>}
                {extractedInfo.opportunities.length > 0 && <li>• {extractedInfo.opportunities.length} opportunité(s) → Note stratégique</li>}
                {extractedInfo.competitorsMentioned.length > 0 && <li>• Intelligence concurrentielle ({extractedInfo.competitorsMentioned.join(', ')}) → Note concurrence</li>}
                {extractedInfo.nextActions.length > 0 && <li>• {extractedInfo.nextActions.length} action(s) à suivre</li>}
                <li>• Données accessibles par le Coach IA pour répondre à vos questions</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep('record')}
                className="btn-secondary flex-1"
              >
                {t('common.back')}
              </button>
              <button
                onClick={generateDeductions}
                className="btn-primary flex-1 bg-gradient-to-r from-emerald-500 to-teal-500"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {t('voiceReport.analyzeWithAI')}
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: AI Deductions — User validates what gets saved to the profile */}
        {step === 'ai_deductions' && selectedPractitioner && extractedInfo && (
          <motion.div
            key="ai_deductions"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* AI Deductions Header */}
            <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-violet-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-violet-800">{t('voiceReport.aiDeductionsTitle')}</p>
                  <p className="text-sm text-violet-700 mt-1">
                    {t('voiceReport.aiDeductionsDesc')}
                  </p>
                </div>
              </div>
            </div>

            {/* Deductions List */}
            {aiDeductions.length > 0 ? (
              <div className="space-y-3">
                {aiDeductions.map((deduction) => {
                  const categoryConfig = {
                    product_interest: { icon: <Tag className="w-4 h-4 text-blue-500" />, bg: 'bg-blue-50', border: 'border-blue-200', label: 'Intérêt produit' },
                    competitor: { icon: <AlertCircle className="w-4 h-4 text-orange-500" />, bg: 'bg-orange-50', border: 'border-orange-200', label: 'Concurrence' },
                    objection: { icon: <AlertTriangle className="w-4 h-4 text-red-500" />, bg: 'bg-red-50', border: 'border-red-200', label: 'Objection' },
                    opportunity: { icon: <TrendingUp className="w-4 h-4 text-emerald-500" />, bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Opportunité' },
                    relationship: { icon: <MessageSquare className="w-4 h-4 text-purple-500" />, bg: 'bg-purple-50', border: 'border-purple-200', label: 'Relation' },
                    preference: { icon: <Target className="w-4 h-4 text-indigo-500" />, bg: 'bg-indigo-50', border: 'border-indigo-200', label: 'Préférence' },
                  };
                  const config = categoryConfig[deduction.category];

                  return (
                    <motion.div
                      key={deduction.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`glass-card p-4 ${config.border} ${deduction.accepted ? config.bg : 'bg-slate-50 opacity-60'} transition-all`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-white/70 text-slate-600">{config.label}</span>
                            <span className="font-medium text-sm text-slate-800">{deduction.label}</span>
                          </div>
                          <p className="text-sm text-slate-600">{deduction.detail}</p>
                        </div>
                        <button
                          onClick={() => {
                            setAiDeductions(prev => prev.map(d =>
                              d.id === deduction.id ? { ...d, accepted: !d.accepted } : d
                            ));
                          }}
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            deduction.accepted
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : 'bg-slate-200 text-slate-400 hover:bg-slate-300'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-card p-6 text-center text-slate-500">
                Aucune déduction IA disponible pour ce compte-rendu.
              </div>
            )}

            {/* Summary of what will be saved */}
            <div className="glass-card p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
              <h4 className="font-medium text-emerald-800 mb-2 flex items-center gap-2">
                <Check className="w-4 h-4" />
                {t('voiceReport.validatedEnrichments')}
              </h4>
              <p className="text-sm text-emerald-700">
                {aiDeductions.filter(d => d.accepted).length} déduction(s) sur {aiDeductions.length} seront intégrées à la fiche de{' '}
                {selectedPractitioner.title} {selectedPractitioner.lastName}.
                Le compte-rendu complet et les notes IA seront également sauvegardés.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep('review')}
                className="btn-secondary flex-1"
              >
                {t('common.back')}
              </button>
              <button
                onClick={() => {
                  setAiDeductions(prev => prev.map(d => ({ ...d, accepted: true })));
                }}
                className="btn-secondary"
              >
                {t('voiceReport.acceptAll')}
              </button>
              <button
                onClick={saveReportWithDeductions}
                className="btn-primary flex-1 bg-gradient-to-r from-emerald-500 to-teal-500"
              >
                <Check className="w-4 h-4 mr-2" />
                {t('voiceReport.validateAndSave', { count: String(aiDeductions.filter(d => d.accepted).length) })}
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 5: Saved */}
        {step === 'saved' && selectedPractitioner && (
          <motion.div
            key="saved"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10 }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/30 mb-6"
            >
              <Check className="w-10 h-10 text-white" />
            </motion.div>

            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {t('voiceReport.reportSaved')}
            </h2>
            <p className="text-slate-600 mb-8">
              {t('voiceReport.profileEnriched', { name: `${selectedPractitioner.title} ${selectedPractitioner.lastName}` })}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate(`/practitioner/${selectedPractitioner.id}`)}
                className="btn-primary bg-gradient-to-r from-emerald-500 to-teal-500"
              >
                {t('voiceReport.seeProfile')}
              </button>
              <button
                onClick={() => {
                  setSelectedPractitioner(null);
                  setTranscript('');
                  setExtractedInfo(null);
                  setStep('select');
                }}
                className="btn-secondary"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('voiceReport.newReport')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Editable Tag Section (for topics, products, competitors)
// ═══════════════════════════════════════════════════════════
function EditableTagsSection({
  title, items, onChange, icon, color, placeholder, suggestions = []
}: {
  title: string;
  items: string[];
  onChange: (items: string[]) => void;
  icon: React.ReactNode;
  color: string;
  placeholder: string;
  suggestions?: string[];
}) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addItem = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const filteredSuggestions = suggestions.filter(
    s => !items.includes(s) && s.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className="glass-card p-4">
      <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
        {icon}
        {title}
        <span className="text-xs text-slate-400 ml-auto">{items.length}</span>
      </h4>
      <div className="flex flex-wrap gap-2 mb-2">
        {items.map((item, i) => (
          <span key={i} className={`px-2 py-1 bg-${color}-100 text-${color}-700 rounded-full text-sm flex items-center gap-1 group`}>
            {item}
            <button
              onClick={() => removeItem(i)}
              className={`w-4 h-4 rounded-full bg-${color}-200 hover:bg-${color}-300 flex items-center justify-center text-${color}-600 opacity-60 hover:opacity-100 transition-opacity`}
            >
              <span className="text-xs leading-none">&times;</span>
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(inputValue); } }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-32 overflow-y-auto">
            {filteredSuggestions.map((s, i) => (
              <button
                key={i}
                onMouseDown={(e) => { e.preventDefault(); addItem(s); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Editable List Section (for actions, key points, etc.)
// ═══════════════════════════════════════════════════════════
function EditableListSection({
  title, items, onChange, icon, color, placeholder
}: {
  title: string;
  items: string[];
  onChange: (items: string[]) => void;
  icon: React.ReactNode;
  color: string;
  placeholder: string;
}) {
  const [inputValue, setInputValue] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const addItem = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      onChange([...items, trimmed]);
      setInputValue('');
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(items[index]);
  };

  const saveEdit = () => {
    if (editingIndex !== null && editValue.trim()) {
      const newItems = [...items];
      newItems[editingIndex] = editValue.trim();
      onChange(newItems);
    }
    setEditingIndex(null);
    setEditValue('');
  };

  return (
    <div className="glass-card p-4">
      <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
        {icon}
        {title}
        <span className="text-xs text-slate-400 ml-auto">{items.length}</span>
      </h4>
      <ul className="space-y-2 mb-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-600 group">
            {editingIndex === i ? (
              <div className="flex-1 flex gap-1">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingIndex(null); }}
                  className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
                <button onClick={saveEdit} className="px-2 py-1 bg-emerald-500 text-white rounded text-xs">OK</button>
              </div>
            ) : (
              <>
                <ChevronRight className={`w-4 h-4 text-${color}-400 mt-0.5 flex-shrink-0`} />
                <span
                  className="flex-1 cursor-pointer hover:text-slate-800"
                  onClick={() => startEdit(i)}
                  title="Cliquer pour modifier"
                >
                  {item}
                </span>
                <button
                  onClick={() => removeItem(i)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="flex gap-1">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
          placeholder={placeholder}
          className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          onClick={addItem}
          disabled={!inputValue.trim()}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
