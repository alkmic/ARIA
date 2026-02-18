import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Clock,
  TrendingDown,
  Star,
  Droplets,
  Calendar,
  Navigation,
  Zap,
  CheckCircle,
  Download,
  Play,
  Users,
  Route as RouteIcon,
  Search,
  Filter,
  Home,
  ChevronRight,
  CalendarPlus,
  Check,
  Minus,
  Plus,
  Save
} from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { useTimePeriod } from '../contexts/TimePeriodContext';
import { useTranslation } from '../i18n';
import { PeriodSelector } from '../components/shared/PeriodSelector';
import type { Practitioner, UpcomingVisit } from '../types';
import 'leaflet/dist/leaflet.css';

// Coordonnées des villes
const CITY_COORDS: Record<string, [number, number]> = {
  'LYON': [45.7640, 4.8357],
  'GRENOBLE': [45.1885, 5.7245],
  'VALENCE': [44.9334, 4.8924],
  'SAINT-ÉTIENNE': [45.4397, 4.3872],
  'CHAMBÉRY': [45.5646, 5.9178],
  'ANNECY': [45.8992, 6.1294],
  'ANNEMASSE': [46.1958, 6.2354],
  'BOURG-EN-BRESSE': [46.2056, 5.2256],
  'VILLEURBANNE': [45.7667, 4.8800],
  'VÉNISSIEUX': [45.6975, 4.8867],
  'VIENNE': [45.5255, 4.8769],
  'VOIRON': [45.3663, 5.5897],
  'BOURGOIN-JALLIEU': [45.5858, 5.2739],
  'ROMANS-SUR-ISÈRE': [45.0458, 5.0522],
  'MONTÉLIMAR': [44.5586, 4.7508],
};

type Step = 'selection' | 'configuration' | 'optimization' | 'result';
type OptimizationCriteria = 'balanced' | 'time' | 'kol-first' | 'volume' | 'distance';

interface PractitionerWithCoords extends Practitioner {
  coords: [number, number];
  selected: boolean;
}

interface OptimizedDay {
  day: number;
  date: string;
  isoDate: string;
  visits: {
    practitioner: PractitionerWithCoords;
    order: number;
    arrivalTime: string;
    departureTime: string;
    travelTime: number;
    visitDuration: number;
    distance: number;
  }[];
  totalDistance: number;
  totalTravelTime: number;
  totalVisitTime: number;
  returnDistance: number;
  returnTravelTime: number;
  endTime: string;
}

interface OptimizationResult {
  days: OptimizedDay[];
  totalDistance: number;
  totalTravelTime: number;
  totalVisits: number;
  baselineDistance: number;
  baselineTravelTime: number;
  kmSaved: number;
  timeSaved: number;
  percentDistSaved: number;
  percentTimeSaved: number;
  totalKOLs: number;
  kolsInFirstHalf: number;
  totalVolumeCovered: number;
  criteria: OptimizationCriteria;
}

// Component pour ajuster le zoom de la carte
function MapBounds({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  React.useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

export const TourOptimizationPage: React.FC = () => {
  const navigate = useNavigate();
  const { practitioners, upcomingVisits, addVisits } = useAppStore();
  const [saved, setSaved] = useState(false);
  const { periodLabel } = useTimePeriod();
  const { t } = useTranslation();

  // IDs des praticiens déjà planifiés
  const alreadyPlannedIds = useMemo(() => {
    return new Set(upcomingVisits.map(v => v.practitionerId));
  }, [upcomingVisits]);

  // État pour montrer/cacher les visites déjà planifiées
  const [showPlanned, setShowPlanned] = useState(false);

  // État principal
  const [currentStep, setCurrentStep] = useState<Step>('selection');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
  const [filterKOL, setFilterKOL] = useState<boolean | null>(null);

  // Configuration
  const [criteria, setCriteria] = useState<OptimizationCriteria>('balanced');
  const [startPoint, setStartPoint] = useState<'lyon' | 'grenoble' | 'home'>('lyon');
  const [visitsPerDay, setVisitsPerDay] = useState(6);
  const [visitDuration, setVisitDuration] = useState(45);
  const [startDate, setStartDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });

  // Optimisation
  const [optimizationStep, setOptimizationStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [editableResult, setEditableResult] = useState<OptimizedDay[]>([]);
  const [activeDay, setActiveDay] = useState(0);

  const startCoords: Record<string, [number, number]> = {
    lyon: [45.7640, 4.8357],
    grenoble: [45.1885, 5.7245],
    home: [45.7800, 4.8600],
  };

  // Générer des coordonnées pour un praticien
  const generatePractitionerCoords = useCallback((practitioner: Practitioner): [number, number] => {
    let cityKey = practitioner.city.toUpperCase();
    let baseCoords = CITY_COORDS[cityKey];

    if (!baseCoords) {
      if (cityKey.startsWith('LYON')) baseCoords = CITY_COORDS['LYON'];
      else if (cityKey.startsWith('GRENOBLE')) baseCoords = CITY_COORDS['GRENOBLE'];
      else if (cityKey.startsWith('ANNECY')) baseCoords = CITY_COORDS['ANNECY'];
      else {
        const cityWords = cityKey.split(/[\s-]+/);
        const match = Object.keys(CITY_COORDS).find(key => key.startsWith(cityWords[0]));
        if (match) baseCoords = CITY_COORDS[match];
      }
    }

    if (!baseCoords) baseCoords = [45.7640, 4.8357];

    const hashString = `${practitioner.id}-${practitioner.firstName}-${practitioner.lastName}`;
    let hash = 0;
    for (let i = 0; i < hashString.length; i++) {
      hash = ((hash << 5) - hash) + hashString.charCodeAt(i);
      hash = hash & hash;
    }

    const latOffset = ((Math.abs(hash) % 100) - 50) * 0.001;
    const lngOffset = ((Math.abs(hash * 13) % 100) - 50) * 0.001;

    return [baseCoords[0] + latOffset, baseCoords[1] + lngOffset];
  }, []);

  // Praticiens avec coordonnées et filtres
  const practitionersWithCoords = useMemo(() => {
    return practitioners
      .filter(p => {
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
          if (!fullName.includes(query) && !p.city.toLowerCase().includes(query)) {
            return false;
          }
        }
        if (filterSpecialty !== 'all' && p.specialty !== filterSpecialty) return false;
        if (filterKOL === true && !p.isKOL) return false;
        if (filterKOL === false && p.isKOL) return false;
        return true;
      })
      .map(p => ({
        ...p,
        coords: generatePractitionerCoords(p),
        selected: selectedIds.has(p.id),
      }));
  }, [practitioners, searchQuery, filterSpecialty, filterKOL, selectedIds, generatePractitionerCoords]);

  const selectedPractitioners = useMemo(() => {
    return practitionersWithCoords.filter(p => selectedIds.has(p.id));
  }, [practitionersWithCoords, selectedIds]);

  // Fonctions de sélection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(practitionersWithCoords.map(p => p.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const selectKOLs = () => {
    const kolIds = practitionersWithCoords.filter(p => p.isKOL).map(p => p.id);
    setSelectedIds(prev => new Set([...prev, ...kolIds]));
  };

  const selectTopVingtile = () => {
    const topIds = practitionersWithCoords.filter(p => p.vingtile <= 5).map(p => p.id);
    setSelectedIds(prev => new Set([...prev, ...topIds]));
  };

  // Calcul de distance (haversine × facteur route pour approximer la distance réelle)
  const calculateDistance = (coords1: [number, number], coords2: [number, number]): number => {
    const R = 6371;
    const dLat = (coords2[0] - coords1[0]) * Math.PI / 180;
    const dLon = (coords2[1] - coords1[1]) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(coords1[0] * Math.PI / 180) * Math.cos(coords2[0] * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const haversine = R * c;
    // Facteur route : les routes réelles sont ~30% plus longues que le vol d'oiseau
    // (virages, relief, réseau routier — typique pour Rhône-Alpes)
    return haversine * 1.3;
  };

  // Temps de trajet réaliste selon la distance (vitesse adaptative)
  const estimateTravelMinutes = (distKm: number): number => {
    if (distKm <= 5) return Math.ceil((distKm / 25) * 60);   // 25 km/h urbain
    if (distKm <= 30) return Math.ceil((distKm / 45) * 60);  // 45 km/h périurbain
    return Math.ceil((distKm / 70) * 60);                     // 70 km/h interurbain
  };

  // Algorithme Nearest Neighbor
  const nearestNeighborTSP = (
    practs: PractitionerWithCoords[],
    start: [number, number]
  ): PractitionerWithCoords[] => {
    const result: PractitionerWithCoords[] = [];
    const remaining = [...practs];
    let current = start;

    while (remaining.length > 0) {
      let nearestIndex = 0;
      let minDist = calculateDistance(current, remaining[0].coords);

      for (let i = 1; i < remaining.length; i++) {
        const dist = calculateDistance(current, remaining[i].coords);
        if (dist < minDist) {
          minDist = dist;
          nearestIndex = i;
        }
      }

      const nearest = remaining[nearestIndex];
      result.push(nearest);
      current = nearest.coords;
      remaining.splice(nearestIndex, 1);
    }

    return result;
  };

  // Amélioration 2-opt (inclut le retour à la base pour un vrai round-trip)
  const twoOptImprovement = (route: PractitionerWithCoords[], start: [number, number]): PractitionerWithCoords[] => {
    if (route.length <= 1) return route;
    let improved = true;
    let bestRoute = [...route];

    const calcRouteDistance = (r: PractitionerWithCoords[]) => {
      let total = calculateDistance(start, r[0].coords);
      for (let i = 0; i < r.length - 1; i++) {
        total += calculateDistance(r[i].coords, r[i + 1].coords);
      }
      total += calculateDistance(r[r.length - 1].coords, start); // retour base
      return total;
    };

    let bestDist = calcRouteDistance(bestRoute);

    while (improved) {
      improved = false;

      for (let i = 0; i < bestRoute.length - 1; i++) {
        for (let j = i + 1; j < bestRoute.length; j++) {
          const newRoute = [
            ...bestRoute.slice(0, i),
            ...bestRoute.slice(i, j + 1).reverse(),
            ...bestRoute.slice(j + 1)
          ];

          const newDist = calcRouteDistance(newRoute);
          if (newDist < bestDist) {
            bestRoute = newRoute;
            bestDist = newDist;
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
    }

    return bestRoute;
  };

  // Lancer l'optimisation
  const runOptimization = async () => {
    if (selectedPractitioners.length === 0) return;

    setCurrentStep('optimization');
    setProgress(0);
    setResult(null);

    const start = startCoords[startPoint];
    const steps = [
      { label: 'Géolocalisation des praticiens', duration: 600 },
      { label: 'Calcul de la matrice de distances', duration: 800 },
      { label: 'Évaluation des priorités stratégiques', duration: 500 },
      { label: 'Optimisation TSP par jour', duration: 1200 },
      { label: 'Amélioration 2-opt des itinéraires', duration: 800 },
      { label: 'Ajustement des horaires', duration: 500 },
      { label: 'Calcul des gains', duration: 400 },
    ];

    // Animation des étapes
    let currentProgress = 0;
    for (const step of steps) {
      setOptimizationStep(step.label);
      await new Promise(resolve => setTimeout(resolve, step.duration));
      currentProgress += 100 / steps.length;
      setProgress(Math.min(currentProgress, 100));
    }

    // === OPTIMISATION GLOBALE PAR CLUSTERING GÉOGRAPHIQUE ===

    // 1. Tournée nearest-neighbor globale sur TOUS les praticiens
    //    → regroupe naturellement les praticiens géographiquement proches
    const globalTour = nearestNeighborTSP(selectedPractitioners, start);

    // 2. Distribution équilibrée en jours
    const numDays = Math.ceil(globalTour.length / visitsPerDay);
    const balancedPerDay = Math.ceil(globalTour.length / numDays);

    // 3. Créer les clusters géographiques par jour
    let dayClusters: PractitionerWithCoords[][] = [];
    for (let d = 0; d < numDays; d++) {
      const cluster = globalTour.slice(d * balancedPerDay, (d + 1) * balancedPerDay);
      if (cluster.length > 0) dayClusters.push(cluster);
    }

    // 4. Optimiser l'ordre intra-jour: NN depuis la base + 2-opt
    //    Le global NN détermine le groupement, mais l'ordre intra-jour
    //    est recalculé indépendamment depuis le point de départ
    dayClusters = dayClusters.map(cluster => {
      const nnRoute = nearestNeighborTSP(cluster, start);
      return twoOptImprovement(nnRoute, start);
    });

    // 5. Réordonner les jours selon le critère choisi
    switch (criteria) {
      case 'kol-first':
        dayClusters.sort((a, b) => {
          const kolsA = a.filter(p => p.isKOL).length;
          const kolsB = b.filter(p => p.isKOL).length;
          if (kolsB !== kolsA) return kolsB - kolsA;
          return b.reduce((s, p) => s + p.volumeL, 0) - a.reduce((s, p) => s + p.volumeL, 0);
        });
        break;
      case 'volume':
        dayClusters.sort((a, b) =>
          b.reduce((s, p) => s + p.volumeL, 0) - a.reduce((s, p) => s + p.volumeL, 0)
        );
        break;
      case 'distance':
      case 'time':
        // Plus proches du point de départ en premier
        dayClusters.sort((a, b) => {
          const avgA = a.reduce((s, p) => s + calculateDistance(start, p.coords), 0) / a.length;
          const avgB = b.reduce((s, p) => s + calculateDistance(start, p.coords), 0) / b.length;
          return avgA - avgB;
        });
        break;
      case 'balanced':
      default: {
        const maxVol = Math.max(...globalTour.map(p => p.volumeL), 1);
        dayClusters.sort((a, b) => {
          const scoreA = a.filter(p => p.isKOL).length * 3
            + a.reduce((s, p) => s + p.volumeL, 0) / (maxVol * a.length) * 2;
          const scoreB = b.filter(p => p.isKOL).length * 3
            + b.reduce((s, p) => s + p.volumeL, 0) / (maxVol * b.length) * 2;
          return scoreB - scoreA;
        });
        break;
      }
    }

    // Pré-calculer les dates ouvrées (sauter weekends correctement)
    const workingDates: Date[] = [];
    {
      let nextDate = new Date(startDate);
      while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
        nextDate.setDate(nextDate.getDate() + 1);
      }
      for (let i = 0; i < dayClusters.length; i++) {
        workingDates.push(new Date(nextDate));
        nextDate.setDate(nextDate.getDate() + 1);
        while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
          nextDate.setDate(nextDate.getDate() + 1);
        }
      }
    }

    // Baseline: ordre de sélection original, pas de clustering géographique
    let baselineDistance = 0;
    let baselineTravelTime = 0;
    for (let d = 0; d < numDays; d++) {
      const dayPracts = selectedPractitioners.slice(d * balancedPerDay, (d + 1) * balancedPerDay);
      if (dayPracts.length === 0) continue;
      let prev = start;
      for (const p of dayPracts) {
        const segDist = calculateDistance(prev, p.coords);
        baselineDistance += segDist;
        baselineTravelTime += estimateTravelMinutes(segDist);
        prev = p.coords;
      }
      const retDist = calculateDistance(prev, start);
      baselineDistance += retDist;
      baselineTravelTime += estimateTravelMinutes(retDist);
    }

    // Construire le résultat jour par jour
    const days: OptimizedDay[] = [];
    let totalDistanceAll = 0;
    let totalTravelTimeAll = 0;
    let totalKOLs = 0;
    let totalVolume = 0;

    for (let d = 0; d < dayClusters.length; d++) {
      const optimizedRoute = dayClusters[d];

      let dayDistance = 0;
      let dayTravelTime = 0;
      let dayVisitTime = 0;
      const visits: OptimizedDay['visits'] = [];
      let currentTime = 9 * 60; // 9h00
      let prevCoords = start;

      for (let i = 0; i < optimizedRoute.length; i++) {
        const p = optimizedRoute[i];
        const dist = calculateDistance(prevCoords, p.coords);
        const travel = estimateTravelMinutes(dist);

        if (p.isKOL) totalKOLs++;
        totalVolume += p.volumeL;

        dayDistance += dist;
        dayTravelTime += travel;
        dayVisitTime += visitDuration;
        currentTime += travel;

        // Pause déjeuner: si l'arrivée tombe entre 12h et 13h, attendre 13h
        if (currentTime >= 12 * 60 && currentTime < 13 * 60) {
          currentTime = 13 * 60;
        }

        const arrivalTime = `${Math.floor(currentTime / 60)}h${(currentTime % 60).toString().padStart(2, '0')}`;
        const endOfVisit = currentTime + visitDuration;
        const departureTime = `${Math.floor(endOfVisit / 60)}h${(endOfVisit % 60).toString().padStart(2, '0')}`;

        visits.push({
          practitioner: p,
          order: i + 1,
          arrivalTime,
          departureTime,
          travelTime: Math.round(travel),
          visitDuration,
          distance: Math.round(dist * 10) / 10,
        });

        currentTime += visitDuration;
        prevCoords = p.coords;
      }

      // Retour à la base
      const returnDist = calculateDistance(prevCoords, start);
      const returnTravelMin = estimateTravelMinutes(returnDist);
      dayDistance += returnDist;
      dayTravelTime += returnTravelMin;
      currentTime += returnTravelMin;
      const endTime = `${Math.floor(currentTime / 60)}h${(currentTime % 60).toString().padStart(2, '0')}`;

      const dayDate = workingDates[d];
      const roundedDayDist = Math.round(dayDistance * 10) / 10;
      const roundedDayTravel = Math.round(dayTravelTime);

      days.push({
        day: d + 1,
        date: dayDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
        isoDate: dayDate.toISOString().split('T')[0],
        visits,
        totalDistance: roundedDayDist,
        totalTravelTime: roundedDayTravel,
        totalVisitTime: dayVisitTime,
        returnDistance: Math.round(returnDist * 10) / 10,
        returnTravelTime: Math.round(returnTravelMin),
        endTime,
      });

      totalDistanceAll += roundedDayDist;
      totalTravelTimeAll += roundedDayTravel;
    }

    // KOLs dans la première moitié des jours
    const halfDays = Math.ceil(days.length / 2);
    const kolsInFirstHalf = days.slice(0, halfDays).reduce((sum, d) =>
      sum + d.visits.filter(v => v.practitioner.isKOL).length, 0
    );

    const roundedBaselineDist = Math.round(baselineDistance * 10) / 10;
    const roundedBaselineTime = Math.round(baselineTravelTime);
    const kmSaved = Math.max(0, Math.round((roundedBaselineDist - totalDistanceAll) * 10) / 10);
    const timeSaved = Math.max(0, roundedBaselineTime - totalTravelTimeAll);

    const finalResult: OptimizationResult = {
      days,
      totalDistance: Math.round(totalDistanceAll * 10) / 10,
      totalTravelTime: Math.round(totalTravelTimeAll),
      totalVisits: selectedPractitioners.length,
      baselineDistance: roundedBaselineDist,
      baselineTravelTime: roundedBaselineTime,
      kmSaved,
      timeSaved,
      percentDistSaved: roundedBaselineDist > 0 ? Math.round((kmSaved / roundedBaselineDist) * 100) : 0,
      percentTimeSaved: roundedBaselineTime > 0 ? Math.round((timeSaved / roundedBaselineTime) * 100) : 0,
      totalKOLs,
      kolsInFirstHalf,
      totalVolumeCovered: totalVolume,
      criteria,
    };

    setResult(finalResult);
    setEditableResult(days);
    setCurrentStep('result');
  };

  // Créer les icônes de carte
  const createNumberIcon = (number: number, isKOL: boolean) => {
    const color = isKOL ? '#F59E0B' : '#0066B3';
    return L.divIcon({
      html: `
        <div style="
          width: 32px;
          height: 32px;
          background: ${color};
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          ${number}
        </div>
      `,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  const createStartIcon = () => {
    return L.divIcon({
      html: `
        <div style="
          width: 40px;
          height: 40px;
          background: #10B981;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          border: 3px solid white;
          box-shadow: 0 3px 10px rgba(0,0,0,0.4);
        ">
          H
        </div>
      `,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  // Calculer les bounds pour la carte
  const mapBounds = useMemo(() => {
    if (!result || result.days.length === 0) return null;
    const activeVisits = editableResult[activeDay]?.visits || [];
    if (activeVisits.length === 0) return null;

    const start = startCoords[startPoint];
    const coords = [start, ...activeVisits.map(v => v.practitioner.coords)];
    const lats = coords.map(c => c[0]);
    const lngs = coords.map(c => c[1]);
    return L.latLngBounds(
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    );
  }, [result, editableResult, activeDay, startPoint]);

  // Route pour la carte
  const mapRoute = useMemo(() => {
    if (!editableResult[activeDay]) return [];
    const start = startCoords[startPoint];
    return [start, ...editableResult[activeDay].visits.map(v => v.practitioner.coords), start];
  }, [editableResult, activeDay, startPoint]);

  // Critères d'optimisation avec bénéfices attendus
  const criteriaOptions = [
    {
      id: 'balanced' as const,
      label: t('tour.criteria.balanced'),
      icon: Zap,
      description: t('tour.criteria.balancedDesc'),
      benefit: t('tour.criteria.balancedBenefit'),
      expectedSaving: t('tour.criteria.balancedSaving')
    },
    {
      id: 'time' as const,
      label: t('tour.criteria.time'),
      icon: Clock,
      description: t('tour.criteria.timeDesc'),
      benefit: t('tour.criteria.timeBenefit'),
      expectedSaving: t('tour.criteria.timeSaving')
    },
    {
      id: 'kol-first' as const,
      label: t('tour.criteria.kolFirst'),
      icon: Star,
      description: t('tour.criteria.kolFirstDesc'),
      benefit: t('tour.criteria.kolFirstBenefit'),
      expectedSaving: t('tour.criteria.kolFirstSaving')
    },
    {
      id: 'volume' as const,
      label: t('tour.criteria.volume'),
      icon: Droplets,
      description: t('tour.criteria.volumeDesc'),
      benefit: t('tour.criteria.volumeBenefit'),
      expectedSaving: t('tour.criteria.volumeSaving')
    },
    {
      id: 'distance' as const,
      label: t('tour.criteria.distance'),
      icon: Navigation,
      description: t('tour.criteria.distanceDesc'),
      benefit: t('tour.criteria.distanceBenefit'),
      expectedSaving: t('tour.criteria.distanceSaving')
    },
  ];

  // Export PDF (simulation)
  const exportPDF = () => {
    alert('Export PDF - Fonctionnalité à intégrer avec une vraie génération PDF');
  };

  // Save to visits
  const saveToVisits = () => {
    if (!result || saved) return;

    const newVisits: UpcomingVisit[] = [];
    let visitCounter = Date.now();

    result.days.forEach((day) => {
      day.visits.forEach((visit) => {
        const p = visit.practitioner;
        newVisits.push({
          id: `V-OPT-${visitCounter++}`,
          practitionerId: p.id,
          practitioner: p,
          date: day.isoDate,
          time: visit.arrivalTime.replace('h', ':').padStart(5, '0'),
          type: 'scheduled',
          notes: `Visite planifiée via optimisation de tournée (${criteriaOptions.find(c => c.id === criteria)?.label})`,
        });
      });
    });

    addVisits(newVisits);
    setSaved(true);
  };

  // Export iCal
  const exportIcal = () => {
    if (!result) return;

    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    let ical = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ARIA//Tour Optimization//FR\nCALSCALE:GREGORIAN\n';

    result.days.forEach(day => {
      day.visits.forEach(visit => {
        const p = visit.practitioner;
        const dateStr = day.isoDate.replace(/-/g, '');
        const arrParts = visit.arrivalTime.split('h');
        const depParts = visit.departureTime.split('h');
        const dtStart = `${dateStr}T${arrParts[0].padStart(2, '0')}${arrParts[1]}00`;
        const dtEnd = `${dateStr}T${depParts[0].padStart(2, '0')}${depParts[1]}00`;
        const uid = `${day.isoDate}-${p.id}@aria-tour`;

        ical += 'BEGIN:VEVENT\n';
        ical += `UID:${uid}\n`;
        ical += `DTSTAMP:${now}\n`;
        ical += `DTSTART:${dtStart}\n`;
        ical += `DTEND:${dtEnd}\n`;
        ical += `SUMMARY:Visite - ${p.title} ${p.lastName}\n`;
        ical += `DESCRIPTION:${p.specialty} - ${p.city}\n`;
        ical += `LOCATION:${p.city}\n`;
        ical += 'END:VEVENT\n';
      });
    });

    ical += 'END:VCALENDAR';

    const blob = new Blob([ical], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tournee-optimisee.ics';
    a.click();
  };

  // Étapes du wizard
  const stepConfig = [
    { id: 'selection', label: t('tour.steps.selection'), icon: Users },
    { id: 'configuration', label: t('tour.steps.configuration'), icon: Filter },
    { id: 'optimization', label: t('tour.steps.optimization'), icon: Zap },
    { id: 'result', label: t('tour.steps.result'), icon: CheckCircle },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-slate-600 hover:text-al-blue-500 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">{t('tour.backToDashboard')}</span>
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
              <RouteIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
                {t('tour.title')}
              </h1>
              <p className="text-slate-600 mt-1">
                {t('tour.subtitle')}
              </p>
            </div>
          </div>
          <PeriodSelector />
        </div>
      </motion.div>

      {/* Progress Steps */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          {stepConfig.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  currentStep === step.id
                    ? 'bg-al-blue-500 text-white'
                    : stepConfig.findIndex(s => s.id === currentStep) > idx
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                <step.icon className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:block">{step.label}</span>
              </div>
              {idx < stepConfig.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-300 hidden sm:block" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 1: Selection */}
      <AnimatePresence mode="wait">
        {currentStep === 'selection' && (
          <motion.div
            key="selection"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Filters */}
            <div className="glass-card p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder={t('tour.searchPractitioner')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-al-blue-500"
                    />
                  </div>
                </div>

                <select
                  value={filterSpecialty}
                  onChange={(e) => setFilterSpecialty(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-al-blue-500"
                >
                  <option value="all">{t('tour.allSpecialties')}</option>
                  <option value="Pneumologue">{t('tour.pneumologists')}</option>
                  <option value="Médecin généraliste">{t('tour.generalists')}</option>
                </select>

                <select
                  value={filterKOL === null ? 'all' : filterKOL ? 'kol' : 'non-kol'}
                  onChange={(e) => setFilterKOL(e.target.value === 'all' ? null : e.target.value === 'kol')}
                  className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-al-blue-500"
                >
                  <option value="all">{t('tour.allPractitioners')}</option>
                  <option value="kol">{t('tour.kolsOnly')}</option>
                  <option value="non-kol">{t('tour.nonKols')}</option>
                </select>
              </div>

              {/* Quick select buttons */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-200">
                <button onClick={selectAll} className="btn-secondary text-xs py-1.5 px-3">
                  {t('tour.selectAll')}
                </button>
                <button onClick={deselectAll} className="btn-secondary text-xs py-1.5 px-3">
                  {t('tour.deselectAll')}
                </button>
                <button onClick={selectKOLs} className="btn-secondary text-xs py-1.5 px-3">
                  <Star className="w-3 h-3 mr-1" />
                  {t('tour.addKols')}
                </button>
                <button onClick={selectTopVingtile} className="btn-secondary text-xs py-1.5 px-3">
                  <Droplets className="w-3 h-3 mr-1" />
                  {t('tour.topVingtile')}
                </button>
              </div>
            </div>

            {/* Selection count and planned visits info */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-4">
                <p className="text-sm text-slate-600">
                  <span className="font-bold text-al-blue-600">{selectedIds.size}</span> {t('tour.selectedCount', { total: String(practitionersWithCoords.length) })}
                </p>
                {alreadyPlannedIds.size > 0 && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPlanned}
                      onChange={(e) => setShowPlanned(e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded"
                    />
                    <span className="text-amber-700">
                      {t('tour.showPlanned', { count: String(alreadyPlannedIds.size) })}
                    </span>
                  </label>
                )}
              </div>
              <p className="text-sm text-slate-600">
                {t('tour.periodLabel', { period: periodLabel })}
              </p>
            </div>

            {/* Practitioners grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-2">
              {practitionersWithCoords
                .filter(p => showPlanned || !alreadyPlannedIds.has(p.id))
                .map((p) => {
                  const isPlanned = alreadyPlannedIds.has(p.id);
                  const plannedVisit = upcomingVisits.find(v => v.practitionerId === p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleSelect(p.id)}
                      className={`glass-card p-4 cursor-pointer transition-all hover:shadow-md relative ${
                        selectedIds.has(p.id)
                          ? 'ring-2 ring-al-blue-500 bg-al-blue-50'
                          : isPlanned
                          ? 'bg-amber-50 border-amber-200'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {isPlanned && (
                        <div className="absolute top-2 right-2 bg-amber-500 text-white text-[11px] px-2 py-0.5 rounded-full font-medium">
                          {t('tour.planned', { date: plannedVisit?.date || '' })}
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                          p.isKOL ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
                          p.specialty === 'Pneumologue' ? 'bg-gradient-to-br from-al-blue-500 to-al-blue-600' :
                          'bg-gradient-to-br from-slate-500 to-slate-600'
                        }`}>
                          {p.firstName[0]}{p.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-800 truncate">
                              {p.title} {p.lastName}
                            </p>
                            {p.isKOL && <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-slate-500">{p.specialty}</p>
                          <p className="text-xs text-slate-500">{p.city} • V{p.vingtile}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          selectedIds.has(p.id)
                            ? 'bg-al-blue-500 border-al-blue-500'
                            : 'border-slate-300'
                        }`}>
                          {selectedIds.has(p.id) && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Next button */}
            <div className="flex justify-end">
              <button
                onClick={() => setCurrentStep('configuration')}
                disabled={selectedIds.size === 0}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {t('tour.continue')}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Configuration */}
        {currentStep === 'configuration' && (
          <motion.div
            key="configuration"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Critère d'optimisation */}
            <div className="glass-card p-6">
              <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-500" />
                {t('tour.optimizationCriteria')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {criteriaOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setCriteria(opt.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      criteria === opt.id
                        ? 'border-purple-500 bg-purple-50 shadow-md scale-[1.02]'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <opt.icon className={`w-5 h-5 ${criteria === opt.id ? 'text-purple-600' : 'text-slate-500'}`} />
                      <span className="font-bold text-sm">{opt.label}</span>
                    </div>
                    <div className="text-xs text-slate-600">{opt.description}</div>
                    <div className={`text-xs mt-2 font-medium ${criteria === opt.id ? 'text-purple-600' : 'text-green-600'}`}>
                      {opt.expectedSaving}
                    </div>
                  </button>
                ))}
              </div>

              {/* Benefit details for selected criteria */}
              <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
                    {(() => {
                      const opt = criteriaOptions.find(o => o.id === criteria);
                      return opt ? <opt.icon className="w-5 h-5 text-white" /> : null;
                    })()}
                  </div>
                  <div>
                    <h4 className="font-bold text-purple-800">
                      {criteriaOptions.find(o => o.id === criteria)?.label}
                    </h4>
                    <p className="text-sm text-purple-700 mt-1">
                      {criteriaOptions.find(o => o.id === criteria)?.benefit}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Configuration détaillée */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Point de départ */}
              <div className="glass-card p-6">
                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                  <Home className="w-5 h-5 text-green-500" />
                  {t('tour.startPointLabel')}
                </h3>
                <div className="space-y-3">
                  {[
                    { id: 'lyon', label: t('tour.startPoints.lyon'), desc: t('tour.startPoints.lyonDesc') },
                    { id: 'grenoble', label: t('tour.startPoints.grenoble'), desc: t('tour.startPoints.grenobleDesc') },
                    { id: 'home', label: t('tour.startPoints.home'), desc: t('tour.startPoints.homeDesc') },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setStartPoint(opt.id as any)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        startPoint === opt.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-xs text-slate-500">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Paramètres */}
              <div className="glass-card p-6">
                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                  <Filter className="w-5 h-5 text-blue-500" />
                  {t('tour.parameters')}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('tour.startDate')}
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-al-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('tour.visitsPerDay', { count: String(visitsPerDay) })}
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setVisitsPerDay(Math.max(3, visitsPerDay - 1))}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="range"
                        min="3"
                        max="10"
                        value={visitsPerDay}
                        onChange={(e) => setVisitsPerDay(parseInt(e.target.value))}
                        className="flex-1 accent-al-blue-500"
                      />
                      <button
                        onClick={() => setVisitsPerDay(Math.min(10, visitsPerDay + 1))}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('tour.visitDuration', { minutes: String(visitDuration) })}
                    </label>
                    <div className="flex gap-2">
                      {[30, 45, 60].map((d) => (
                        <button
                          key={d}
                          onClick={() => setVisitDuration(d)}
                          className={`flex-1 py-2 rounded-lg border-2 transition-all ${
                            visitDuration === d
                              ? 'border-al-blue-500 bg-al-blue-50 text-al-blue-700 font-bold'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {d} min
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="glass-card p-6 bg-gradient-to-br from-purple-50 to-blue-50">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">{t('tour.summary')}</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {t('tour.summaryText', { count: String(selectedIds.size), days: String(Math.ceil(selectedIds.size / visitsPerDay)) })} •
                    {t('tour.start')}: {new Date(startDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCurrentStep('selection')}
                    className="btn-secondary"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('tour.back')}
                  </button>
                  <button
                    onClick={runOptimization}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    {t('tour.launchOptimization')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Optimization (loading) */}
        {currentStep === 'optimization' && (
          <motion.div
            key="optimization"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card p-8"
          >
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-xl text-slate-800 mb-2">{t('tour.optimizing')}</h3>
              <p className="text-slate-600 mb-6">{optimizationStep}</p>

              <div className="relative h-4 bg-slate-200 rounded-full overflow-hidden mb-2">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-blue-600"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="text-sm font-bold text-slate-700">{Math.round(progress)}%</div>
            </div>
          </motion.div>
        )}

        {/* Step 4: Result */}
        {currentStep === 'result' && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Métrique critère + bandeau gain */}
            {criteria === 'kol-first' || criteria === 'volume' ? (
              <div className="glass-card p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
                <div className="flex items-center gap-3">
                  {criteria === 'kol-first'
                    ? <Star className="w-6 h-6 text-amber-600" />
                    : <Droplets className="w-6 h-6 text-amber-600" />}
                  <div>
                    <div className="font-bold text-amber-800">
                      {criteria === 'kol-first'
                        ? t('tour.kolsPlanned', { count: String(result.totalKOLs) })
                        : `Volume ciblé : ${Math.round(result.totalVolumeCovered / 1000)}K L`}
                    </div>
                    <div className="text-sm text-amber-700">
                      {criteria === 'kol-first'
                        ? `${result.kolsInFirstHalf} KOLs dans les ${Math.ceil(result.days.length / 2)} premiers jours, puis optimisation des trajets`
                        : `${result.totalVisits} prescripteurs visités, triés par volume puis trajets optimisés`}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* KPIs toujours visibles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Distance économisée */}
              <div className="glass-card p-4 bg-gradient-to-br from-green-50 to-emerald-50">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-slate-600">{t('tour.distanceSaved')}</span>
                </div>
                <div className="text-2xl font-bold text-green-700">
                  {result.kmSaved > 0 ? `${result.kmSaved} km` : '~0 km'}
                </div>
                <div className="text-xs text-green-600 mt-1">
                  {result.percentDistSaved > 0
                    ? t('tour.vsWithoutOpt', { pct: String(result.percentDistSaved) })
                    : t('tour.groupedByZone')}
                </div>
              </div>

              {/* Card 2: Distance totale */}
              <div className="glass-card p-4 bg-gradient-to-br from-purple-50 to-pink-50">
                <div className="flex items-center gap-2 mb-2">
                  <Navigation className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-slate-600">{t('tour.totalDistance')}</span>
                </div>
                <div className="text-2xl font-bold text-purple-700">{result.totalDistance} km</div>
                <div className="text-xs text-slate-500 mt-1">
                  {result.baselineDistance > result.totalDistance
                    ? `vs ${result.baselineDistance} km sans optim.`
                    : `${result.totalVisits} visites optimisées`}
                </div>
              </div>

              {/* Card 3: Temps de trajet */}
              <div className="glass-card p-4 bg-gradient-to-br from-blue-50 to-cyan-50">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-slate-600">{t('tour.travelTime')}</span>
                </div>
                <div className="text-2xl font-bold text-blue-700">
                  {result.totalTravelTime >= 60
                    ? `${Math.floor(result.totalTravelTime / 60)}h${(result.totalTravelTime % 60).toString().padStart(2, '0')}`
                    : `${result.totalTravelTime} min`}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {result.timeSaved > 0
                    ? `${result.timeSaved} min économisées (-${result.percentTimeSaved}%)`
                    : 'Temps global de conduite'}
                </div>
              </div>

              {/* Card 4: Jours planifiés */}
              <div className="glass-card p-4 bg-gradient-to-br from-slate-50 to-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-slate-600" />
                  <span className="text-sm text-slate-600">{t('tour.plannedDays')}</span>
                </div>
                <div className="text-2xl font-bold text-slate-700">{result.days.length}</div>
                <div className="text-xs text-slate-500 mt-1">{t('tour.totalVisits', { count: String(result.totalVisits) })}</div>
              </div>
            </div>

            {/* Tabs pour les jours */}
            <div className="glass-card p-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {result.days.map((day, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveDay(idx)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                      activeDay === idx
                        ? 'bg-al-blue-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t('tour.dayLabel', { day: String(day.day) })} - {day.date.split(' ').slice(0, 2).join(' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Carte et liste */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Carte */}
              <div className="glass-card p-4">
                <h3 className="font-bold text-lg text-slate-800 mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-500" />
                  {t('tour.itineraryDay', { day: String(editableResult[activeDay]?.day) })}
                </h3>
                <div className="h-[400px] rounded-xl overflow-hidden border border-slate-200">
                  <MapContainer
                    center={startCoords[startPoint]}
                    zoom={10}
                    className="h-full w-full"
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap'
                    />
                    <MapBounds bounds={mapBounds} />

                    {/* Route */}
                    <Polyline
                      positions={mapRoute}
                      color="#0066B3"
                      weight={3}
                      opacity={0.8}
                      dashArray="10, 5"
                    />

                    {/* Markers */}
                    {editableResult[activeDay]?.visits.map((visit) => (
                      <Marker
                        key={visit.practitioner.id}
                        position={visit.practitioner.coords}
                        icon={createNumberIcon(visit.order, visit.practitioner.isKOL)}
                      >
                        <Popup>
                          <div className="p-1">
                            <div className="font-bold">{visit.practitioner.title} {visit.practitioner.lastName}</div>
                            <div className="text-sm">{visit.practitioner.specialty}</div>
                            <div className="text-sm text-blue-600">Arrivée: {visit.arrivalTime}</div>
                            <div className="text-sm text-slate-600">Départ: {visit.departureTime}</div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}

                    {/* Point de départ */}
                    <Marker position={startCoords[startPoint]} icon={createStartIcon()}>
                      <Popup>
                        <div className="font-bold text-green-700">{t('tour.startingPoint')}</div>
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>
              </div>

              {/* Liste des visites */}
              <div className="glass-card p-4">
                <h3 className="font-bold text-lg text-slate-800 mb-3 flex items-center gap-2">
                  <RouteIcon className="w-5 h-5 text-purple-500" />
                  {t('tour.planningDay', { day: String(editableResult[activeDay]?.day) })}
                </h3>
                <div className="flex flex-wrap items-center gap-3 mb-3 text-sm">
                  <span className="bg-slate-100 px-2 py-1 rounded">
                    {t('tour.visitsCount', { count: String(editableResult[activeDay]?.visits.length) })}
                  </span>
                  <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                    9h00 - {editableResult[activeDay]?.endTime}
                  </span>
                  <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded">
                    {editableResult[activeDay]?.totalDistance} km
                  </span>
                  <span className="bg-green-50 text-green-700 px-2 py-1 rounded">
                    {Math.floor((editableResult[activeDay]?.totalTravelTime || 0) / 60)}h{((editableResult[activeDay]?.totalTravelTime || 0) % 60).toString().padStart(2, '0')} trajet
                  </span>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {editableResult[activeDay]?.visits.map((visit) => (
                    <div
                      key={visit.practitioner.id}
                      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:shadow-sm cursor-pointer"
                      onClick={() => navigate(`/practitioner/${visit.practitioner.id}`)}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        visit.practitioner.isKOL ? 'bg-amber-500' : 'bg-al-blue-500'
                      }`}>
                        {visit.order}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {visit.practitioner.title} {visit.practitioner.lastName}
                          </span>
                          {visit.practitioner.isKOL && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                        </div>
                        <p className="text-xs text-slate-500">{visit.practitioner.city}</p>
                      </div>
                      <div className="text-right text-xs">
                        <div className="font-bold text-blue-600">{visit.arrivalTime} - {visit.departureTime}</div>
                        <div className="text-slate-500">{visit.travelTime} min trajet • {visit.visitDuration} min visite</div>
                      </div>
                    </div>
                  ))}

                  {/* Retour */}
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">
                      H
                    </div>
                    <div className="flex-1">
                      <span className="font-medium text-sm text-slate-700">{t('tour.returnToBase')}</span>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      {editableResult[activeDay]?.returnTravelTime} min • {editableResult[activeDay]?.returnDistance} km
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className={`glass-card p-6 ${saved ? 'bg-gradient-to-br from-green-100 to-emerald-100 border-green-300' : 'bg-gradient-to-br from-green-50 to-blue-50'}`}>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  {saved ? (
                    <>
                      <h3 className="font-bold text-lg text-green-800 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        {t('tour.visitsRegistered')}
                      </h3>
                      <p className="text-sm text-green-700 mt-1">
                        {t('tour.visitsAdded', { count: String(result.days.reduce((sum, d) => sum + d.visits.length, 0)) })}
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="font-bold text-lg text-slate-800">{t('tour.optimizationSuccess')}</h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {criteria === 'kol-first'
                          ? `${result.totalKOLs} KOLs planifiés en priorité${result.kmSaved > 0 ? ` • ${result.kmSaved} km économisés grâce au regroupement géographique` : ` • ${result.totalVisits} visites sur ${result.days.length} jours`}`
                          : criteria === 'volume'
                          ? `${Math.round(result.totalVolumeCovered / 1000)}K L de volume ciblé${result.kmSaved > 0 ? ` • ${result.kmSaved} km économisés grâce au regroupement géographique` : ` • ${result.totalVisits} prescripteurs visités`}`
                          : result.kmSaved > 0
                          ? `Regroupement géographique : ${result.kmSaved} km économisés (-${result.percentDistSaved}%) grâce au clustering par zone`
                          : `${result.totalVisits} visites planifiées sur ${result.days.length} jours • Praticiens regroupés par zone géographique`}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => {
                      setResult(null);
                      setSaved(false);
                      setCurrentStep('selection');
                    }}
                    className="btn-secondary"
                  >
                    {t('tour.newOptimization')}
                  </button>
                  {!saved && (
                    <button onClick={saveToVisits} className="btn-secondary flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white border-green-500">
                      <Save className="w-4 h-4" />
                      {t('tour.saveToVisits')}
                    </button>
                  )}
                  <button onClick={exportIcal} className="btn-secondary flex items-center gap-2">
                    <CalendarPlus className="w-4 h-4" />
                    {t('tour.exportIcal')}
                  </button>
                  <button onClick={exportPDF} className="btn-primary flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    {t('tour.exportPdf')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TourOptimizationPage;
