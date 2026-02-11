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

    // If there are key points, save them as strategic notes
    if (extractedInfo.keyPoints.length > 0) {
      addUserNote({
        practitionerId: selectedPractitioner.id,
        content: `Points clés de la visite du ${new Date().toLocaleDateString('fr-FR')}:\n${extractedInfo.keyPoints.map(p => `• ${p}`).join('\n')}`,
        type: 'observation'
      });
    }

    // If there are opportunities, save them as strategy notes
    if (extractedInfo.opportunities.length > 0) {
      addUserNote({
        practitionerId: selectedPractitioner.id,
        content: `Opportunités détectées le ${new Date().toLocaleDateString('fr-FR')}:\n${extractedInfo.opportunities.map(o => `• ${o}`).join('\n')}`,
        type: 'strategy'
      });
    }

    // If competitors were mentioned, save as competitive intelligence
    if (extractedInfo.competitorsMentioned.length > 0) {
      addUserNote({
        practitionerId: selectedPractitioner.id,
        content: `Intelligence concurrentielle du ${new Date().toLocaleDateString('fr-FR')}:\nConcurrents mentionnés: ${extractedInfo.competitorsMentioned.join(', ')}`,
        type: 'competitive'
      });
    }

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
                      {isRecording ? 'Enregistrement...' : 'Dicter'}
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
                  <p className="font-semibold text-amber-800">Analyse IA — Validation requise</p>
                  <p className="text-sm text-amber-700 mt-1">
                    ARIA a analysé votre compte-rendu et extrait les informations ci-dessous.
                    Vérifiez, modifiez ou complétez avant de sauvegarder dans la fiche du praticien.
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
                    {s === 'positive' ? 'Positif' : s === 'negative' ? 'Négatif' : 'Neutre'}
                  </button>
                ))}
              </div>
            </div>

            {/* Editable Extracted Info Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Editable Tags Section */}
              <EditableTagsSection
                title="Sujets abordés"
                items={extractedInfo.topics}
                onChange={(items) => setExtractedInfo({ ...extractedInfo, topics: items })}
                icon={<Tag className="w-4 h-4 text-blue-500" />}
                color="blue"
                placeholder="Ajouter un sujet..."
              />

              <EditableTagsSection
                title="Produits discutés"
                items={extractedInfo.productsDiscussed}
                onChange={(items) => setExtractedInfo({ ...extractedInfo, productsDiscussed: items })}
                icon={<FileText className="w-4 h-4 text-emerald-500" />}
                color="emerald"
                placeholder="Ajouter un produit..."
                suggestions={['VitalAire Confort+', 'Télésuivi O2', 'VNI DreamStation', 'FreeStyle Comfort', 'PPC ResMed', 'O2 liquide portable', 'Service 24/7', 'Formation patient']}
              />

              <EditableListSection
                title="Prochaines actions"
                items={extractedInfo.nextActions}
                onChange={(items) => setExtractedInfo({ ...extractedInfo, nextActions: items })}
                icon={<Target className="w-4 h-4 text-purple-500" />}
                color="purple"
                placeholder="Ajouter une action..."
              />

              <EditableListSection
                title="Opportunités détectées"
                items={extractedInfo.opportunities}
                onChange={(items) => setExtractedInfo({ ...extractedInfo, opportunities: items })}
                icon={<TrendingUp className="w-4 h-4 text-amber-500" />}
                color="amber"
                placeholder="Ajouter une opportunité..."
              />

              <EditableListSection
                title="Objections / Freins"
                items={extractedInfo.objections}
                onChange={(items) => setExtractedInfo({ ...extractedInfo, objections: items })}
                icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
                color="red"
                placeholder="Ajouter une objection..."
              />

              <EditableListSection
                title="Points clés"
                items={extractedInfo.keyPoints}
                onChange={(items) => setExtractedInfo({ ...extractedInfo, keyPoints: items })}
                icon={<Check className="w-4 h-4 text-green-500" />}
                color="green"
                placeholder="Ajouter un point clé..."
              />

              <EditableTagsSection
                title="Concurrents mentionnés"
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
                Ce qui sera intégré à la fiche de {selectedPractitioner.title} {selectedPractitioner.lastName}
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
                Retour
              </button>
              <button
                onClick={saveReport}
                className="btn-primary flex-1 bg-gradient-to-r from-emerald-500 to-teal-500"
              >
                <Check className="w-4 h-4 mr-2" />
                Valider et sauvegarder
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
