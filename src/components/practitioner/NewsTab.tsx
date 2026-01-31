import { motion } from 'framer-motion';
import { FileText, Mic, Building, BookOpen, CheckCircle, Award, GraduationCap } from 'lucide-react';
import type { Practitioner } from '../../types';
import { DataService } from '../../services/dataService';

interface NewsTabProps {
  practitioner: Practitioner;
}

export function NewsTab({ practitioner }: NewsTabProps) {
  // Récupérer les VRAIES actualités depuis la base de données
  const practitionerProfile = DataService.getPractitionerById(practitioner.id);
  const news = practitionerProfile?.news || [];

  // Fonction pour obtenir l'icône selon le type
  const getIcon = (type: string) => {
    switch (type) {
      case 'publication':
        return <FileText className="w-5 h-5" />;
      case 'conference':
        return <Mic className="w-5 h-5" />;
      case 'certification':
        return <GraduationCap className="w-5 h-5" />;
      case 'award':
        return <Award className="w-5 h-5" />;
      case 'event':
        return <Building className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  // Fonction pour obtenir la couleur selon le type
  const getColor = (type: string) => {
    switch (type) {
      case 'publication':
        return 'bg-blue-100 text-blue-600';
      case 'conference':
        return 'bg-purple-100 text-purple-600';
      case 'certification':
        return 'bg-green-100 text-green-600';
      case 'award':
        return 'bg-amber-100 text-amber-600';
      case 'event':
        return 'bg-teal-100 text-teal-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Actualités & Contexte</h3>
        <span className="text-xs text-slate-500">Mis à jour il y a 2h</span>
      </div>

      {news.length > 0 ? (
        news.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-4"
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${getColor(item.type)}`}>
                {getIcon(item.type)}
              </div>
              <div className="flex-1">
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-slate-500 mt-1">{item.content}</p>
                {item.relevance && (
                  <div className="mt-2 p-2 bg-amber-50 rounded-lg">
                    <p className="text-xs text-amber-700">{item.relevance}</p>
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-2">
                  {new Date(item.date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </motion.div>
        ))
      ) : (
        <div className="glass-card p-6 text-center text-slate-500">
          <p className="text-sm">Aucune actualité récente pour ce praticien.</p>
        </div>
      )}

      {/* Section Guidelines BPCO */}
      <div className="glass-card p-4 bg-gradient-to-br from-al-blue-50 to-al-sky/10">
        <h4 className="font-semibold flex items-center gap-2 mb-3">
          <BookOpen className="w-5 h-5 text-al-blue-500" />
          Dernières recommandations GOLD 2025
        </h4>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
            <span>Révision des critères d'initiation de l'oxygénothérapie longue durée</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
            <span>Emphase sur la personnalisation du traitement</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
            <span>Importance du télésuivi pour l'observance</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
