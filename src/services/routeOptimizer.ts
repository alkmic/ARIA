import type { Practitioner } from '../types';

export interface RouteOptimizationCriteria {
  optimizeFor: 'distance' | 'time' | 'kol_priority' | 'volume_priority';
  maxVisitsPerDay: number;
  prioritizeKOLs: boolean;
  prioritizeAtRisk: boolean;
}

export interface OptimizedRoute {
  day: number;
  practitioners: Practitioner[];
  totalDistance: number; // en km
  totalTime: number; // en minutes
  order: number[]; // indices dans l'ordre de visite
}

export interface RouteOptimizationResult {
  routes: OptimizedRoute[];
  totalDistance: number;
  totalTime: number;
  summary: string;
}

/**
 * Formule de Haversine pour calculer la distance entre deux coordonnées GPS
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calcule le temps de trajet estimé en fonction de la distance
 * Vitesse moyenne: 50 km/h en ville, 90 km/h hors ville
 * + temps de stationnement/marche: 5 min par visite
 */
function estimateTravelTime(distance: number): number {
  // Vitesse moyenne: 60 km/h
  const travelTime = (distance / 60) * 60; // minutes
  const parkingTime = 5; // minutes
  return travelTime + parkingTime;
}

/**
 * Génère des coordonnées pour un praticien basé sur sa ville
 */
const CITY_COORDS: Record<string, [number, number]> = {
  'LYON': [45.7640, 4.8357],
  'GRENOBLE': [45.1885, 5.7245],
  'VILLEURBANNE': [45.7676, 4.8799],
  'BOURG-EN-BRESSE': [46.2056, 5.2256],
  'ANNECY': [45.8992, 6.1294],
  'CHAMBÉRY': [45.5646, 5.9178],
  'VALENCE': [44.9334, 4.8924],
  'SAINT-ÉTIENNE': [45.4397, 4.3872],
  'VIENNE': [45.5245, 4.8774],
  'MONTÉLIMAR': [44.5581, 4.7509],
};

function getPractitionerCoords(practitioner: Practitioner): [number, number] {
  const cityKey = practitioner.city.toUpperCase().replace(/\s+\d.*$/, '').trim();
  const baseCoords = CITY_COORDS[cityKey] || CITY_COORDS['LYON'];

  // Ajouter un offset unique basé sur l'ID du praticien
  const hash = practitioner.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const latOffset = ((hash % 100) - 50) * 0.001;
  const lngOffset = ((hash * 13 % 100) - 50) * 0.001;

  return [baseCoords[0] + latOffset, baseCoords[1] + lngOffset];
}

/**
 * Algorithme de plus proche voisin (Nearest Neighbor) pour TSP
 */
function nearestNeighborTSP(
  practitioners: Practitioner[],
  startIndex: number = 0
): number[] {
  const n = practitioners.length;
  if (n === 0) return [];
  if (n === 1) return [0];

  const visited = new Set<number>();
  const route: number[] = [];
  let current = startIndex;

  route.push(current);
  visited.add(current);

  while (visited.size < n) {
    let nearestIndex = -1;
    let nearestDistance = Infinity;

    const [currentLat, currentLon] = getPractitionerCoords(practitioners[current]);

    for (let i = 0; i < n; i++) {
      if (!visited.has(i)) {
        const [lat, lon] = getPractitionerCoords(practitioners[i]);
        const distance = calculateDistance(currentLat, currentLon, lat, lon);

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }
    }

    if (nearestIndex !== -1) {
      route.push(nearestIndex);
      visited.add(nearestIndex);
      current = nearestIndex;
    } else {
      break;
    }
  }

  return route;
}

/**
 * Amélioration 2-opt pour optimiser la route
 */
function twoOptImprovement(
  practitioners: Practitioner[],
  route: number[]
): number[] {
  let improved = true;
  let bestRoute = [...route];

  while (improved) {
    improved = false;

    for (let i = 1; i < route.length - 1; i++) {
      for (let j = i + 1; j < route.length; j++) {
        const newRoute = [...bestRoute];
        // Inverser le segment entre i et j
        newRoute.splice(i, j - i + 1, ...bestRoute.slice(i, j + 1).reverse());

        const currentDistance = calculateRouteDistance(practitioners, bestRoute);
        const newDistance = calculateRouteDistance(practitioners, newRoute);

        if (newDistance < currentDistance) {
          bestRoute = newRoute;
          improved = true;
        }
      }
    }
  }

  return bestRoute;
}

/**
 * Calcule la distance totale d'une route
 */
function calculateRouteDistance(
  practitioners: Practitioner[],
  route: number[]
): number {
  let totalDistance = 0;

  for (let i = 0; i < route.length - 1; i++) {
    const [lat1, lon1] = getPractitionerCoords(practitioners[route[i]]);
    const [lat2, lon2] = getPractitionerCoords(practitioners[route[i + 1]]);
    totalDistance += calculateDistance(lat1, lon1, lat2, lon2);
  }

  return totalDistance;
}

/**
 * Score un praticien basé sur les critères de priorité
 */
function scorePractitioner(
  practitioner: Practitioner,
  criteria: RouteOptimizationCriteria
): number {
  let score = 0;

  if (criteria.prioritizeKOLs && practitioner.isKOL) {
    score += 100;
  }

  if (criteria.prioritizeAtRisk && practitioner.loyaltyScore < 6) {
    score += 50;
  }

  if (criteria.optimizeFor === 'volume_priority') {
    score += practitioner.volumeL / 1000; // Normaliser le volume
  }

  if (criteria.optimizeFor === 'kol_priority' && practitioner.isKOL) {
    score += 200;
  }

  return score;
}

/**
 * Optimise un itinéraire pour plusieurs jours
 */
export function optimizeRoute(
  practitioners: Practitioner[],
  criteria: RouteOptimizationCriteria
): RouteOptimizationResult {
  // Trier les praticiens par priorité
  const sortedPractitioners = [...practitioners].sort((a, b) => {
    return scorePractitioner(b, criteria) - scorePractitioner(a, criteria);
  });

  const routes: OptimizedRoute[] = [];
  let remainingPractitioners = [...sortedPractitioners];
  let dayNumber = 1;

  while (remainingPractitioners.length > 0) {
    // Prendre jusqu'à maxVisitsPerDay praticiens
    const dayPractitioners = remainingPractitioners.slice(0, criteria.maxVisitsPerDay);
    remainingPractitioners = remainingPractitioners.slice(criteria.maxVisitsPerDay);

    // Optimiser l'ordre de visite pour cette journée
    const initialRoute = nearestNeighborTSP(dayPractitioners);
    const optimizedOrder = twoOptImprovement(dayPractitioners, initialRoute);

    // Calculer distance et temps
    const totalDistance = calculateRouteDistance(dayPractitioners, optimizedOrder);
    const totalTime = optimizedOrder.reduce((sum, idx, i) => {
      if (i === optimizedOrder.length - 1) return sum + 30; // Dernière visite: 30 min

      const [lat1, lon1] = getPractitionerCoords(dayPractitioners[idx]);
      const [lat2, lon2] = getPractitionerCoords(dayPractitioners[optimizedOrder[i + 1]]);
      const distance = calculateDistance(lat1, lon1, lat2, lon2);
      return sum + estimateTravelTime(distance) + 30; // 30 min par visite
    }, 0);

    routes.push({
      day: dayNumber,
      practitioners: dayPractitioners,
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalTime: Math.round(totalTime),
      order: optimizedOrder,
    });

    dayNumber++;
  }

  const totalDistance = routes.reduce((sum, r) => sum + r.totalDistance, 0);
  const totalTime = routes.reduce((sum, r) => sum + r.totalTime, 0);

  const summary = `Itinéraire optimisé pour ${practitioners.length} praticiens sur ${routes.length} jour(s). ` +
    `Distance totale: ${Math.round(totalDistance)} km. ` +
    `Temps total: ${Math.round(totalTime / 60)}h${Math.round(totalTime % 60)}min.`;

  return {
    routes,
    totalDistance: Math.round(totalDistance * 10) / 10,
    totalTime: Math.round(totalTime),
    summary,
  };
}

/**
 * Optimise les tournées pour une équipe (vue manager)
 */
export function optimizeTeamRoutes(
  practitioners: Practitioner[],
  teamSize: number,
  criteria: RouteOptimizationCriteria
): Map<string, RouteOptimizationResult> {
  const teamRoutes = new Map<string, RouteOptimizationResult>();

  // Diviser les praticiens par équipe de manière équitable
  const practitionersPerTeam = Math.ceil(practitioners.length / teamSize);

  for (let i = 0; i < teamSize; i++) {
    const start = i * practitionersPerTeam;
    const end = Math.min((i + 1) * practitionersPerTeam, practitioners.length);
    const teamPractitioners = practitioners.slice(start, end);

    if (teamPractitioners.length > 0) {
      const result = optimizeRoute(teamPractitioners, criteria);
      teamRoutes.set(`Commercial ${i + 1}`, result);
    }
  }

  return teamRoutes;
}
