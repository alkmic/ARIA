import React from 'react';
import { useTimePeriod } from '../../contexts/TimePeriodContext';
import { useTranslation } from '../../i18n';

interface PeriodSelectorProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  className = '',
  size = 'md'
}) => {
  const { timePeriod, setTimePeriod } = useTimePeriod();
  const { t } = useTranslation();

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
  };

  return (
    <select
      value={timePeriod}
      onChange={(e) => setTimePeriod(e.target.value as any)}
      className={`
        border border-slate-200 rounded-lg
        focus:outline-none focus:ring-2 focus:ring-al-blue-500
        bg-white text-slate-700
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <option value="month">{t('common.period.thisMonth')}</option>
      <option value="quarter">{t('common.period.thisQuarter')}</option>
      <option value="year">{t('common.period.thisYear')}</option>
    </select>
  );
};
