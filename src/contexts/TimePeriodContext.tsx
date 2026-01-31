import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

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

  const periodLabel =
    timePeriod === 'month' ? 'Ce mois' :
    timePeriod === 'quarter' ? 'Ce trimestre' :
    'Cette année';

  const periodLabelShort =
    timePeriod === 'month' ? 'mensuel' :
    timePeriod === 'quarter' ? 'trimestriel' :
    'annuel';

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
