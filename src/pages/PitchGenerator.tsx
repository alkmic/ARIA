import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Wand2, FileText } from 'lucide-react';
import { Card } from '../components/ui/Card';

export const PitchGenerator: React.FC = () => {
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
          <Sparkles className="w-8 h-8 text-al-blue-500" />
          <span>Générateur de Pitch IA</span>
        </h1>
        <p className="text-slate-600">
          Générez des arguments de vente personnalisés en quelques secondes grâce à l'IA
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-al-blue-500 to-al-sky rounded-xl">
              <Wand2 className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Configuration</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Sélectionner un praticien
              </label>
              <select className="input-field">
                <option>Dr. Martin - Pneumologue</option>
                <option>Dr. Dupont - Médecin Généraliste</option>
                <option>Pr. Bernard - KOL Pneumologie</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Objectif de la visite
              </label>
              <select className="input-field">
                <option>Présenter une nouvelle solution</option>
                <option>Renforcer la relation</option>
                <option>Suivi de patients</option>
                <option>Formation produit</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Contexte additionnel (optionnel)
              </label>
              <textarea
                className="input-field min-h-[120px]"
                placeholder="Ajoutez des informations spécifiques sur le praticien, ses patients, ou le contexte de la visite..."
              />
            </div>

            <button className="btn-primary w-full">
              <Sparkles className="w-5 h-5 mr-2" />
              Générer le pitch
            </button>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-slate-50 to-white">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-al-blue-500 to-al-sky rounded-xl">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Pitch généré</h2>
          </div>

          <div className="bg-white rounded-xl p-6 border-2 border-dashed border-slate-200 min-h-[400px] flex items-center justify-center">
            <div className="text-center">
              <Sparkles className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">
                Votre pitch personnalisé apparaîtra ici
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Pitches */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Pitchs récents</h2>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} hover className="cursor-pointer">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-al-blue-50 rounded-lg">
                  <FileText className="w-5 h-5 text-al-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 mb-1">Dr. Martin</h3>
                  <p className="text-xs text-slate-600 mb-2">Il y a 2 jours</p>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    Présentation des nouvelles options thérapeutiques pour patients BPCO...
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
