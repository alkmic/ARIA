import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from '../i18n';

export type TimePeriod = 'month' | 'quarter' | 'year';

interface TimePeriodContextType {
  timePeriod: TimePeriod;
  setTimePeriod: (period: TimePeriod) => void;
  periodLabel: string;
  periodLabelShort: string;
}

const TimePeriodContext = createContext<TimePeriodContextType | undefined>(undefined);

export const TimePeriodProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');
  const { t } = useTranslation();

  const periodLabel =
    timePeriod === 'month' ? t('common.period.thisMonth') :
    timePeriod === 'quarter' ? t('common.period.thisQuarter') :
    t('common.period.thisYear');

  const periodLabelShort =
    timePeriod === 'month' ? t('common.period.monthly') :
    timePeriod === 'quarter' ? t('common.period.quarterly') :
    t('common.period.yearly');

  return (
    <TimePeriodContext.Provider value={{ timePeriod, setTimePeriod, periodLabel, periodLabelShort }}>
      {children}
    </TimePeriodContext.Provider>
  );
};

export const useTimePeriod = () => {
  const context = useContext(TimePeriodContext);
  if (!context) {
    throw new Error('useTimePeriod must be used within TimePeriodProvider');
  }
  return context;
};
