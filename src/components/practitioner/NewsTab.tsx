import { motion } from 'framer-motion';
import { FileText, Mic, Building, BookOpen, CheckCircle } from 'lucide-react';
import type { Practitioner } from '../../types';

interface NewsTabProps {
  practitioner: Practitioner;
}

export function NewsTab({ practitioner }: NewsTabProps) {
  // News mockées mais réalistes
  const news = [
    {
      type: 'publication',
      title: `Publication dans l'European Respiratory Journal`,
      date: '15 janvier 2026',
      summary: 'Co-auteur d\'une étude sur le sevrage tabagique chez le patient BPCO avec oxygénothérapie...',
      relevance: 'Opportunité de discussion sur nos programmes d\'accompagnement'
    },
    {
      type: 'conference',
      title: 'Intervention au Congrès de Pneumologie',
      date: '8 janvier 2026',
      summary: 'Présentation sur la téléréhabilitation respiratoire et l\'amélioration de l\'observance...',
      relevance: 'Nos solutions connectées s\'inscrivent dans cette approche'
    },
    {
      type: 'institutional',
      title: `Nouveau chef de service à l'hôpital de ${practitioner.city}`,
      date: '2 janvier 2026',
      summary: 'Réorganisation du service pneumologie avec focus sur la prise en charge ambulatoire...',
      relevance: 'Moment opportun pour renforcer le partenariat'
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Actualités & Contexte</h3>
        <span className="text-xs text-slate-500">Mis à jour il y a 2h</span>
      </div>

      {news.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="glass-card p-4"
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${
              item.type === 'publication' ? 'bg-blue-100 text-blue-600' :
              item.type === 'conference' ? 'bg-purple-100 text-purple-600' :
              'bg-green-100 text-green-600'
            }`}>
              {item.type === 'publication' ? <FileText className="w-5 h-5" /> :
               item.type === 'conference' ? <Mic className="w-5 h-5" /> :
               <Building className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-slate-500 mt-1">{item.summary}</p>
              <div className="mt-2 p-2 bg-amber-50 rounded-lg">
                <p className="text-xs text-amber-700">
                  <strong>Pertinence :</strong> {item.relevance}
                </p>
              </div>
              <p className="text-xs text-slate-400 mt-2">{item.date}</p>
            </div>
          </div>
        </motion.div>
      ))}

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
