import React from 'react';
import { Search, Loader2 } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  isSearching?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Rechercher...',
  className = '',
  isSearching = false,
}) => {
  return (
    <div className={`relative ${className}`}>
      {isSearching ? (
        <Loader2 className="absolute left-4 top-1/2 transform -translate-y-1/2 text-al-blue-500 w-5 h-5 animate-spin" />
      ) : (
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field pl-12 w-full"
        aria-label={placeholder}
      />
    </div>
  );
};
