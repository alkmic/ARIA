import { motion } from 'framer-motion';
import { Settings as SettingsIcon, User, Bell, Lock, Database, HelpCircle, Brain, Download, Trash2, CheckCircle, AlertTriangle, Loader2, Cpu } from 'lucide-react';
import { useWebLLM } from '../hooks/useWebLLM';
import { WEBLLM_MODELS } from '../services/webLlmService';
import { hasExternalLLMKey, getLLMProviderName } from '../services/aiCoachEngine';

export function Settings() {
  const {
    status,
    progress,
    error,
    isReady,
    isLoading,
    isWebGPUSupported,
    selectedModel,
    loadModel,
    unloadModel,
  } = useWebLLM();

  const currentModelInfo = WEBLLM_MODELS.find(m => m.id === selectedModel);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2 flex items-center space-x-3">
          <SettingsIcon className="w-8 h-8 text-al-blue-500" />
          <span>Paramètres</span>
        </h1>
        <p className="text-slate-600">
          Gérez vos préférences et paramètres de compte
        </p>
      </div>

      {/* WebLLM — Full width, prominent */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card p-6 border-2 border-purple-200"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800">IA dans le navigateur</h2>
              <span className="text-[11px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">WebLLM</span>
            </div>
            <p className="text-sm text-slate-500">
              Exécutez un LLM directement dans votre navigateur via WebGPU — zéro installation
            </p>
          </div>
          {isReady && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Prêt
            </span>
          )}
        </div>

        {/* LLM Status Overview */}
        <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs font-medium text-slate-500 mb-1">Provider LLM actuel</p>
          <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-al-blue-500" />
            {getLLMProviderName()}
            {hasExternalLLMKey() && (
              <span className="text-[11px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">API externe</span>
            )}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Chaîne de fallback : API externe &rarr; Ollama local &rarr; WebLLM navigateur
          </p>
        </div>

        {!isWebGPUSupported ? (
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">WebGPU non disponible</p>
              <p className="text-xs text-amber-600 mt-1">
                Votre navigateur ne supporte pas WebGPU. Utilisez Chrome 113+, Edge 113+, ou un navigateur compatible WebGPU.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Model Selection */}
            <div className="space-y-3 mb-4">
              <p className="text-sm font-medium text-slate-700">Choisir le modèle :</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {WEBLLM_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => !isLoading && loadModel(model.id)}
                    disabled={isLoading}
                    className={`p-3 rounded-xl text-left transition-all border-2 ${
                      selectedModel === model.id && isReady
                        ? 'border-purple-400 bg-purple-50 shadow-md shadow-purple-200/50'
                        : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                    } ${isLoading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-slate-800">{model.name}</span>
                      <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{model.size}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{model.description}</p>
                    {selectedModel === model.id && isReady && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-green-600 font-medium">
                        <CheckCircle className="w-3 h-3" />
                        Chargé
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Loading Progress */}
            {isLoading && (
              <div className="mb-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                  <span className="text-sm font-medium text-purple-800">
                    Chargement du modèle...
                  </span>
                  <span className="text-sm font-bold text-purple-600 ml-auto">
                    {(progress.progress * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-2.5 mb-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(progress.progress * 100, 1)}%` }}
                  />
                </div>
                <p className="text-[11px] text-purple-600 truncate">{progress.text}</p>
                {progress.progress > 0 && progress.progress < 1 && (
                  <p className="text-[11px] text-purple-500 mt-1">
                    Premier chargement : les poids du modèle sont téléchargés et mis en cache dans le navigateur.
                    Les prochains chargements seront quasi-instantanés.
                  </p>
                )}
              </div>
            )}

            {/* Error */}
            {error && status === 'error' && (
              <div className="mb-4 p-3 bg-red-50 rounded-xl border border-red-200">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {!isReady && !isLoading && (
                <button
                  onClick={() => loadModel()}
                  className="btn-primary px-6 py-2.5 flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
                >
                  <Download className="w-4 h-4" />
                  Charger {currentModelInfo?.name || 'le modèle'}
                </button>
              )}
              {isReady && (
                <button
                  onClick={unloadModel}
                  className="btn-secondary px-4 py-2 flex items-center gap-2 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Décharger le modèle
                </button>
              )}
            </div>

            {/* Info */}
            <div className="mt-4 text-[11px] text-slate-400 space-y-1">
              <p>Le modèle est téléchargé et mis en cache dans le stockage du navigateur.</p>
              <p>Les données restent sur votre machine — aucune requête externe n'est envoyée.</p>
              <p>Nécessite un GPU compatible WebGPU (la plupart des GPU récents).</p>
            </div>
          </>
        )}
      </motion.div>

      {/* Settings Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Profile Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-al-blue-500 to-al-sky rounded-xl">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Profil</h2>
              <p className="text-sm text-slate-500">Informations personnelles</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nom complet
              </label>
              <input
                type="text"
                defaultValue="Sophie Martin"
                className="input-field"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                type="email"
                defaultValue="sophie.martin@airliquide.com"
                className="input-field"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Rôle
              </label>
              <input
                type="text"
                defaultValue="Déléguée Commerciale"
                className="input-field"
                disabled
              />
            </div>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-al-teal to-al-blue-300 rounded-xl">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Notifications</h2>
              <p className="text-sm text-slate-500">Préférences d'alertes</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-sm text-slate-700">Visites à planifier</span>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 text-al-blue-500 rounded focus:ring-2 focus:ring-al-blue-500"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-slate-700">KOLs non visités</span>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 text-al-blue-500 rounded focus:ring-2 focus:ring-al-blue-500"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-slate-700">Objectifs atteints</span>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 text-al-blue-500 rounded focus:ring-2 focus:ring-al-blue-500"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-slate-700">Rappels quotidiens</span>
              <input
                type="checkbox"
                className="w-5 h-5 text-al-blue-500 rounded focus:ring-2 focus:ring-al-blue-500"
              />
            </label>
          </div>
        </motion.div>

        {/* Security */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Sécurité</h2>
              <p className="text-sm text-slate-500">Paramètres de sécurité</p>
            </div>
          </div>

          <div className="space-y-4">
            <button className="btn-primary w-full" disabled>
              Changer le mot de passe
            </button>
            <button className="btn-secondary w-full" disabled>
              Activer 2FA
            </button>
            <div className="text-xs text-slate-500 text-center pt-2">
              Fonctionnalité disponible prochainement
            </div>
          </div>
        </motion.div>

        {/* Data & Privacy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Données</h2>
              <p className="text-sm text-slate-500">Gestion des données</p>
            </div>
          </div>

          <div className="space-y-4">
            <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" disabled>
              Exporter mes données
            </button>
            <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" disabled>
              Politique de confidentialité
            </button>
            <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" disabled>
              Conditions d'utilisation
            </button>
            <div className="text-xs text-slate-500 text-center pt-2">
              Fonctionnalité disponible prochainement
            </div>
          </div>
        </motion.div>
      </div>

      {/* Help Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-al-blue-500 to-al-sky rounded-xl">
            <HelpCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Aide & Support</h2>
            <p className="text-sm text-slate-500">Besoin d'assistance ?</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <button className="btn-secondary" disabled>
            Documentation
          </button>
          <button className="btn-secondary" disabled>
            Tutoriels vidéo
          </button>
          <button className="btn-secondary" disabled>
            Contacter le support
          </button>
        </div>
      </motion.div>

      {/* Version Info */}
      <div className="text-center text-sm text-slate-500">
        ARIA v1.0.0 · Démonstrateur Air Liquide Santé
      </div>
    </motion.div>
  );
}
