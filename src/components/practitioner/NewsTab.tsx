import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileText, Mic, BookOpen, CheckCircle, Award, Calendar, GraduationCap } from 'lucide-react';
import type { Practitioner } from '../../types';
import { DataService } from '../../services/dataService';
import { useTranslation, useLanguage } from '../../i18n';
import { getLocaleCode } from '../../utils/helpers';

interface NewsTabProps {
  practitioner: Practitioner;
}

const TYPE_ICONS: Record<string, { icon: typeof FileText; bg: string; text: string }> = {
  publication: { icon: FileText, bg: 'bg-blue-100', text: 'text-blue-600' },
  conference: { icon: Mic, bg: 'bg-purple-100', text: 'text-purple-600' },
  certification: { icon: GraduationCap, bg: 'bg-teal-100', text: 'text-teal-600' },
  award: { icon: Award, bg: 'bg-amber-100', text: 'text-amber-600' },
  event: { icon: Calendar, bg: 'bg-green-100', text: 'text-green-600' },
};

const TYPE_LABEL_KEYS: Record<string, string> = {
  publication: 'common.newsType.publication',
  conference: 'common.newsType.conference',
  certification: 'common.newsType.certification',
  award: 'common.newsType.distinction',
  event: 'common.newsType.event',
};

export function NewsTab({ practitioner }: NewsTabProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  // Fetch unique news from the rich PractitionerProfile database
  const news = useMemo(() => {
    return DataService.getPractitionerNews(practitioner.id);
  }, [practitioner.id]);

  const localeCode = getLocaleCode(language);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(localeCode, {
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
        <h3 className="font-semibold">{t('practitioners.news.title')}</h3>
        <span className="text-xs text-slate-500">
          {t('practitioners.news.count', { count: news.length, plural: news.length > 1 ? 's' : '' })}
        </span>
      </div>

      {news.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">{t('practitioners.news.noNews')}</p>
          <p className="text-xs text-slate-400 mt-1">{t('practitioners.news.noNewsDescription')}</p>
        </div>
      ) : (
        news.map((item, i) => {
          const iconConfig = TYPE_ICONS[item.type] || TYPE_ICONS.event;
          const Icon = iconConfig.icon;
          const labelKey = TYPE_LABEL_KEYS[item.type] || TYPE_LABEL_KEYS.event;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-4"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${iconConfig.bg} ${iconConfig.text}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[11px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${iconConfig.bg} ${iconConfig.text}`}>
                      {t(labelKey)}
                    </span>
                  </div>
                  <p className="font-medium text-slate-800">{item.title}</p>
                  <p className="text-sm text-slate-500 mt-1">{item.content}</p>
                  {item.source && (
                    <p className="text-xs text-slate-400 mt-1 italic">{t('common.source')} : {item.source}</p>
                  )}
                  {item.relevance && (
                    <div className="mt-2 p-2 bg-amber-50 rounded-lg">
                      <p className="text-xs text-amber-700">
                        <strong>{t('common.relevance')} :</strong> {item.relevance}
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
            {t('practitioners.news.goldGuidelines')}
          </h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <span>{t('practitioners.news.guidelineAbeClassification')}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <span>{t('practitioners.news.guidelineTelesuiviRecommended')}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <span>{t('practitioners.news.guidelineOldThreshold')}</span>
            </li>
          </ul>
        </div>
      )}

      {/* Contextual guidelines — for generalistes */}
      {practitioner.specialty === 'Médecin généraliste' && (
        <div className="glass-card p-4 bg-gradient-to-br from-green-50 to-emerald-50/30">
          <h4 className="font-semibold flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-green-600" />
            {t('practitioners.news.oxygenReminders')}
          </h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <span>{t('practitioners.news.guidelineInitialPrescription')}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <span>{t('practitioners.news.guidelineLpprRate')}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <span>{t('practitioners.news.guidelineTelesuiviIncluded')}</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
