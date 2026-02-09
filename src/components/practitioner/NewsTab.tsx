import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileText, Mic, BookOpen, CheckCircle, Award, Calendar, GraduationCap } from 'lucide-react';
import type { Practitioner } from '../../types';
import { DataService } from '../../services/dataService';

interface NewsTabProps {
  practitioner: Practitioner;
}

const TYPE_CONFIG: Record<string, { icon: typeof FileText; bg: string; text: string; label: string }> = {
  publication: { icon: FileText, bg: 'bg-blue-100', text: 'text-blue-600', label: 'Publication' },
  conference: { icon: Mic, bg: 'bg-purple-100', text: 'text-purple-600', label: 'Conférence' },
  certification: { icon: GraduationCap, bg: 'bg-teal-100', text: 'text-teal-600', label: 'Certification' },
  award: { icon: Award, bg: 'bg-amber-100', text: 'text-amber-600', label: 'Distinction' },
  event: { icon: Calendar, bg: 'bg-green-100', text: 'text-green-600', label: 'Événement' },
};

export function NewsTab({ practitioner }: NewsTabProps) {
  // Fetch unique news from the rich PractitionerProfile database
  const news = useMemo(() => {
    return DataService.getPractitionerNews(practitioner.id);
  }, [practitioner.id]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Actualités & Contexte</h3>
        <span className="text-xs text-slate-500">
          {news.length} actualité{news.length > 1 ? 's' : ''}
        </span>
      </div>

      {news.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucune actualité récente pour ce praticien</p>
          <p className="text-xs text-slate-400 mt-1">Les publications et événements seront affichés ici</p>
        </div>
      ) : (
        news.map((item, i) => {
          const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.event;
          const Icon = config.icon;

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
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[11px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${config.bg} ${config.text}`}>
                      {config.label}
                    </span>
                  </div>
                  <p className="font-medium text-slate-800">{item.title}</p>
                  <p className="text-sm text-slate-500 mt-1">{item.content}</p>
                  {item.source && (
                    <p className="text-xs text-slate-400 mt-1 italic">Source : {item.source}</p>
                  )}
                  {item.relevance && (
                    <div className="mt-2 p-2 bg-amber-50 rounded-lg">
                      <p className="text-xs text-amber-700">
                        <strong>Pertinence :</strong> {item.relevance}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-2">{formatDate(item.date)}</p>
                </div>
              </div>
            </motion.div>
          );
        })
      )}

      {/* Contextual guidelines — only for pneumologues */}
      {practitioner.specialty === 'Pneumologue' && (
        <div className="glass-card p-4 bg-gradient-to-br from-al-blue-50 to-al-sky/10">
          <h4 className="font-semibold flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-al-blue-500" />
            Dernières recommandations GOLD 2025
          </h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <span>Classification ABE simplifie la prise de décision thérapeutique</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <span>Télésuivi recommandé pour améliorer l'observance OLD (&gt;15h/jour)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <span>OLD si PaO₂ ≤ 55 mmHg ou 56-59 avec complications</span>
            </li>
          </ul>
        </div>
      )}

      {/* Contextual guidelines — for generalistes */}
      {practitioner.specialty === 'Médecin généraliste' && (
        <div className="glass-card p-4 bg-gradient-to-br from-green-50 to-emerald-50/30">
          <h4 className="font-semibold flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-green-600" />
            Rappels pratiques oxygénothérapie
          </h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <span>Prescription initiale par le pneumologue, renouvellement possible par le MG</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <span>Forfait LPPR OLD concentrateur ~12€/jour, 100% ALD</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <span>Télésuivi Air Liquide inclus dans le forfait, pas de surcoût</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
