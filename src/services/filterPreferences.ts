/**
 * Service de gestion des préférences de filtres
 * Persistance dans localStorage
 */

import type { FilterOptions } from '../types';

const STORAGE_KEY = 'aria_filter_preferences';

export interface SavedFilter {
  id: string;
  name: string;
  filters: FilterOptions;
  timestamp: string;
}

export class FilterPreferencesService {
  /**
   * Récupère les filtres sauvegardés
   */
  static getAll(): SavedFilter[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error loading filter preferences:', error);
      return [];
    }
  }

  /**
   * Sauvegarde un filtre
   */
  static save(name: string, filters: FilterOptions): SavedFilter {
    const newFilter: SavedFilter = {
      id: `filter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      filters,
      timestamp: new Date().toISOString(),
    };

    const saved = this.getAll();
    saved.push(newFilter);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch (error) {
      console.error('Error saving filter:', error);
    }

    return newFilter;
  }

  /**
   * Supprime un filtre sauvegardé
   */
  static delete(filterId: string): void {
    const saved = this.getAll().filter(f => f.id !== filterId);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch (error) {
      console.error('Error deleting filter:', error);
    }
  }

  /**
   * Met à jour un filtre sauvegardé
   */
  static update(filterId: string, name: string, filters: FilterOptions): void {
    const saved = this.getAll();
    const filter = saved.find(f => f.id === filterId);
    if (filter) {
      filter.name = name;
      filter.filters = filters;
      filter.timestamp = new Date().toISOString();

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      } catch (error) {
        console.error('Error updating filter:', error);
      }
    }
  }

  /**
   * Sauvegarde les filtres actifs (derniers utilisés)
   */
  static saveLastUsed(filters: FilterOptions): void {
    try {
      localStorage.setItem('aria_last_filters', JSON.stringify(filters));
    } catch (error) {
      console.error('Error saving last used filters:', error);
    }
  }

  /**
   * Récupère les derniers filtres utilisés
   */
  static getLastUsed(): FilterOptions | null {
    try {
      const stored = localStorage.getItem('aria_last_filters');
      if (!stored) return null;
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error loading last used filters:', error);
      return null;
    }
  }
}
