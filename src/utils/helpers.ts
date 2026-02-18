import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import type { Language } from '../i18n/LanguageContext';
import { getLanguage } from '../i18n/LanguageContext';

const locales = { fr, en: enUS };

export const getLocaleCode = (lang?: Language): string =>
  (lang ?? getLanguage()) === 'en' ? 'en-US' : 'fr-FR';

export const formatDate = (date: string | Date, lang?: Language): string => {
  const l = lang ?? getLanguage();
  return format(new Date(date), 'dd/MM/yyyy', { locale: locales[l] });
};

export const formatDateTime = (date: string | Date, lang?: Language): string => {
  const l = lang ?? getLanguage();
  const pattern = l === 'en' ? "MM/dd/yyyy 'at' HH:mm" : "dd/MM/yyyy 'à' HH:mm";
  return format(new Date(date), pattern, { locale: locales[l] });
};

export const formatRelativeTime = (date: string | Date, lang?: Language): string => {
  const l = lang ?? getLanguage();
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: locales[l] });
};

export const formatVolume = (volumeL: number): string => {
  if (volumeL >= 1000000) {
    return `${(volumeL / 1000000).toFixed(1)}M L`;
  } else if (volumeL >= 1000) {
    return `${(volumeL / 1000).toFixed(0)}K L`;
  }
  return `${volumeL} L`;
};

export const formatNumber = (num: number, lang?: Language): string => {
  const l = lang ?? getLanguage();
  return new Intl.NumberFormat(l === 'en' ? 'en-US' : 'fr-FR').format(num);
};

export const formatPercentage = (value: number, total: number): string => {
  return `${Math.round((value / total) * 100)}%`;
};
