import { useCallback } from 'react';
import { useLanguage } from './LanguageContext';
import { translations } from './translations';

export function useTranslation() {
  const { language } = useLanguage();

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const keys = key.split('.');
      let value: unknown = translations[language];

      for (const k of keys) {
        if (value && typeof value === 'object' && k in (value as Record<string, unknown>)) {
          value = (value as Record<string, unknown>)[k];
        } else {
          // Fallback to French
          let fallback: unknown = translations['fr'];
          for (const fk of keys) {
            if (fallback && typeof fallback === 'object' && fk in (fallback as Record<string, unknown>)) {
              fallback = (fallback as Record<string, unknown>)[fk];
            } else {
              return key; // Key not found at all
            }
          }
          value = fallback;
          break;
        }
      }

      if (typeof value !== 'string') {
        return key;
      }

      if (params) {
        return value.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
          return params[paramKey]?.toString() ?? `{{${paramKey}}}`;
        });
      }

      return value;
    },
    [language],
  );

  return { t, language };
}
