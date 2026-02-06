/**
 * Gestionnaire de documents d'entreprise pour le RAG du Coach IA
 * Permet d'uploader, gérer et visualiser les documents de la base de connaissances.
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  Trash2,
  Brain,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Check,
  Loader2,
  FileSearch,
  X,
  Info,
  Sparkles,
  Tag
} from 'lucide-react';
import { useDocumentStore } from '../../stores/useDocumentStore';
import { processDocument, type RAGDocument } from '../../services/ragService';
import { BUILTIN_KNOWLEDGE, KNOWLEDGE_CATEGORIES } from '../../data/builtinKnowledge';

const CATEGORY_OPTIONS: { value: RAGDocument['category']; label: string; icon: string }[] = [
  { value: 'produit', label: 'Produit / Service', icon: '📦' },
  { value: 'clinique', label: 'Clinique / Médical', icon: '🫁' },
  { value: 'reglementaire', label: 'Réglementation', icon: '📋' },
  { value: 'concurrence', label: 'Concurrence', icon: '⚔️' },
  { value: 'interne', label: 'Document interne', icon: '🏢' },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DocumentManager() {
  const { documents, addDocument, removeDocument, clearAll } = useDocumentStore();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<RAGDocument['category']>('interne');
  const [showBuiltin, setShowBuiltin] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    setUploadError(null);
    setUploadSuccess(null);
    setIsUploading(true);

    try {
      const fileArray = Array.from(files);
      let totalChunks = 0;

      for (const file of fileArray) {
        // Vérifier la taille (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          setUploadError(`${file.name} est trop volumineux (max 10 Mo)`);
          continue;
        }

        // Vérifier le type
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!['pdf', 'txt', 'md', 'csv', 'json'].includes(ext || '')) {
          setUploadError(`Format non supporté : .${ext}. Formats acceptés : PDF, TXT, MD, CSV, JSON`);
          continue;
        }

        const result = await processDocument(file, selectedCategory);
        addDocument(result.document, result.chunks);
        totalChunks += result.chunks.length;
      }

      if (totalChunks > 0) {
        setUploadSuccess(`${fileArray.length} document(s) ajouté(s) — ${totalChunks} segments créés pour le RAG`);
        setTimeout(() => setUploadSuccess(null), 5000);
      }
    } catch (error) {
      setUploadError(`Erreur lors du traitement : ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [selectedCategory, addDocument]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const totalChunks = useDocumentStore(s => s.chunks.length);
  const builtinCount = BUILTIN_KNOWLEDGE.length;

  return (
    <div className="space-y-5">
      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-al-blue-50 rounded-lg text-center">
          <div className="text-2xl font-bold text-al-blue-700">{documents.length}</div>
          <div className="text-xs text-al-blue-600">Documents</div>
        </div>
        <div className="p-3 bg-sky-50 rounded-lg text-center">
          <div className="text-2xl font-bold text-sky-700">{totalChunks}</div>
          <div className="text-xs text-sky-600">Segments RAG</div>
        </div>
        <div className="p-3 bg-emerald-50 rounded-lg text-center">
          <div className="text-2xl font-bold text-emerald-700">{builtinCount}</div>
          <div className="text-xs text-emerald-600">Savoirs intégrés</div>
        </div>
      </div>

      {/* Zone d'upload */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
          isDragOver
            ? 'border-al-blue-500 bg-al-blue-50 scale-[1.02]'
            : 'border-slate-300 hover:border-al-blue-400 hover:bg-slate-50'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.csv,.json"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-al-blue-500 animate-spin" />
            <p className="text-sm font-medium text-al-blue-700">Traitement en cours...</p>
            <p className="text-xs text-slate-500">Extraction du texte et création des segments RAG</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className={`w-8 h-8 ${isDragOver ? 'text-al-blue-500' : 'text-slate-400'}`} />
            <p className="text-sm font-medium text-slate-700">
              Glissez vos documents ici ou <span className="text-al-blue-500">parcourez</span>
            </p>
            <p className="text-xs text-slate-500">
              PDF, TXT, MD, CSV, JSON — Max 10 Mo par fichier
            </p>
          </div>
        )}
      </div>

      {/* Catégorie de document */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-2">Catégorie pour les prochains uploads</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedCategory === cat.value
                  ? 'bg-al-blue-500 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages de succès/erreur */}
      <AnimatePresence>
        {uploadSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200"
          >
            <Check className="w-4 h-4 flex-shrink-0" />
            {uploadSuccess}
          </motion.div>
        )}
        {uploadError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {uploadError}
            <button onClick={() => setUploadError(null)} className="ml-auto p-1 hover:bg-red-100 rounded">
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Documents uploadés */}
      {documents.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documents ajoutés ({documents.length})
            </h4>
            <button
              onClick={() => {
                if (confirm('Supprimer tous les documents uploadés ?')) clearAll();
              }}
              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Tout supprimer
            </button>
          </div>

          <div className="space-y-2">
            {documents.map(doc => {
              const catConfig = CATEGORY_OPTIONS.find(c => c.value === doc.category);
              return (
                <motion.div
                  key={doc.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white border border-slate-200 rounded-lg overflow-hidden"
                >
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                  >
                    <div className="w-9 h-9 rounded-lg bg-al-blue-50 flex items-center justify-center flex-shrink-0">
                      {doc.type === 'pdf' ? (
                        <FileText className="w-4 h-4 text-red-500" />
                      ) : (
                        <FileSearch className="w-4 h-4 text-al-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{formatFileSize(doc.size)}</span>
                        <span>•</span>
                        <span>{doc.chunkCount} segments</span>
                        <span>•</span>
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">{catConfig?.icon} {catConfig?.label}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Supprimer "${doc.name}" ?`)) removeDocument(doc.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {expandedDoc === doc.id ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  <AnimatePresence>
                    {expandedDoc === doc.id && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 pt-1 border-t border-slate-100 space-y-2">
                          {doc.summary && (
                            <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
                              <span className="font-medium text-slate-700">Résumé : </span>
                              {doc.summary}
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>Ajouté le {formatDate(doc.addedAt)}</span>
                            <span>Type : {doc.type.toUpperCase()}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Base de connaissances intégrée */}
      <div className="border border-emerald-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowBuiltin(!showBuiltin)}
          className="w-full flex items-center justify-between p-3 bg-emerald-50 hover:bg-emerald-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-800">
              Base de connaissances intégrée
            </span>
            <span className="text-xs bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">
              {builtinCount} fiches
            </span>
          </div>
          {showBuiltin ? (
            <ChevronUp className="w-4 h-4 text-emerald-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-emerald-600" />
          )}
        </button>

        <AnimatePresence>
          {showBuiltin && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
                <p className="text-xs text-slate-500 flex items-center gap-1 mb-2">
                  <Info className="w-3 h-3" />
                  Ces connaissances sont toujours disponibles pour le Coach IA, sans upload nécessaire.
                </p>
                {BUILTIN_KNOWLEDGE.map(k => {
                  const catConfig = KNOWLEDGE_CATEGORIES[k.category];
                  return (
                    <div key={k.id} className="flex items-start gap-2 p-2 bg-white rounded-lg border border-slate-100">
                      <span className="text-base flex-shrink-0 mt-0.5">{catConfig.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">{k.title}</p>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${catConfig.color}`}>
                            {catConfig.label}
                          </span>
                          {k.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full flex items-center gap-0.5">
                              <Tag className="w-2 h-2" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info RAG */}
      <div className="flex items-start gap-2 p-3 bg-al-blue-50 rounded-lg border border-al-blue-200">
        <Sparkles className="w-4 h-4 text-al-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-al-blue-700">
          <p className="font-medium mb-1">Comment fonctionne le RAG ?</p>
          <p className="text-al-blue-600">
            Chaque document est découpé en segments et indexé. Quand vous posez une question au Coach IA,
            les segments les plus pertinents sont automatiquement injectés dans le contexte de l'IA pour
            enrichir ses réponses avec vos données d'entreprise.
          </p>
        </div>
      </div>
    </div>
  );
}
