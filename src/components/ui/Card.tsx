import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', hover = false, onClick }) => {
  const hoverStyles = hover
    ? 'hover:shadow-2xl hover:shadow-al-blue-500/20 cursor-pointer'
    : '';

  return (
    <div
      className={`glass-card p-6 transition-all duration-300 ${hoverStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
