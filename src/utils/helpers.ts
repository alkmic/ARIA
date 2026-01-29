import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export const formatDate = (date: string | Date): string => {
  return format(new Date(date), 'dd/MM/yyyy', { locale: fr });
};

export const formatDateTime = (date: string | Date): string => {
  return format(new Date(date), 'dd/MM/yyyy à HH:mm', { locale: fr });
};

export const formatRelativeTime = (date: string | Date): string => {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
};

export const formatVolume = (volumeL: number): string => {
  if (volumeL >= 1000000) {
    return `${(volumeL / 1000000).toFixed(1)}M L`;
  } else if (volumeL >= 1000) {
    return `${(volumeL / 1000).toFixed(0)}K L`;
  }
  return `${volumeL} L`;
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('fr-FR').format(num);
};

export const formatPercentage = (value: number, total: number): string => {
  return `${Math.round((value / total) * 100)}%`;
};
