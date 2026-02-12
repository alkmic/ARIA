import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Save,
  Trash2,
  Tag,
  Target,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  ChevronRight,
  Mic,
  Eye,
  Brain,
  Lightbulb,
  Swords,
  CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserDataStore, type UserNote, type VisitReportData, type AIAction } from '../../stores/useUserDataStore';
import type { Practitioner } from '../../types';

interface NotesTabProps {
  practitioner: Practitioner;
}

const noteTypeConfig = {
  observation: { label: 'Observation', icon: Eye, color: 'text-blue-500', bg: 'bg-blue-50' },
  reminder: { label: 'Rappel', icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-50' },
  strategy: { label: 'Stratégie', icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  competitive: { label: 'Concurrence', icon: Swords, color: 'text-amber-500', bg: 'bg-amber-50' }
};

export function NotesTab({ practitioner }: NotesTabProps) {
  const navigate = useNavigate();
  const {
    getNotesForPractitioner,
    getVisitReportsForPractitioner,
    getActionsForPractitioner,
    addUserNote,
    updateUserNote,
    deleteUserNote
  } = useUserDataStore();

  const [activeSection, setActiveSection] = useState<'notes' | 'reports' | 'actions'>('notes');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteType, setNewNoteType] = useState<UserNote['type']>('observation');
  const [isAdding, setIsAdding] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Get data from store
  const notes = useMemo(() => getNotesForPractitioner(practitioner.id), [practitioner.id, getNotesForPractitioner]);
  const visitReports = useMemo(() => getVisitReportsForPractitioner(practitioner.id), [practitioner.id, getVisitReportsForPractitioner]);
  const actions = useMemo(() => getActionsForPractitioner(practitioner.id), [practitioner.id, getActionsForPractitioner]);

  const handleAddNote = () => {
    if (!newNoteContent.trim()) return;

    addUserNote({
      practitionerId: practitioner.id,
      content: newNoteContent,
      type: newNoteType
    });

    setNewNoteContent('');
    setIsAdding(false);
  };

  const handleUpdateNote = (noteId: string) => {
    if (!editContent.trim()) return;
    updateUserNote(noteId, editContent);
    setEditingNoteId(null);
    setEditContent('');
  };

  const handleDeleteNote = (noteId: string) => {
    if (confirm('Supprimer cette note ?')) {
      deleteUserNote(noteId);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const sections = [
    { id: 'notes', label: 'Notes', icon: FileText, count: notes.length },
    { id: 'reports', label: 'Comptes-rendus', icon: Mic, count: visitReports.length },
    { id: 'actions', label: 'Actions IA', icon: Brain, count: actions.filter(a => a.status === 'pending').length }
  ];

  return (
    <div className="space-y-4">
      {/* Section Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
        {sections.map(section => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                activeSection === section.id
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{section.label}</span>
              {section.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeSection === section.id ? 'bg-al-blue-100 text-al-blue-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {section.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* Notes Section */}
        {activeSection === 'notes' && (
          <motion.div
            key="notes"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Add Note Button */}
            {!isAdding ? (
              <button
                onClick={() => setIsAdding(true)}
                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-al-blue-400 hover:text-al-blue-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Ajouter une note
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="glass-card p-4 space-y-3"
              >
                {/* Note Type Selector */}
                <div className="flex gap-2">
                  {(Object.keys(noteTypeConfig) as UserNote['type'][]).map(type => {
                    const config = noteTypeConfig[type];
                    const Icon = config.icon;
                    return (
                      <button
                        key={type}
                        onClick={() => setNewNoteType(type)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          newNoteType === type
                            ? `${config.bg} ${config.color}`
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {config.label}
                      </button>
                    );
                  })}
                </div>

                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Tapez votre note..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-al-blue-500 h-24 resize-none"
                  autoFocus
                />

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setIsAdding(false); setNewNoteContent(''); }}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleAddNote}
                    disabled={!newNoteContent.trim()}
                    className="px-4 py-2 text-sm bg-al-blue-500 text-white rounded-lg hover:bg-al-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4 inline mr-1" />
                    Sauvegarder
                  </button>
                </div>
              </motion.div>
            )}

            {/* Notes List */}
            {notes.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Aucune note pour ce praticien</p>
                <p className="text-sm mt-1">Les notes ajoutées ici et via les comptes-rendus vocaux apparaîtront ici.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map(note => {
                  const config = noteTypeConfig[note.type];
                  const Icon = config.icon;

                  return (
                    <motion.div
                      key={note.id}
                      layout
                      className="glass-card p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-semibold ${config.color}`}>
                              {config.label.toUpperCase()}
                            </span>
                            <span className="text-xs text-slate-400">
                              {formatDate(note.createdAt)} à {formatTime(note.createdAt)}
                            </span>
                          </div>

                          {editingNoteId === note.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-al-blue-500 h-20 resize-none text-sm"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setEditingNoteId(null)}
                                  className="px-3 py-1 text-xs text-slate-600"
                                >
                                  Annuler
                                </button>
                                <button
                                  onClick={() => handleUpdateNote(note.id)}
                                  className="px-3 py-1 text-xs bg-al-blue-500 text-white rounded-lg"
                                >
                                  Sauvegarder
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                          )}
                        </div>

                        {editingNoteId !== note.id && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => { setEditingNoteId(note.id); setEditContent(note.content); }}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Quick Tags */}
            <div className="glass-card p-4">
              <p className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags rapides
              </p>
              <div className="flex flex-wrap gap-2">
                {['À relancer', 'Intéressé télésuivi', 'Budget en attente', 'Décideur', 'Prescripteur actif', 'Sensible prix', 'Innovation'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      setNewNoteContent(n => n + (n ? '\n' : '') + `#${tag}`);
                      setIsAdding(true);
                    }}
                    className="px-3 py-1 bg-slate-100 hover:bg-al-blue-50 hover:text-al-blue-700 rounded-full text-sm transition-colors"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Visit Reports Section */}
        {activeSection === 'reports' && (
          <motion.div
            key="reports"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* New Report Button */}
            <button
              onClick={() => navigate(`/visit-report?practitioner=${practitioner.id}`)}
              className="w-full flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg transition-all"
            >
              <Mic className="w-5 h-5" />
              Nouveau compte-rendu vocal
            </button>

            {/* Reports List */}
            {visitReports.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Mic className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Aucun compte-rendu pour ce praticien</p>
                <p className="text-sm mt-1">Dictez votre prochain compte-rendu de visite avec ARIA.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {visitReports.map((report, index) => (
                  <VisitReportCard key={report.id} report={report} index={index} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* AI Actions Section */}
        {activeSection === 'actions' && (
          <motion.div
            key="actions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Link to full actions page */}
            <button
              onClick={() => navigate('/next-actions')}
              className="w-full flex items-center justify-between p-3 glass-card hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                <span className="font-medium">Voir toutes les actions IA</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>

            {/* Actions for this practitioner */}
            {actions.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Brain className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Aucune action IA pour ce praticien</p>
                <p className="text-sm mt-1">ARIA vous suggérera des actions basées sur l'analyse des données.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {actions.slice(0, 5).map(action => (
                  <ActionCard key={action.id} action={action} />
                ))}

                {actions.length > 5 && (
                  <button
                    onClick={() => navigate('/next-actions')}
                    className="w-full text-center text-sm text-al-blue-600 hover:text-al-blue-700 py-2"
                  >
                    Voir {actions.length - 5} actions de plus
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Visit Report Card Component
function VisitReportCard({ report, index }: { report: VisitReportData; index: number }) {
  const [isExpanded, setIsExpanded] = useState(index === 0);

  const sentimentConfig = {
    positive: { icon: ThumbsUp, color: 'text-green-600', bg: 'bg-green-50', label: 'Positif' },
    neutral: { icon: MessageSquare, color: 'text-slate-600', bg: 'bg-slate-50', label: 'Neutre' },
    negative: { icon: ThumbsDown, color: 'text-red-600', bg: 'bg-red-50', label: 'Négatif' }
  };

  const sentiment = sentimentConfig[report.extractedInfo.sentiment];
  const SentimentIcon = sentiment.icon;

  return (
    <motion.div
      layout
      className="glass-card overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
            <Mic className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-800">{report.date}</span>
              <span className="text-sm text-slate-500">{report.time}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded-full ${sentiment.bg} ${sentiment.color}`}>
                <SentimentIcon className="w-3 h-3 inline mr-1" />
                {sentiment.label}
              </span>
              {report.extractedInfo.topics.slice(0, 2).map((topic, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>
        <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-100"
          >
            <div className="p-4 space-y-4">
              {/* Transcript */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Transcription
                </h4>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                  {report.transcript}
                </p>
              </div>

              {/* Extracted Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                {report.extractedInfo.keyPoints.length > 0 && (
                  <div className="col-span-2 bg-emerald-50 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-emerald-700 mb-2">Points clés</h4>
                    <ul className="space-y-1">
                      {report.extractedInfo.keyPoints.map((point, i) => (
                        <li key={i} className="text-sm text-emerald-800 flex items-start gap-1">
                          <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.extractedInfo.nextActions.length > 0 && (
                  <div className="bg-purple-50 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-purple-700 mb-2">Actions à faire</h4>
                    <ul className="space-y-1">
                      {report.extractedInfo.nextActions.map((action, i) => (
                        <li key={i} className="text-xs text-purple-800">• {action}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.extractedInfo.opportunities.length > 0 && (
                  <div className="bg-amber-50 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-amber-700 mb-2">Opportunités</h4>
                    <ul className="space-y-1">
                      {report.extractedInfo.opportunities.map((opp, i) => (
                        <li key={i} className="text-xs text-amber-800">• {opp}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.extractedInfo.objections.length > 0 && (
                  <div className="bg-red-50 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-red-700 mb-2">Objections</h4>
                    <ul className="space-y-1">
                      {report.extractedInfo.objections.map((obj, i) => (
                        <li key={i} className="text-xs text-red-800">• {obj}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.extractedInfo.productsDiscussed.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-blue-700 mb-2">Produits discutés</h4>
                    <div className="flex flex-wrap gap-1">
                      {report.extractedInfo.productsDiscussed.map((product, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                          {product}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {report.extractedInfo.competitorsMentioned.length > 0 && (
                  <div className="bg-orange-50 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-orange-700 mb-2">Concurrents mentionnés</h4>
                    <div className="flex flex-wrap gap-1">
                      {report.extractedInfo.competitorsMentioned.map((comp, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                          {comp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Action Card Component
function ActionCard({ action }: { action: AIAction }) {
  const navigate = useNavigate();

  const priorityColors = {
    critical: 'border-l-red-500 bg-red-50',
    high: 'border-l-orange-500 bg-orange-50',
    medium: 'border-l-amber-500 bg-amber-50',
    low: 'border-l-blue-500 bg-blue-50'
  };

  const statusConfig = {
    pending: { label: 'À faire', color: 'text-amber-600 bg-amber-100' },
    completed: { label: 'Terminé', color: 'text-green-600 bg-green-100' },
    snoozed: { label: 'Reporté', color: 'text-purple-600 bg-purple-100' },
    dismissed: { label: 'Ignoré', color: 'text-slate-600 bg-slate-100' }
  };

  return (
    <div className={`p-4 rounded-lg border-l-4 ${priorityColors[action.priority]}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span className="font-medium text-slate-800">{action.title}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig[action.status].color}`}>
          {statusConfig[action.status].label}
        </span>
      </div>

      <p className="text-sm text-slate-600 mb-3">{action.aiJustification.summary}</p>

      {/* Scores */}
      <div className="flex gap-4 mb-3">
        <div className="flex items-center gap-1 text-xs">
          <div className="w-8 h-1 bg-slate-200 rounded overflow-hidden">
            <div className="h-full bg-red-500" style={{ width: `${action.scores.urgency}%` }} />
          </div>
          <span className="text-slate-500">Urgence {action.scores.urgency}%</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <div className="w-8 h-1 bg-slate-200 rounded overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${action.scores.impact}%` }} />
          </div>
          <span className="text-slate-500">Impact {action.scores.impact}%</span>
        </div>
      </div>

      {action.status === 'pending' && (
        <button
          onClick={() => navigate('/next-actions')}
          className="text-xs text-al-blue-600 hover:text-al-blue-700 font-medium"
        >
          Voir les détails →
        </button>
      )}
    </div>
  );
}
