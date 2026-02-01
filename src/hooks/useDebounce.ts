import { useState, useEffect } from 'react';

/**
 * Hook pour debouncer une valeur
 * Retourne la valeur après un délai spécifié
 *
 * @param value - La valeur à debouncer
 * @param delay - Le délai en millisecondes (défaut: 300ms)
 * @returns La valeur debouncée
 *
 * @example
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedQuery = useDebounce(searchQuery, 500);
 *
 * useEffect(() => {
 *   // Cette recherche ne s'exécute que 500ms après l'arrêt de la saisie
 *   performSearch(debouncedQuery);
 * }, [debouncedQuery]);
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up le timer
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: annule le timer si value change avant le délai
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook pour debouncer une valeur avec statut de chargement
 * Retourne la valeur debouncée ET un booléen indiquant si le debounce est en cours
 *
 * @param value - La valeur à debouncer
 * @param delay - Le délai en millisecondes (défaut: 300ms)
 * @returns [debouncedValue, isDebouncing]
 *
 * @example
 * const [searchQuery, setSearchQuery] = useState('');
 * const [debouncedQuery, isSearching] = useDebounceWithStatus(searchQuery, 500);
 *
 * return (
 *   <div>
 *     <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
 *     {isSearching && <Spinner />}
 *   </div>
 * );
 */
export function useDebounceWithStatus<T>(
  value: T,
  delay: number = 300
): [T, boolean] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isDebouncing, setIsDebouncing] = useState<boolean>(false);

  useEffect(() => {
    // Si la valeur change, on commence à debouncer
    setIsDebouncing(true);

    const timer = setTimeout(() => {
      setDebouncedValue(value);
      setIsDebouncing(false);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return [debouncedValue, isDebouncing];
}
