import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, User, Bell, Key, Database, HelpCircle, Check, ExternalLink, Info } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';

export function Settings() {
  const { currentUser } = useAppStore();

  // Notification preferences (local state - demo)
  const [notifications, setNotifications] = useState({
    visits: true,
    kols: true,
    objectives: true,
    daily: false,
  });

  // LLM config info
  const apiKey = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.VITE_LLM_API_KEY || '';
  const isLLMConfigured = apiKey && apiKey !== 'your_groq_api_key_here' && apiKey !== 'your_api_key_here' && apiKey.length > 10;

  const detectProvider = () => {
    if (apiKey.startsWith('gsk_')) return 'Groq (Llama 3.3 70B)';
    if (apiKey.startsWith('sk-ant-')) return 'Anthropic (Claude)';
    if (apiKey.startsWith('sk-')) return 'OpenAI (GPT-4o)';
    return 'Non configure';
  };

  const [saved, setSaved] = useState(false);
  const handleSaveNotifications = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-5xl mx-auto"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-1 flex items-center space-x-3">
          <SettingsIcon className="w-6 h-6 text-al-blue-500" />
          <span>Parametres</span>
        </h1>
        <p className="text-sm text-slate-500">
          Gerez vos preferences et la configuration de l'application
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-gradient-to-br from-al-blue-500 to-al-sky rounded-xl">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Profil</h2>
              <p className="text-xs text-slate-500">Informations du compte</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Nom complet</label>
              <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-700 border border-slate-200">
                {currentUser.name}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Role</label>
              <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-700 border border-slate-200">
                {currentUser.role}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Territoire</label>
              <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-700 border border-slate-200">
                {currentUser.territory}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2 text-xs text-slate-400">
              <Info className="w-3.5 h-3.5" />
              <span>Profil gere par l'administrateur</span>
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
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-gradient-to-br from-al-teal to-al-blue-300 rounded-xl">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Notifications</h2>
              <p className="text-xs text-slate-500">Preferences d'alertes</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { key: 'visits' as const, label: 'Visites a planifier', desc: 'Alertes quand des praticiens doivent etre visites' },
              { key: 'kols' as const, label: 'KOLs non visites', desc: 'Alertes pour les leaders d\'opinion a revoir' },
              { key: 'objectives' as const, label: 'Objectifs atteints', desc: 'Notification quand un objectif est rempli' },
              { key: 'daily' as const, label: 'Rappels quotidiens', desc: 'Resume de la journee chaque matin' },
            ].map(item => (
              <label key={item.key} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                <div>
                  <span className="text-sm text-slate-700 block">{item.label}</span>
                  <span className="text-xs text-slate-400">{item.desc}</span>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={notifications[item.key]}
                    onChange={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                    className="sr-only"
                  />
                  <div className={`w-10 h-6 rounded-full transition-colors ${notifications[item.key] ? 'bg-al-blue-500' : 'bg-slate-300'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform mt-1 ${notifications[item.key] ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                </div>
              </label>
            ))}

            <button
              onClick={handleSaveNotifications}
              className="w-full mt-3 btn-primary text-sm py-2 flex items-center justify-center gap-2"
            >
              {saved ? <><Check className="w-4 h-4" /> Enregistre</> : 'Enregistrer les preferences'}
            </button>
          </div>
        </motion.div>

        {/* LLM Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Configuration IA</h2>
              <p className="text-xs text-slate-500">Fournisseur LLM et cle API</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className={`p-3 rounded-lg border-2 ${isLLMConfigured ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${isLLMConfigured ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
                <span className={`text-sm font-medium ${isLLMConfigured ? 'text-green-700' : 'text-amber-700'}`}>
                  {isLLMConfigured ? 'LLM connecte' : 'LLM non configure'}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Fournisseur : <strong>{detectProvider()}</strong>
              </p>
              {isLLMConfigured && (
                <p className="text-xs text-slate-500 mt-1">
                  Cle : {apiKey.substring(0, 8)}...{apiKey.substring(apiKey.length - 4)}
                </p>
              )}
            </div>

            {!isLLMConfigured && (
              <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-2">
                <p className="font-medium text-slate-700">Pour activer l'IA :</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Copiez <code className="bg-slate-200 px-1 rounded">.env.example</code> en <code className="bg-slate-200 px-1 rounded">.env</code></li>
                  <li>Ajoutez votre cle API (Groq, OpenAI ou Anthropic)</li>
                  <li>Relancez l'application</li>
                </ol>
              </div>
            )}

            <p className="text-xs text-slate-400">
              ARIA fonctionne en mode local sans cle API, avec des fonctionnalites IA reduites.
            </p>
          </div>
        </motion.div>

        {/* Data & Privacy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Donnees</h2>
              <p className="text-xs text-slate-500">Stockage et confidentialite</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-700">Stockage local</span>
                <span className="text-xs text-slate-500">localStorage</span>
              </div>
              <p className="text-xs text-slate-500">
                Vos donnees (notes, compte-rendus, actions) sont stockees localement dans votre navigateur.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-700">Praticiens</span>
                <span className="text-xs font-medium text-al-blue-600">Donnees de demonstration</span>
              </div>
              <p className="text-xs text-slate-500">
                Les 120 praticiens affiches sont des donnees fictives generees pour la demonstration.
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm('Effacer toutes les donnees locales ? (notes, compte-rendus, actions)')) {
                  localStorage.removeItem('aria-user-data');
                  window.location.reload();
                }
              }}
              className="w-full text-sm text-red-600 hover:text-red-700 hover:bg-red-50 py-2 rounded-lg transition-colors"
            >
              Reinitialiser les donnees locales
            </button>
          </div>
        </motion.div>
      </div>

      {/* Help Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card p-5"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-gradient-to-br from-al-blue-500 to-al-sky rounded-xl">
            <HelpCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Aide</h2>
            <p className="text-xs text-slate-500">Raccourcis et informations utiles</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 rounded-lg">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Raccourcis clavier</h3>
            <div className="space-y-1 text-xs text-slate-500">
              <div className="flex justify-between"><span>Recherche</span><kbd className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-600">Ctrl+K</kbd></div>
              <div className="flex justify-between"><span>Coach IA</span><kbd className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-600">Ctrl+J</kbd></div>
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Fournisseurs IA supportes</h3>
            <div className="space-y-1 text-xs text-slate-500">
              <div>Groq (gratuit, recommande)</div>
              <div>OpenAI (GPT-4o)</div>
              <div>Anthropic (Claude)</div>
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Liens utiles</h3>
            <div className="space-y-1 text-xs">
              <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-al-blue-500 hover:underline">
                Console Groq <ExternalLink className="w-3 h-3" />
              </a>
              <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-al-blue-500 hover:underline">
                OpenAI Platform <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Version Info */}
      <div className="text-center text-xs text-slate-400 pb-4">
        ARIA v1.0.0 · Demonstrateur Air Liquide Sante · {isLLMConfigured ? detectProvider() : 'Mode local'}
      </div>
    </motion.div>
  );
}
