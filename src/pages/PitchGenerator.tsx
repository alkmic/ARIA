import { useState, useMemo } from 'react';
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
  Loader2,
  Search,
  Star,
  MapPin,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronRight,
  Clock,
  Target,
  Shield,
  Zap,
  Award,
  BookOpen
} from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { useGroq } from '../hooks/useGroq';
import { useSpeech } from '../hooks/useSpeech';
import { buildEnhancedSystemPrompt, buildEnhancedUserPrompt, buildEnhancedRegenerateSectionPrompt, generatePractitionerSummary } from '../services/pitchPromptsEnhanced';
import { DataService } from '../services/dataService';
import { quickSearch } from '../services/universalSearch';
import { SkeletonPitchSection } from '../components/ui/Skeleton';
import { MarkdownText } from '../components/ui/MarkdownText';
import type { PitchConfig, PitchSection } from '../types/pitch';
import type { Practitioner } from '../types';

// Couleurs et icones par section
const SECTION_STYLES: Record<string, { gradient: string; bg: string; icon: string; borderColor: string }> = {
  hook: { gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', icon: '1', borderColor: 'border-amber-200' },
  proposition: { gradient: 'from-al-blue-500 to-al-sky', bg: 'bg-al-blue-50', icon: '2', borderColor: 'border-al-blue-200' },
  competition: { gradient: 'from-al-blue-600 to-al-blue-500', bg: 'bg-al-blue-50', icon: '3', borderColor: 'border-al-blue-200' },
  cta: { gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-50', icon: '4', borderColor: 'border-green-200' },
  objections: { gradient: 'from-red-500 to-rose-500', bg: 'bg-red-50', icon: '5', borderColor: 'border-red-200' },
  talking_points: { gradient: 'from-al-navy to-al-blue-600', bg: 'bg-al-blue-50', icon: '6', borderColor: 'border-al-blue-200' },
};

// Produits Air Liquide disponibles
const PRODUCTS = [
  { id: 'vitalaire', name: 'VitalAire Confort+', description: 'Concentrateur haut de gamme' },
  { id: 'telesuivi', name: 'Télésuivi O2', description: 'Suivi à distance connecté' },
  { id: 'extracteur', name: 'Station extracteur', description: 'Solution fixe performante' },
  { id: 'portable', name: 'O2 liquide portable', description: 'Mobilité maximale' },
  { id: 'service247', name: 'Service 24/7', description: 'Assistance permanente' },
  { id: 'formation', name: 'Formation patients', description: 'Éducation thérapeutique' },
];

// Concurrents identifiés
const COMPETITORS = [
  { id: 'vivisol', name: 'Vivisol' },
  { id: 'linde', name: 'Linde Healthcare' },
  { id: 'sos', name: 'SOS Oxygène' },
  { id: 'bastide', name: 'Bastide Medical' },
  { id: 'other', name: 'Autres' },
];

// Options de focus
const FOCUS_OPTIONS = [
  { id: 'general', label: 'Général', icon: Target, description: 'Approche équilibrée' },
  { id: 'service', label: 'Service', icon: Shield, description: 'Qualité et disponibilité' },
  { id: 'innovation', label: 'Innovation', icon: Zap, description: 'Solutions connectées' },
  { id: 'price', label: 'Prix', icon: TrendingDown, description: 'Rapport qualité-prix' },
  { id: 'loyalty', label: 'Fidélité', icon: Award, description: 'Partenariat long terme' },
];

export function PitchGenerator() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const practitioners = useAppStore((state) => state.practitioners);

  const practitionerId = searchParams.get('practitionerId');
  const practitioner = practitioners.find((p) => p.id === practitionerId);

  // Etape du wizard
  const [step, setStep] = useState<'select' | 'preview' | 'configure' | 'generate'>(!practitioner ? 'select' : 'preview');

  // Recherche de praticien
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
  const [filterKOL, setFilterKOL] = useState<boolean | null>(null);
  const [selectedPractitioner, setSelectedPractitioner] = useState<Practitioner | null>(practitioner || null);

  // Configuration du pitch
  const [config, setConfig] = useState<PitchConfig>({
    length: 'medium',
    tone: 'conversational',
    products: ['VitalAire Confort+', 'Telesuivi O2'],
    competitors: [],
    additionalInstructions: '',
    includeObjections: true,
    includeTalkingPoints: true,
    focusArea: 'general',
  });

  // Etats de generation
  const [sections, setSections] = useState<PitchSection[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [copied, setCopied] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editInstruction, setEditInstruction] = useState('');

  // Previsualisation praticien (kept for future use)
  const [, setPractitionerSummary] = useState<string>('');

  // Hooks IA et Speech
  const { streamCompletion, complete, isLoading: groqLoading } = useGroq({
    temperature: 0.8,
    maxTokens: 3000,
  });
  const { speak, pause, resume, stop, isSpeaking, isPaused, isSupported: speechSupported } = useSpeech();

  // Filtrage des praticiens
  const filteredPractitioners = useMemo(() => {
    // Si recherche active, utiliser quickSearch
    if (searchQuery.length >= 2) {
      const searchResults = quickSearch(searchQuery, 20);
      return searchResults.map(p => ({
        ...practitioners.find(pr => pr.id === p.id)!
      })).filter(Boolean);
    }

    let filtered = [...practitioners];

    if (filterSpecialty !== 'all') {
      filtered = filtered.filter(p => p.specialty === filterSpecialty);
    }

    if (filterKOL !== null) {
      filtered = filtered.filter(p => p.isKOL === filterKOL);
    }

    // Trier par volume par defaut
    return filtered.sort((a, b) => b.volumeL - a.volumeL).slice(0, 30);
  }, [practitioners, searchQuery, filterSpecialty, filterKOL]);

  // Selectionner un praticien
  const handleSelectPractitioner = (p: Practitioner) => {
    setSelectedPractitioner(p);
    navigate(`/pitch?practitionerId=${p.id}`, { replace: true });

    // Generer le resume
    const summary = generatePractitionerSummary(p.id);
    setPractitionerSummary(summary);
    setStep('preview');
  };

  // Parser le texte streame en sections
  const parsePitchSections = (text: string): PitchSection[] => {
    const sectionRegex = /\[([A-Z_]+)\]\s*\n([\s\S]*?)(?=\n\[|$)/g;
    const parsed: PitchSection[] = [];
    let match;

    const sectionMap: Record<string, { id: PitchSection['id']; title: string; icon: string }> = {
      ACCROCHE: { id: 'hook', title: 'Accroche', icon: '1' },
      PROPOSITION: { id: 'proposition', title: 'Proposition de valeur', icon: '2' },
      CONCURRENCE: { id: 'competition', title: 'Différenciation', icon: '3' },
      CALL_TO_ACTION: { id: 'cta', title: 'Call to Action', icon: '4' },
      OBJECTIONS: { id: 'objections', title: 'Gestion des objections', icon: '5' },
      TALKING_POINTS: { id: 'talking_points', title: 'Points de discussion', icon: '6' },
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

  // Generer le pitch complet
  const generatePitch = async () => {
    if (!selectedPractitioner) return;

    setIsGenerating(true);
    setStreamedText('');
    setSections([]);
    setStep('generate');

    const systemPrompt = buildEnhancedSystemPrompt(config);
    const userPrompt = buildEnhancedUserPrompt(selectedPractitioner, config);

    await streamCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      (chunk) => {
        setStreamedText((prev) => {
          const newText = prev + chunk;
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

  // Regenerer une section specifique
  const regenerateSection = async (sectionId: string) => {
    if (!selectedPractitioner) return;

    const section = sections.find((s) => s.id === sectionId);
    if (!section || !editInstruction.trim()) return;

    setEditingSection(sectionId);

    const systemPrompt = buildEnhancedSystemPrompt(config);
    const regeneratePrompt = buildEnhancedRegenerateSectionPrompt(
      sectionId,
      section.content,
      editInstruction,
      streamedText,
      selectedPractitioner
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

  // Lire le pitch a voix haute
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

  // Etape 1: Selection du praticien
  if (step === 'select') {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-al-blue-500 to-al-sky flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="bg-gradient-to-r from-al-blue-600 to-al-navy bg-clip-text text-transparent">
                  Générateur de Pitch IA
                </span>
              </h1>
              <p className="text-slate-600 mt-1">Sélectionnez un praticien pour générer un pitch personnalisé</p>
            </div>
          </div>

          {/* Filtres et recherche */}
          <div className="glass-card p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-0 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher par nom, ville..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-al-blue-500"
                  />
                </div>
              </div>

              <select
                value={filterSpecialty}
                onChange={(e) => setFilterSpecialty(e.target.value)}
                className="px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-al-blue-500"
              >
                <option value="all">Toutes spécialités</option>
                <option value="Pneumologue">Pneumologues</option>
                <option value="Médecin généraliste">Généralistes</option>
              </select>

              <select
                value={filterKOL === null ? 'all' : filterKOL ? 'kol' : 'non-kol'}
                onChange={(e) => setFilterKOL(e.target.value === 'all' ? null : e.target.value === 'kol')}
                className="px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-al-blue-500"
              >
                <option value="all">Tous</option>
                <option value="kol">KOLs uniquement</option>
                <option value="non-kol">Non KOLs</option>
              </select>
            </div>
          </div>

          {/* Liste des praticiens */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPractitioners.map((p) => {
              const profile = DataService.getPractitionerById(p.id);
              const pubCount = profile?.news?.filter(n => n.type === 'publication').length || 0;
              const noteCount = profile?.notes?.length || 0;

              return (
                <motion.div
                  key={p.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectPractitioner(p)}
                  className="glass-card p-4 cursor-pointer hover:shadow-xl transition-all border-2 border-transparent hover:border-al-blue-300"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                      p.isKOL ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
                      p.specialty === 'Pneumologue' ? 'bg-gradient-to-br from-al-blue-500 to-al-blue-600' :
                      'bg-gradient-to-br from-slate-500 to-slate-600'
                    }`}>
                      {p.firstName[0]}{p.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800 truncate">
                          {p.title} {p.lastName}
                        </h3>
                        {p.isKOL && <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />}
                      </div>
                      <p className="text-sm text-slate-600">{p.specialty}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <MapPin className="w-3 h-3" />
                        <span>{p.city}</span>
                        <span className="text-slate-300">|</span>
                        <span>{(p.volumeL / 1000).toFixed(0)}K L/an</span>
                      </div>
                      {(pubCount > 0 || noteCount > 0) && (
                        <div className="flex items-center gap-2 mt-2">
                          {pubCount > 0 && (
                            <span className="text-xs bg-al-blue-100 text-al-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              {pubCount} pub
                            </span>
                          )}
                          {noteCount > 0 && (
                            <span className="text-xs bg-al-blue-100 text-al-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {noteCount} notes
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    );
  }

  // Etape 2: Previsualisation du praticien
  if (step === 'preview' && selectedPractitioner) {
    const profile = DataService.getPractitionerById(selectedPractitioner.id);
    const pubCount = profile?.news?.filter(n => n.type === 'publication').length || 0;
    const noteCount = profile?.notes?.length || 0;
    const visitCount = profile?.visitHistory?.length || 0;

    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setStep('select');
                setSelectedPractitioner(null);
              }}
              className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-800">
                Pitch pour {selectedPractitioner.title} {selectedPractitioner.lastName}
              </h1>
              <p className="text-slate-600">Vérifiez les données disponibles avant de configurer le pitch</p>
            </div>
          </div>

          {/* Profil du praticien */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Infos principales */}
            <div className="glass-card p-6">
              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl ${
                  selectedPractitioner.isKOL ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-al-blue-500 to-al-blue-600'
                }`}>
                  {selectedPractitioner.firstName[0]}{selectedPractitioner.lastName[0]}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {selectedPractitioner.title} {selectedPractitioner.firstName} {selectedPractitioner.lastName}
                  </h2>
                  <p className="text-slate-600">{selectedPractitioner.specialty}</p>
                  <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                    <MapPin className="w-4 h-4" />
                    {selectedPractitioner.city}
                  </div>
                  {selectedPractitioner.isKOL && (
                    <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                      <Star className="w-3 h-3 fill-amber-500" />
                      Key Opinion Leader
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Volume annuel</div>
                  <div className="text-lg font-bold text-slate-800">{(selectedPractitioner.volumeL / 1000).toFixed(0)}K L</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Fidélité</div>
                  <div className="text-lg font-bold text-slate-800">{selectedPractitioner.loyaltyScore}/10</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Vingtile</div>
                  <div className="text-lg font-bold text-slate-800">V{selectedPractitioner.vingtile}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Tendance</div>
                  <div className="flex items-center gap-1">
                    {selectedPractitioner.trend === 'up' ? (
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    ) : selectedPractitioner.trend === 'down' ? (
                      <TrendingDown className="w-5 h-5 text-red-500" />
                    ) : (
                      <div className="w-5 h-5 bg-slate-400 rounded-full" />
                    )}
                    <span className="font-bold capitalize">{selectedPractitioner.trend}</span>
                  </div>
                </div>
              </div>

              {profile?.metrics.churnRisk !== 'low' && (
                <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
                  profile?.metrics.churnRisk === 'high' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Risque de churn {profile?.metrics.churnRisk === 'high' ? 'élevé' : 'moyen'}
                  </span>
                </div>
              )}
            </div>

            {/* Donnees enrichies */}
            <div className="lg:col-span-2 space-y-4">
              {/* Publications */}
              <div className="glass-card p-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                  <BookOpen className="w-5 h-5 text-al-blue-500" />
                  Publications ({pubCount})
                </h3>
                {pubCount > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {profile?.news?.filter(n => n.type === 'publication').slice(0, 3).map((pub, idx) => (
                      <div key={idx} className="bg-al-blue-50 rounded-lg p-3">
                        <div className="font-medium text-sm text-al-blue-900">{pub.title}</div>
                        <div className="text-xs text-al-blue-600 mt-1">{new Date(pub.date).toLocaleDateString('fr-FR')}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">Aucune publication référencée</p>
                )}
              </div>

              {/* Notes recentes */}
              <div className="glass-card p-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-al-blue-500" />
                  Notes récentes ({noteCount})
                </h3>
                {noteCount > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {profile?.notes?.slice(0, 3).map((note, idx) => (
                      <div key={idx} className="bg-al-blue-50 rounded-lg p-3">
                        <div className="text-sm text-al-blue-900">{note.content.substring(0, 100)}...</div>
                        <div className="text-xs text-al-blue-600 mt-1">{new Date(note.date).toLocaleDateString('fr-FR')}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">Aucune note de visite</p>
                )}
              </div>

              {/* Historique visites */}
              <div className="glass-card p-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-green-500" />
                  Historique des visites ({visitCount})
                </h3>
                {visitCount > 0 ? (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {profile?.visitHistory?.slice(0, 3).map((visit, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-green-50 rounded-lg p-3">
                        <div>
                          <div className="text-sm font-medium text-green-900">{new Date(visit.date).toLocaleDateString('fr-FR')}</div>
                          {visit.productsDiscussed && visit.productsDiscussed.length > 0 && (
                            <div className="text-xs text-green-600">Produits: {visit.productsDiscussed.join(', ')}</div>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          visit.type === 'completed' ? 'bg-green-200 text-green-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {visit.type}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">Aucune visite enregistrée</p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setStep('select');
                setSelectedPractitioner(null);
              }}
              className="btn-secondary"
            >
              Choisir un autre praticien
            </button>
            <button
              onClick={() => setStep('configure')}
              className="btn-primary flex items-center gap-2"
            >
              Configurer le pitch
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Etape 3: Configuration du pitch
  if (step === 'configure' && selectedPractitioner) {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setStep('preview')}
              className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Configuration du pitch
              </h1>
              <p className="text-slate-600">Pour {selectedPractitioner.title} {selectedPractitioner.lastName}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Colonne gauche */}
            <div className="space-y-6">
              {/* Focus du pitch */}
              <div className="glass-card p-6">
                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-al-blue-500" />
                  Focus du pitch
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {FOCUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setConfig({ ...config, focusArea: opt.id as any })}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        config.focusArea === opt.id
                          ? 'border-al-blue-500 bg-al-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <opt.icon className={`w-5 h-5 mb-1 ${config.focusArea === opt.id ? 'text-al-blue-600' : 'text-slate-500'}`} />
                      <div className="font-medium text-sm">{opt.label}</div>
                      <div className="text-xs text-slate-500">{opt.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Longueur et ton */}
              <div className="glass-card p-6">
                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-al-blue-500" />
                  Format
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Longueur</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['short', 'medium', 'long'] as const).map((len) => (
                        <button
                          key={len}
                          onClick={() => setConfig({ ...config, length: len })}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            config.length === len
                              ? 'bg-al-blue-500 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {len === 'short' ? 'Court' : len === 'medium' ? 'Moyen' : 'Long'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Ton</label>
                    <div className="space-y-2">
                      {(['formal', 'conversational', 'technical'] as const).map((tone) => (
                        <button
                          key={tone}
                          onClick={() => setConfig({ ...config, tone })}
                          className={`w-full px-4 py-2 rounded-lg text-sm font-medium text-left transition-all ${
                            config.tone === tone
                              ? 'bg-al-blue-500 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {tone === 'formal' ? 'Formel' : tone === 'conversational' ? 'Conversationnel' : 'Technique'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Options supplementaires */}
              <div className="glass-card p-6">
                <h3 className="font-bold text-lg text-slate-800 mb-4">Sections supplémentaires</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.includeObjections}
                      onChange={(e) => setConfig({ ...config, includeObjections: e.target.checked })}
                      className="w-5 h-5 text-al-blue-500 rounded"
                    />
                    <div>
                      <div className="font-medium">Gestion des objections</div>
                      <div className="text-xs text-slate-500">Anticipe les objections courantes avec des réponses préparées</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.includeTalkingPoints}
                      onChange={(e) => setConfig({ ...config, includeTalkingPoints: e.target.checked })}
                      className="w-5 h-5 text-al-blue-500 rounded"
                    />
                    <div>
                      <div className="font-medium">Points de discussion</div>
                      <div className="text-xs text-slate-500">Liste des sujets clés à aborder pendant l'entretien</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Colonne droite */}
            <div className="space-y-6">
              {/* Produits */}
              <div className="glass-card p-6">
                <h3 className="font-bold text-lg text-slate-800 mb-4">Produits à mettre en avant</h3>
                <div className="space-y-2">
                  {PRODUCTS.map((product) => (
                    <label key={product.id} className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={config.products.includes(product.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setConfig({ ...config, products: [...config.products, product.name] });
                          } else {
                            setConfig({ ...config, products: config.products.filter((p) => p !== product.name) });
                          }
                        }}
                        className="w-4 h-4 mt-1 text-al-blue-500 rounded"
                      />
                      <div>
                        <div className="font-medium text-sm">{product.name}</div>
                        <div className="text-xs text-slate-500">{product.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Concurrents */}
              <div className="glass-card p-6">
                <h3 className="font-bold text-lg text-slate-800 mb-4">Concurrents à adresser</h3>
                <div className="grid grid-cols-2 gap-2">
                  {COMPETITORS.map((competitor) => (
                    <label key={competitor.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={config.competitors.includes(competitor.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setConfig({ ...config, competitors: [...config.competitors, competitor.name] });
                          } else {
                            setConfig({ ...config, competitors: config.competitors.filter((c) => c !== competitor.name) });
                          }
                        }}
                        className="w-4 h-4 text-al-blue-500 rounded"
                      />
                      <span className="text-sm">{competitor.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Instructions additionnelles */}
              <div className="glass-card p-6">
                <h3 className="font-bold text-lg text-slate-800 mb-4">Instructions spéciales</h3>
                <textarea
                  value={config.additionalInstructions}
                  onChange={(e) => setConfig({ ...config, additionalInstructions: e.target.value })}
                  placeholder="Ex: Insister sur le service 24/7, mentionner la nouvelle étude clinique, éviter de parler du prix..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-al-blue-500 focus:border-transparent"
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <button
              onClick={() => setStep('preview')}
              className="btn-secondary"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </button>
            <button
              onClick={generatePitch}
              className="btn-primary flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Générer le pitch
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Etape 4: Generation et affichage du pitch
  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setStep('configure')}
              className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-al-blue-500 to-al-sky flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                Pitch généré
              </h1>
              <p className="text-slate-600">
                Pour {selectedPractitioner?.title} {selectedPractitioner?.firstName} {selectedPractitioner?.lastName}
              </p>
            </div>
          </div>

          {sections.length > 0 && !isGenerating && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {speechSupported && (
                <>
                  <button
                    onClick={handleSpeak}
                    className="btn-secondary flex items-center gap-2"
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
                      className="btn-secondary text-red-500 border-red-300"
                    >
                      <VolumeX className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
              <button
                onClick={copyToClipboard}
                className="btn-secondary flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copié !
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copier
                  </>
                )}
              </button>
              <button
                onClick={generatePitch}
                className="btn-primary flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Régénérer
              </button>
            </div>
          )}
        </div>

        {/* Contenu du pitch */}
        <AnimatePresence mode="wait">
          {isGenerating && sections.length === 0 ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3 mb-6 p-4 bg-al-blue-50 rounded-xl border border-al-blue-200">
                <Loader2 className="w-6 h-6 text-al-blue-500 animate-spin" />
                <div>
                  <p className="font-medium text-al-blue-800">Génération en cours...</p>
                  <p className="text-sm text-al-blue-600">L'IA crée votre pitch ultra-personnalisé</p>
                </div>
              </div>
              {[1, 2, 3, 4].map((i) => (
                <SkeletonPitchSection key={i} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-5"
            >
              {sections.map((section, index) => {
                const style = SECTION_STYLES[section.id] || SECTION_STYLES.hook;

                return (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`glass-card p-6 group relative border-l-4 ${style.borderColor} hover:shadow-lg transition-shadow`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${style.gradient} text-white flex items-center justify-center font-bold text-sm shadow-md`}>
                          {style.icon}
                        </span>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">{section.title}</h3>
                          <p className="text-xs text-slate-500">Section {index + 1} / {sections.length}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(section.content);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-slate-100"
                          title="Copier cette section"
                        >
                          <Copy className="w-4 h-4 text-slate-500" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingSection(section.id);
                            setEditInstruction('');
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-al-blue-50"
                          title="Modifier cette section"
                        >
                          <RefreshCw className="w-4 h-4 text-al-blue-500" />
                        </button>
                      </div>
                    </div>

                    {editingSection === section.id ? (
                      <div className="space-y-3 bg-slate-50 -mx-6 -mb-6 p-6 rounded-b-xl border-t border-slate-200">
                        <label className="block text-sm font-medium text-slate-700">
                          Comment souhaitez-vous modifier cette section ?
                        </label>
                        <textarea
                          value={editInstruction}
                          onChange={(e) => setEditInstruction(e.target.value)}
                          placeholder="Ex: Rendre plus percutant, ajouter des chiffres, raccourcir, être plus technique..."
                          className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-al-blue-500 focus:border-transparent"
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
                                Appliquer les modifications
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setEditingSection(null);
                              setEditInstruction('');
                            }}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={`${style.bg} -mx-6 -mb-6 p-6 rounded-b-xl`}>
                        <MarkdownText className="text-slate-700 leading-relaxed">
                          {section.content}
                        </MarkdownText>
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {isGenerating && sections.length > 0 && (
                <div className="flex items-center gap-3 p-4 bg-al-blue-50 rounded-xl border border-al-blue-200">
                  <Loader2 className="w-5 h-5 text-al-blue-500 animate-spin" />
                  <span className="text-sm text-al-blue-700 font-medium">Génération des sections suivantes...</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions finales */}
        {sections.length > 0 && !isGenerating && (
          <div className="glass-card p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-green-800">Pitch prêt à l'emploi !</h3>
                  <p className="text-sm text-green-700">
                    {sections.length} sections générées pour {selectedPractitioner?.title} {selectedPractitioner?.lastName}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={() => {
                    stop();
                    setStep('select');
                    setSelectedPractitioner(null);
                    setSections([]);
                    setStreamedText('');
                  }}
                  className="btn-secondary flex-1 sm:flex-none"
                >
                  Nouveau pitch
                </button>
                <button
                  onClick={copyToClipboard}
                  className="btn-primary flex items-center justify-center gap-2 flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copié !' : 'Copier tout'}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
