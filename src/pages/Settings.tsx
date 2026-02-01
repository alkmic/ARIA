import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, User, Bell, Lock, Database, HelpCircle, Download, Trash2, Save, X, Moon, Sun } from 'lucide-react';
import { UserSettingsService } from '../services/userSettings';
import type { UserProfile, NotificationSettings } from '../services/userSettings';
import { useToast } from '../components/ui/Toast';

export function Settings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState(UserSettingsService.loadSettings());
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile>(settings.profile);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Charger les paramètres au montage
  useEffect(() => {
    const loadedSettings = UserSettingsService.loadSettings();
    setSettings(loadedSettings);
    setEditedProfile(loadedSettings.profile);
  }, []);

  // Gestion du profil
  const handleEditProfile = () => {
    setIsEditingProfile(true);
    setEditedProfile(settings.profile);
  };

  const handleSaveProfile = () => {
    const success = UserSettingsService.updateProfile(editedProfile);
    if (success) {
      setSettings(UserSettingsService.loadSettings());
      setIsEditingProfile(false);
      toast.success('Profil mis à jour avec succès');
    } else {
      toast.error('Erreur lors de la mise à jour du profil');
    }
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setEditedProfile(settings.profile);
  };

  const handleProfileChange = (field: keyof UserProfile, value: string) => {
    setEditedProfile(prev => ({ ...prev, [field]: value }));
  };

  // Gestion des notifications
  const handleNotificationChange = (field: keyof NotificationSettings) => {
    const newNotifications = {
      ...settings.notifications,
      [field]: !settings.notifications[field],
    };
    const success = UserSettingsService.updateNotifications(newNotifications);
    if (success) {
      setSettings(UserSettingsService.loadSettings());
      toast.success('Préférences de notification mises à jour');
    } else {
      toast.error('Erreur lors de la mise à jour des notifications');
    }
  };

  // Gestion du thème
  const handleThemeToggle = () => {
    const newTheme = settings.theme === 'light' ? 'dark' : 'light';
    const success = UserSettingsService.updateTheme(newTheme);
    if (success) {
      setSettings(UserSettingsService.loadSettings());
      toast.info(`Thème ${newTheme === 'dark' ? 'sombre' : 'clair'} activé`);
    }
  };

  // Export des données
  const handleExportData = () => {
    try {
      UserSettingsService.downloadData();
      toast.success('Données exportées avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'export des données');
      console.error('Export error:', error);
    }
  };

  // Effacer toutes les données
  const handleClearData = () => {
    const success = UserSettingsService.clearAllData();
    if (success) {
      setSettings(UserSettingsService.loadSettings());
      setShowClearConfirm(false);
      toast.success('Toutes les données ont été effacées');
    } else {
      toast.error('Erreur lors de l\'effacement des données');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-text mb-2 flex items-center space-x-3">
          <SettingsIcon className="w-8 h-8 text-al-blue-500" />
          <span>Paramètres</span>
        </h1>
        <p className="text-slate-600">
          Gérez vos préférences et paramètres de compte
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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-al-blue-500 to-al-sky rounded-xl">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Profil</h2>
                <p className="text-sm text-slate-500">Informations personnelles</p>
              </div>
            </div>
            {!isEditingProfile && (
              <button
                onClick={handleEditProfile}
                className="text-sm text-al-blue-500 hover:text-al-blue-600 font-medium"
              >
                Modifier
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nom complet
              </label>
              <input
                type="text"
                value={isEditingProfile ? editedProfile.name : settings.profile.name}
                onChange={(e) => handleProfileChange('name', e.target.value)}
                className="input-field"
                disabled={!isEditingProfile}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={isEditingProfile ? editedProfile.email : settings.profile.email}
                onChange={(e) => handleProfileChange('email', e.target.value)}
                className="input-field"
                disabled={!isEditingProfile}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Rôle
              </label>
              <input
                type="text"
                value={isEditingProfile ? editedProfile.role : settings.profile.role}
                onChange={(e) => handleProfileChange('role', e.target.value)}
                className="input-field"
                disabled={!isEditingProfile}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Territoire
              </label>
              <input
                type="text"
                value={isEditingProfile ? editedProfile.territory : settings.profile.territory}
                onChange={(e) => handleProfileChange('territory', e.target.value)}
                className="input-field"
                disabled={!isEditingProfile}
              />
            </div>

            {isEditingProfile && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveProfile}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-al-blue-500 hover:bg-al-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Enregistrer
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
                >
                  <X className="w-4 h-4" />
                  Annuler
                </button>
              </div>
            )}
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
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-slate-700">Visites à planifier</span>
              <input
                type="checkbox"
                checked={settings.notifications.upcomingVisits}
                onChange={() => handleNotificationChange('upcomingVisits')}
                className="w-5 h-5 text-al-blue-500 rounded focus:ring-2 focus:ring-al-blue-500 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-slate-700">KOLs non visités</span>
              <input
                type="checkbox"
                checked={settings.notifications.unvisitedKOLs}
                onChange={() => handleNotificationChange('unvisitedKOLs')}
                className="w-5 h-5 text-al-blue-500 rounded focus:ring-2 focus:ring-al-blue-500 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-slate-700">Objectifs atteints</span>
              <input
                type="checkbox"
                checked={settings.notifications.objectivesReached}
                onChange={() => handleNotificationChange('objectivesReached')}
                className="w-5 h-5 text-al-blue-500 rounded focus:ring-2 focus:ring-al-blue-500 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-slate-700">Rappels quotidiens</span>
              <input
                type="checkbox"
                checked={settings.notifications.dailyReminders}
                onChange={() => handleNotificationChange('dailyReminders')}
                className="w-5 h-5 text-al-blue-500 rounded focus:ring-2 focus:ring-al-blue-500 cursor-pointer"
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

          <div className="space-y-3">
            {/* Theme Toggle */}
            <button
              onClick={handleThemeToggle}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {settings.theme === 'light' ? (
                <Moon className="w-5 h-5 text-slate-600" />
              ) : (
                <Sun className="w-5 h-5 text-amber-500" />
              )}
              <span className="flex-1 text-left">
                Thème {settings.theme === 'light' ? 'sombre' : 'clair'}
              </span>
            </button>

            {/* Export Data */}
            <button
              onClick={handleExportData}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Download className="w-5 h-5 text-al-blue-500" />
              <span className="flex-1 text-left">Exporter mes données</span>
            </button>

            {/* Clear All Data */}
            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                <span className="flex-1 text-left">Effacer toutes les données</span>
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 mb-3 font-medium">
                  Êtes-vous sûr ? Cette action est irréversible.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleClearData}
                    className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Confirmer
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            <div className="border-t border-slate-200 pt-3 mt-2">
              <button className="w-full px-4 py-2 text-left text-sm text-slate-500 hover:text-slate-700 transition-colors" disabled>
                Politique de confidentialité
              </button>
              <button className="w-full px-4 py-2 text-left text-sm text-slate-500 hover:text-slate-700 transition-colors" disabled>
                Conditions d'utilisation
              </button>
              <div className="text-xs text-slate-400 text-center pt-2">
                Documentation disponible prochainement
              </div>
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
