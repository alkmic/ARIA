import { motion } from 'framer-motion';
import { Settings as SettingsIcon, User, Bell, Lock, Database, HelpCircle } from 'lucide-react';

export function Settings() {
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
