import type { Database } from '../types/database';
import { generateDatabase } from './dataGenerator';

/**
 * Base de données centralisée des praticiens
 * Génération à la première utilisation pour cohérence
 */

let database: Database | null = null;

export function getDatabase(): Database {
  if (!database) {
    const practitioners = generateDatabase(120);

    database = {
      practitioners,
      lastUpdated: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  return database;
}

// Exporter la base de données
export const practitionersDB = getDatabase();
