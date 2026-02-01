/**
 * Générateur pseudo-aléatoire avec seed pour génération reproductible
 * Utilise l'algorithme Mulberry32 pour avoir des résultats déterministes
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /**
   * Génère un nombre aléatoire entre 0 et 1
   */
  random(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Choix aléatoire dans un tableau
   */
  choice<T>(array: T[]): T {
    return array[Math.floor(this.random() * array.length)];
  }

  /**
   * Nombre entier aléatoire entre min et max (inclus)
   */
  int(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Boolean aléatoire avec une probabilité donnée
   */
  bool(probability: number = 0.5): boolean {
    return this.random() < probability;
  }

  /**
   * Mélange un tableau de manière reproductible (Fisher-Yates)
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
