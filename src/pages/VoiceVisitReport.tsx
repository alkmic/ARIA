import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Save,
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
  FileText,
  Eye
} from 'lucide-react';
import { useGroq } from '../hooks/useGroq';
import { quickSearch } from '../services/universalSearch';
import { DataService } from '../services/dataService';
import { useAppStore } from '../stores/useAppStore';
import { useUserDataStore } from '../stores/useUserDataStore';
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

// Catégories de mises à jour proposées par l'IA
interface ProposedProfileUpdate {
  category: 'observation' | 'strategy' | 'competitive' | 'reminder';
  title: string;
  content: string;
  enabled: boolean; // L'utilisateur peut désactiver
}

export default function VoiceVisitReport() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { complete } = useGroq();
  const { upcomingVisits } = useAppStore();

  // State
  const [step, setStep] = useState<'select' | 'record' | 'review' | 'saved'>('select');
  const [selectedPractitioner, setSelectedPractitioner] = useState<PractitionerProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState<ExtractedInfo | null>(null);
  const [editedNotes, setEditedNotes] = useState('');
  const [_isSaved, setIsSaved] = useState(false);
  const [proposedUpdates, setProposedUpdates] = useState<ProposedProfileUpdate[]>([]);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const interimTranscriptRef = useRef('');

  // Auto-select from URL param or today's visit
  useEffect(() => {
    const practitionerId = searchParams.get('practitionerId') || searchParams.get('practitioner');
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
      setSpeechError('La reconnaissance vocale n\'est pas supportée. Utilisez Chrome ou Edge.');
      return;
    }
    setSpeechError(null);

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
            // Generate proposed profile updates from extracted data
            const updates: ProposedProfileUpdate[] = [];
            const parsed2 = parsed;

            if (parsed2.keyPoints?.length > 0) {
              updates.push({
                category: 'observation',
                title: 'Points clés de la visite',
                content: `Visite du ${new Date().toLocaleDateString('fr-FR')} :\n${parsed2.keyPoints.map((p: string) => `• ${p}`).join('\n')}`,
                enabled: true,
              });
            }
            if (parsed2.opportunities?.length > 0) {
              updates.push({
                category: 'strategy',
                title: 'Opportunités détectées',
                content: `Opportunités identifiées le ${new Date().toLocaleDateString('fr-FR')} :\n${parsed2.opportunities.map((o: string) => `• ${o}`).join('\n')}`,
                enabled: true,
              });
            }
            if (parsed2.competitorsMentioned?.length > 0) {
              updates.push({
                category: 'competitive',
                title: 'Intelligence concurrentielle',
                content: `Concurrents mentionnés le ${new Date().toLocaleDateString('fr-FR')} : ${parsed2.competitorsMentioned.join(', ')}.\n${parsed2.objections?.length > 0 ? `Objections exprimées : ${parsed2.objections.join('; ')}` : ''}`,
                enabled: true,
              });
            }
            if (parsed2.nextActions?.length > 0) {
              updates.push({
                category: 'reminder',
                title: 'Actions de suivi',
                content: `Actions à mener suite à la visite du ${new Date().toLocaleDateString('fr-FR')} :\n${parsed2.nextActions.map((a: string) => `• ${a}`).join('\n')}`,
                enabled: true,
              });
            }

            setProposedUpdates(updates);
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

  // Save report - persist to store
  const saveReport = () => {
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

    // Save only the user-validated proposed updates
    proposedUpdates.filter(u => u.enabled).forEach(update => {
      addUserNote({
        practitionerId: selectedPractitioner.id,
        content: update.content,
        type: update.category,
      });
    });

    console.log('Saved report to store:', savedReport.id);
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
            Compte-Rendu de Visite
          </span>
        </h1>
        <p className="text-slate-600">
          Dictez ou tapez votre compte-rendu et ARIA extraira automatiquement les informations clés
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {['Sélectionner', 'Enregistrer', 'Vérifier', 'Terminé'].map((label, i) => {
            const stepIndex = ['select', 'record', 'review', 'saved'].indexOf(step);
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
                {i < 3 && (
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
                  Visites d'aujourd'hui
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
                Rechercher un praticien
              </h3>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nom du praticien ou ville..."
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
                Comment souhaitez-vous saisir votre compte-rendu ?
              </h3>

              <div className="grid md:grid-cols-2 gap-3 sm:gap-4 mb-6">
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
                      {isRecording ? 'Enregistrement...' : 'Dicter'}
                    </p>
                    {speechError && (
                      <p className="mt-2 text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded-lg">
                        {speechError}
                      </p>
                    )}
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
                    {isRecording ? 'Transcription en cours...' : 'Votre compte-rendu'}
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
                  Effacer
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
                      Analyser avec IA
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
              <p className="text-sm font-medium text-emerald-800 mb-2">Conseils pour un bon compte-rendu :</p>
              <ul className="text-sm text-emerald-700 space-y-1">
                <li>• Mentionnez les produits discutés (Oxygène, VNI, BPCO...)</li>
                <li>• Indiquez le sentiment général du praticien</li>
                <li>• Notez les objections ou freins exprimés</li>
                <li>• Précisez les prochaines actions à mener</li>
              </ul>
            </div>
          </motion.div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && selectedPractitioner && extractedInfo && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Practitioner + Date */}
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
              <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${
                extractedInfo.sentiment === 'positive'
                  ? 'bg-green-100 text-green-700'
                  : extractedInfo.sentiment === 'negative'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-slate-100 text-slate-700'
              }`}>
                {extractedInfo.sentiment === 'positive' ? <ThumbsUp className="w-3 h-3" /> :
                 extractedInfo.sentiment === 'negative' ? <ThumbsDown className="w-3 h-3" /> :
                 <MessageSquare className="w-3 h-3" />}
                {extractedInfo.sentiment === 'positive' ? 'Positif' :
                 extractedInfo.sentiment === 'negative' ? 'Négatif' : 'Neutre'}
              </div>
            </div>

            {/* Extracted Info Grid */}
            <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
              {/* Topics */}
              {extractedInfo.topics.length > 0 && (
                <div className="glass-card p-4">
                  <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-500" />
                    Sujets abordés
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {extractedInfo.topics.map((topic, i) => (
                      <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Products */}
              {extractedInfo.productsDiscussed.length > 0 && (
                <div className="glass-card p-4">
                  <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    Produits discutés
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {extractedInfo.productsDiscussed.map((product, i) => (
                      <span key={i} className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                        {product}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Actions */}
              {extractedInfo.nextActions.length > 0 && (
                <div className="glass-card p-4">
                  <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-al-blue-500" />
                    Prochaines actions
                  </h4>
                  <ul className="space-y-2">
                    {extractedInfo.nextActions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <ChevronRight className="w-4 h-4 text-al-blue-400 mt-0.5 flex-shrink-0" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Opportunities */}
              {extractedInfo.opportunities.length > 0 && (
                <div className="glass-card p-4">
                  <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                    Opportunités détectées
                  </h4>
                  <ul className="space-y-2">
                    {extractedInfo.opportunities.map((opp, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        {opp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Objections */}
              {extractedInfo.objections.length > 0 && (
                <div className="glass-card p-4">
                  <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    Objections / Freins
                  </h4>
                  <ul className="space-y-2">
                    {extractedInfo.objections.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Key Points */}
              {extractedInfo.keyPoints.length > 0 && (
                <div className="glass-card p-4">
                  <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-500" />
                    Points clés
                  </h4>
                  <ul className="space-y-2">
                    {extractedInfo.keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Proposed Profile Updates — user validates before saving */}
            {proposedUpdates.length > 0 && (
              <div className="glass-card p-4 border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-teal-50/50">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  Mises à jour proposées pour le profil
                  <span className="text-xs font-normal text-slate-500 ml-2">
                    Validez les éléments à enregistrer dans la fiche du praticien
                  </span>
                </h4>
                <div className="space-y-3">
                  {proposedUpdates.map((update, idx) => {
                    const categoryIcons = {
                      observation: { icon: Eye, color: 'text-blue-500', bg: 'bg-blue-100' },
                      strategy: { icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-100' },
                      competitive: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-100' },
                      reminder: { icon: Calendar, color: 'text-al-blue-500', bg: 'bg-al-blue-100' },
                    };
                    const config = categoryIcons[update.category];
                    const Icon = config.icon;

                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                          update.enabled
                            ? 'bg-white border-slate-200'
                            : 'bg-slate-50 border-slate-100 opacity-60'
                        }`}
                      >
                        <button
                          onClick={() => {
                            const newUpdates = [...proposedUpdates];
                            newUpdates[idx] = { ...newUpdates[idx], enabled: !newUpdates[idx].enabled };
                            setProposedUpdates(newUpdates);
                          }}
                          className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                            update.enabled
                              ? 'bg-emerald-500 text-white'
                              : 'border-2 border-slate-300'
                          }`}
                        >
                          {update.enabled && <Check className="w-3 h-3" />}
                        </button>
                        <div className={`p-1.5 rounded ${config.bg} flex-shrink-0`}>
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-slate-700">{update.title}</p>
                          <p className="text-xs text-slate-500 mt-1 whitespace-pre-line">{update.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Editable Notes */}
            <div className="glass-card p-4">
              <label className="block font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                Notes (modifiables)
              </label>
              <textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                rows={4}
                className="input-field w-full resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep('record')}
                className="btn-secondary flex-1"
              >
                Retour
              </button>
              <button
                onClick={saveReport}
                className="btn-primary flex-1 bg-gradient-to-r from-emerald-500 to-teal-500"
              >
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Saved */}
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
              Compte-rendu enregistré !
            </h2>
            <p className="text-slate-600 mb-8">
              Le profil de {selectedPractitioner.title} {selectedPractitioner.lastName} a été enrichi
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate(`/practitioner/${selectedPractitioner.id}`)}
                className="btn-primary bg-gradient-to-r from-emerald-500 to-teal-500"
              >
                Voir le profil
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
                Nouveau compte-rendu
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
