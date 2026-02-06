import { motion } from 'framer-motion';
import { FileText, Mic, Building, BookOpen, CheckCircle, Award, Calendar } from 'lucide-react';
import type { Practitioner } from '../../types';
import { DataService } from '../../services/dataService';

interface NewsTabProps {
  practitioner: Practitioner;
}

const TYPE_CONFIG: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  publication: { bg: 'bg-blue-100', text: 'text-blue-600', icon: <FileText className="w-5 h-5" />, label: 'Publication' },
  conference: { bg: 'bg-al-blue-100', text: 'text-al-blue-600', icon: <Mic className="w-5 h-5" />, label: 'Conférence' },
  certification: { bg: 'bg-teal-100', text: 'text-teal-600', icon: <Award className="w-5 h-5" />, label: 'Certification' },
  award: { bg: 'bg-amber-100', text: 'text-amber-600', icon: <Award className="w-5 h-5" />, label: 'Distinction' },
  event: { bg: 'bg-green-100', text: 'text-green-600', icon: <Calendar className="w-5 h-5" />, label: 'Événement' },
};

const DEFAULT_CONFIG = { bg: 'bg-slate-100', text: 'text-slate-600', icon: <Building className="w-5 h-5" />, label: 'Info' };

export function NewsTab({ practitioner }: NewsTabProps) {
  // Use actual generated news from DataService (unique per practitioner)
  const enrichedProfile = DataService.getPractitionerById(practitioner.id);
  const news = enrichedProfile?.news ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Actualités & Contexte</h3>
        <span className="text-xs text-slate-500">
          {news.length > 0 ? `${news.length} actualité${news.length > 1 ? 's' : ''}` : 'Aucune actualité'}
        </span>
      </div>

      {news.length === 0 && (
        <div className="glass-card p-6 text-center text-slate-400 text-sm">
          Aucune actualité récente pour ce praticien.
        </div>
      )}

      {news.map((item, i) => {
        const config = TYPE_CONFIG[item.type] || DEFAULT_CONFIG;
        const dateFormatted = new Date(item.date).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-4"
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${config.bg} ${config.text}`}>
                {config.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{item.title}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${config.bg} ${config.text}`}>{config.label}</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">{item.content}</p>
                {item.relevance && (
                  <div className="mt-2 p-2 bg-amber-50 rounded-lg">
                    <p className="text-xs text-amber-700">
                      <strong>Pertinence :</strong> {item.relevance}
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-xs text-slate-400">{dateFormatted}</p>
                  {item.source && <p className="text-xs text-slate-400">• {item.source}</p>}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* Section Guidelines contextuelles */}
      {practitioner.specialty === 'Pneumologue' && (
        <div className="glass-card p-4 bg-gradient-to-br from-al-blue-50 to-al-sky/10">
          <h4 className="font-semibold flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-al-blue-500" />
            Dernières recommandations GOLD 2025
          </h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <span>Révision des critères d&apos;initiation de l&apos;oxygénothérapie longue durée</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <span>Emphase sur la personnalisation du traitement</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <span>Importance du télésuivi pour l&apos;observance</span>
            </li>
          </ul>
        </div>
      )}
      {practitioner.specialty !== 'Pneumologue' && (
        <div className="glass-card p-4 bg-gradient-to-br from-al-blue-50 to-al-sky/10">
          <h4 className="font-semibold flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-al-blue-500" />
            Veille réglementaire
          </h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <span>Nouvelles recommandations HAS sur la prise en charge à domicile</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <span>Évolutions des critères de remboursement des dispositifs médicaux</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
