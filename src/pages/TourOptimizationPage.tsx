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
  'BOURG-EN-BRESSE': [46.2051, 5.2259],
  'VILLEURBANNE': [45.7667, 4.8800],
  'VÉNISSIEUX': [45.6975, 4.8867],
  'VIENNE': [45.5255, 4.8769],
  'VOIRON': [45.3663, 5.5897],
  'BOURGOIN-JALLIEU': [45.5858, 5.2739],
  'ROMANS-SUR-ISÈRE': [45.0458, 5.0522],
  'MONTÉLIMAR': [44.5586, 4.7508],
  'ANNEMASSE': [46.1958, 6.2354],
};

type Step = 'selection' | 'configuration' | 'optimization' | 'result';
type OptimizationCriteria = 'balanced' | 'time' | 'kol-first' | 'volume' | 'distance';

interface PractitionerWithCoords extends Practitioner {
  coords: [number, number];
  selected: boolean;
}

interface OptimizedVisit {
  practitioner: PractitionerWithCoords;
  order: number;
  arrivalTime: string;
  departureTime: string;
  travelTime: number;
  visitDuration: number;
  distance: number;
  isLunchBreak?: boolean;
}

interface OptimizedDay {
  day: number;
  date: string;
  dateObj: Date;
  visits: OptimizedVisit[];
  totalDistance: number;
  totalTravelTime: number;
  totalVisitTime: number;
  returnTravelTime: number;
  returnDistance: number;
  startTime: string;
  endTime: string;
}

interface OptimizationResult {
  days: OptimizedDay[];
  totalDistance: number;
  totalTravelTime: number;
  naiveDistance: number;
  naiveTravelTime: number;
}

// Constantes de calcul
const ROAD_FACTOR = 1.3; // Routes ~1.3x plus longues que vol d'oiseau
const AVG_SPEED_KMH = 65; // Vitesse moyenne inter-urbaine
const AVG_SPEED_KM_MIN = AVG_SPEED_KMH / 60; // ~1.08 km/min
const START_HOUR = 9; // 9h00
const LUNCH_START = 12 * 60; // 12h00 en minutes
const MAX_END_MINUTES = 18 * 60 + 30; // 18h30 = fin de journée max

/** Formate des minutes en "XhYY" */
function formatMinutes(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  return `${h}h${m.toString().padStart(2, '0')}`;
}

/** Avance la date au prochain jour ouvré */
function nextBusinessDay(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/** Assure que la date est un jour ouvré */
function ensureBusinessDay(date: Date): Date {
  const d = new Date(date);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d;
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
    const cityKey = practitioner.city.toUpperCase();
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

  // Calcul de distance (Haversine × facteur routier)
  const calculateDistance = (coords1: [number, number], coords2: [number, number]): number => {
    const R = 6371;
    const dLat = (coords2[0] - coords1[0]) * Math.PI / 180;
    const dLon = (coords2[1] - coords1[1]) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(coords1[0] * Math.PI / 180) * Math.cos(coords2[0] * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * ROAD_FACTOR; // Distance routière estimée
  };

  // Calcul du temps de trajet en minutes
  const calculateTravelTime = (distanceKm: number): number => {
    return Math.ceil(distanceKm / AVG_SPEED_KM_MIN);
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

  // Amélioration 2-opt
  const twoOptImprovement = (route: PractitionerWithCoords[], start: [number, number]): PractitionerWithCoords[] => {
    let improved = true;
    let bestRoute = [...route];

    const calcRouteDistance = (r: PractitionerWithCoords[]) => {
      let total = calculateDistance(start, r[0].coords);
      for (let i = 0; i < r.length - 1; i++) {
        total += calculateDistance(r[i].coords, r[i + 1].coords);
      }
      return total;
    };

    while (improved) {
      improved = false;
      const currentDist = calcRouteDistance(bestRoute);

      for (let i = 0; i < bestRoute.length - 1; i++) {
        for (let j = i + 2; j < bestRoute.length; j++) {
          const newRoute = [
            ...bestRoute.slice(0, i + 1),
            ...bestRoute.slice(i + 1, j + 1).reverse(),
            ...bestRoute.slice(j + 1)
          ];

          if (calcRouteDistance(newRoute) < currentDist) {
            bestRoute = newRoute;
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
    }

    return bestRoute;
  };

  // Calcul de la distance totale d'un parcours naïf (ordre de sélection, multi-jours avec retour)
  const calculateNaiveRoute = (practs: PractitionerWithCoords[], start: [number, number], perDay: number) => {
    let totalDist = 0;
    const pool = [...practs];
    while (pool.length > 0) {
      const remainingDays = Math.ceil(pool.length / perDay);
      const chunk = Math.ceil(pool.length / remainingDays);
      const dayPracts = pool.splice(0, chunk);
      let prev = start;
      for (const p of dayPracts) {
        totalDist += calculateDistance(prev, p.coords);
        prev = p.coords;
      }
      totalDist += calculateDistance(prev, start); // retour à la base
    }
    return totalDist;
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

    // Calculer la distance naïve AVANT optimisation (ordre de sélection original, multi-jours)
    const naiveDistance = calculateNaiveRoute(selectedPractitioners, start, visitsPerDay);
    const naiveTravelTime = Math.ceil(naiveDistance / AVG_SPEED_KM_MIN);

    // Trier selon critère
    const sortedPractitioners = [...selectedPractitioners];
    switch (criteria) {
      case 'kol-first':
        sortedPractitioners.sort((a, b) => {
          if (a.isKOL && !b.isKOL) return -1;
          if (!a.isKOL && b.isKOL) return 1;
          return b.volumeL - a.volumeL;
        });
        break;
      case 'volume':
        sortedPractitioners.sort((a, b) => b.volumeL - a.volumeL);
        break;
      case 'distance':
        sortedPractitioners.sort((a, b) =>
          calculateDistance(start, a.coords) - calculateDistance(start, b.coords)
        );
        break;
      case 'time':
        sortedPractitioners.sort((a, b) => {
          const distA = calculateDistance(start, a.coords);
          const distB = calculateDistance(start, b.coords);
          return distA - distB;
        });
        break;
      case 'balanced':
      default:
        sortedPractitioners.sort((a, b) => {
          const scoreA = (a.isKOL ? 100 : 0) + (a.volumeL / 50000) - calculateDistance(start, a.coords) * 2;
          const scoreB = (b.isKOL ? 100 : 0) + (b.volumeL / 50000) - calculateDistance(start, b.coords) * 2;
          return scoreB - scoreA;
        });
    }

    // Diviser en jours avec gestion du débordement horaire
    const days: OptimizedDay[] = [];
    const MAX_DAYS = 20; // Sécurité anti-boucle infinie

    // FIX: Date cumulatif — chaque jour avance au prochain jour ouvré
    const baseDate = new Date(startDate + 'T12:00:00'); // Midi pour éviter les bugs timezone
    let currentDate = ensureBusinessDay(baseDate);

    let totalDistanceAll = 0;
    let totalTravelTimeAll = 0;

    // Répartition équilibrée : au lieu de 6,6,6,1 → 5,5,5,4
    const remaining = [...sortedPractitioners];
    let dayIndex = 0;

    while (remaining.length > 0 && dayIndex < MAX_DAYS) {
      // Calculer une taille de chunk équilibrée
      const remainingDays = Math.ceil(remaining.length / visitsPerDay);
      const chunkSize = Math.ceil(remaining.length / remainingDays);
      const dayPractitioners = remaining.splice(0, chunkSize);

      // Optimiser l'ordre pour ce jour
      let optimizedRoute = nearestNeighborTSP(dayPractitioners, start);
      optimizedRoute = twoOptImprovement(optimizedRoute, start);

      // Forcer KOLs en premier si critère
      if (criteria === 'kol-first') {
        const kols = optimizedRoute.filter(p => p.isKOL);
        const nonKols = optimizedRoute.filter(p => !p.isKOL);
        optimizedRoute = [...kols, ...nonKols];
      }

      // Calculer les métriques avec pause déjeuner et limite horaire
      let dayDistance = 0;
      let dayTravelTime = 0;
      let dayVisitTime = 0;
      const visits: OptimizedVisit[] = [];
      let currentTime = START_HOUR * 60; // 9h00
      let prevCoords = start;
      let lunchTaken = false;

      for (let i = 0; i < optimizedRoute.length; i++) {
        const p = optimizedRoute[i];
        const dist = calculateDistance(prevCoords, p.coords);
        const travel = calculateTravelTime(dist);

        // Vérifier si on doit insérer la pause déjeuner (toujours exactement 60 min)
        const arrivalIfNoLunch = currentTime + travel;
        if (!lunchTaken && arrivalIfNoLunch >= LUNCH_START) {
          currentTime += 60; // Pause déjeuner exacte de 60 min
          lunchTaken = true;
        }

        currentTime += travel;

        // Vérifier la limite horaire : si la visite finirait après MAX_END (18h30)
        if (currentTime + visitDuration > MAX_END_MINUTES && visits.length > 0) {
          // Reporter les visites restantes au jour suivant
          remaining.unshift(...optimizedRoute.slice(i));
          break;
        }

        dayDistance += dist;
        dayTravelTime += travel;
        dayVisitTime += visitDuration;

        visits.push({
          practitioner: p,
          order: visits.length + 1,
          arrivalTime: formatMinutes(currentTime),
          departureTime: formatMinutes(currentTime + visitDuration),
          travelTime: Math.round(travel),
          visitDuration,
          distance: Math.round(dist * 10) / 10,
        });

        currentTime += visitDuration;
        prevCoords = p.coords;
      }

      // Si aucune visite n'a pu être ajoutée (ne devrait pas arriver)
      if (visits.length === 0) break;

      // Calculer le retour à la base
      const returnDist = calculateDistance(prevCoords, start);
      const returnTime = calculateTravelTime(returnDist);
      dayDistance += returnDist;
      dayTravelTime += returnTime;
      currentTime += returnTime;

      // Date de ce jour (format lisible)
      const dateStr = currentDate.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });

      days.push({
        day: dayIndex + 1,
        date: dateStr,
        dateObj: new Date(currentDate),
        visits,
        totalDistance: Math.round(dayDistance * 10) / 10,
        totalTravelTime: Math.round(dayTravelTime),
        totalVisitTime: dayVisitTime,
        returnTravelTime: Math.round(returnTime),
        returnDistance: Math.round(returnDist * 10) / 10,
        startTime: formatMinutes(START_HOUR * 60),
        endTime: formatMinutes(currentTime),
      });

      totalDistanceAll += dayDistance;
      totalTravelTimeAll += dayTravelTime;

      // Avancer au prochain jour ouvré
      currentDate = nextBusinessDay(currentDate);
      dayIndex++;
    }

    const finalResult: OptimizationResult = {
      days,
      totalDistance: Math.round(totalDistanceAll * 10) / 10,
      totalTravelTime: Math.round(totalTravelTimeAll),
      naiveDistance: Math.round(naiveDistance * 10) / 10,
      naiveTravelTime: Math.round(naiveTravelTime),
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
      label: 'Équilibré',
      icon: Zap,
      description: 'Compromis temps/priorité',
      benefit: 'Optimise le temps tout en respectant les priorités métier',
      expectedSaving: '~25% km économisés'
    },
    {
      id: 'time' as const,
      label: 'Gain de temps',
      icon: Clock,
      description: 'Minimiser les trajets',
      benefit: 'Regroupe les visites par proximité géographique',
      expectedSaving: '~35% temps gagné'
    },
    {
      id: 'kol-first' as const,
      label: 'KOL prioritaires',
      icon: Star,
      description: 'KOLs visités en premier',
      benefit: 'Garantit les RDV avec les leaders d\'opinion avant tout',
      expectedSaving: 'KOLs planifiés le matin'
    },
    {
      id: 'volume' as const,
      label: 'Volume maximal',
      icon: Droplets,
      description: 'Gros prescripteurs en priorité',
      benefit: 'Priorise les praticiens à fort volume de prescription',
      expectedSaving: 'Focus sur le top 20%'
    },
    {
      id: 'distance' as const,
      label: 'Distance min',
      icon: Navigation,
      description: 'Trajet le plus court',
      benefit: 'Minimise le kilométrage total de la tournée',
      expectedSaving: '~40% km économisés'
    },
  ];

  // Export PDF (simulation)
  const exportPDF = () => {
    alert('Export PDF - Fonctionnalité à intégrer avec une vraie génération PDF');
  };

  // Save to visits — utilise dateObj du résultat (pas de recalcul)
  const saveToVisits = () => {
    if (!result || saved) return;

    const newVisits: UpcomingVisit[] = [];
    let visitCounter = Date.now();

    result.days.forEach((day) => {
      const dateStr = day.dateObj.toISOString().split('T')[0];

      day.visits.forEach((visit) => {
        const p = visit.practitioner;
        newVisits.push({
          id: `V-OPT-${visitCounter++}`,
          practitionerId: p.id,
          practitioner: p,
          date: dateStr,
          time: visit.arrivalTime.replace('h', ':').padStart(5, '0'),
          type: 'scheduled',
          notes: `Visite planifiée via optimisation de tournée (${criteriaOptions.find(c => c.id === criteria)?.label})`,
        });
      });
    });

    addVisits(newVisits);
    setSaved(true);
  };

  // Export iCal — avec DTSTART/DTEND corrects
  const exportIcal = () => {
    if (!result) return;

    const formatIcalDate = (dateObj: Date, timeStr: string): string => {
      const [h, m] = timeStr.replace('h', ':').split(':').map(Number);
      const d = new Date(dateObj);
      d.setHours(h, m, 0, 0);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    };

    let ical = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ARIA//Tour Optimization//FR\nCALSCALE:GREGORIAN\n';

    result.days.forEach(day => {
      day.visits.forEach(visit => {
        const p = visit.practitioner;
        const uid = `${day.dateObj.toISOString().split('T')[0]}-${p.id}@aria`;
        ical += 'BEGIN:VEVENT\n';
        ical += `UID:${uid}\n`;
        ical += `DTSTART:${formatIcalDate(day.dateObj, visit.arrivalTime)}\n`;
        ical += `DTEND:${formatIcalDate(day.dateObj, visit.departureTime)}\n`;
        ical += `SUMMARY:Visite - ${p.title} ${p.firstName} ${p.lastName}\n`;
        ical += `DESCRIPTION:${p.specialty} - ${p.city}\\nTrajet: ${visit.travelTime} min (${visit.distance} km)\n`;
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
    URL.revokeObjectURL(url);
  };

  // Étapes du wizard
  const stepConfig = [
    { id: 'selection', label: '1. Sélection', icon: Users },
    { id: 'configuration', label: '2. Configuration', icon: Filter },
    { id: 'optimization', label: '3. Optimisation', icon: Zap },
    { id: 'result', label: '4. Résultat', icon: CheckCircle },
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
          <span className="text-sm">Retour au tableau de bord</span>
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
              <RouteIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
                Optimisation de Tournée
              </h1>
              <p className="text-slate-600 mt-1">
                Planifiez et optimisez vos visites avec l'IA
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
                      placeholder="Rechercher un praticien..."
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
                  <option value="all">Toutes spécialités</option>
                  <option value="Pneumologue">Pneumologues</option>
                  <option value="Médecin généraliste">Généralistes</option>
                </select>

                <select
                  value={filterKOL === null ? 'all' : filterKOL ? 'kol' : 'non-kol'}
                  onChange={(e) => setFilterKOL(e.target.value === 'all' ? null : e.target.value === 'kol')}
                  className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-al-blue-500"
                >
                  <option value="all">Tous les praticiens</option>
                  <option value="kol">KOLs uniquement</option>
                  <option value="non-kol">Non KOLs</option>
                </select>
              </div>

              {/* Quick select buttons */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-200">
                <button onClick={selectAll} className="btn-secondary text-xs py-1.5 px-3">
                  Tout sélectionner
                </button>
                <button onClick={deselectAll} className="btn-secondary text-xs py-1.5 px-3">
                  Tout désélectionner
                </button>
                <button onClick={selectKOLs} className="btn-secondary text-xs py-1.5 px-3">
                  <Star className="w-3 h-3 mr-1" />
                  Ajouter KOLs
                </button>
                <button onClick={selectTopVingtile} className="btn-secondary text-xs py-1.5 px-3">
                  <Droplets className="w-3 h-3 mr-1" />
                  Top Vingtile (1-5)
                </button>
              </div>
            </div>

            {/* Selection count and planned visits info */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-4">
                <p className="text-sm text-slate-600">
                  <span className="font-bold text-al-blue-600">{selectedIds.size}</span> praticiens sélectionnés sur {practitionersWithCoords.length}
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
                      Montrer {alreadyPlannedIds.size} déjà planifié(s)
                    </span>
                  </label>
                )}
              </div>
              <p className="text-sm text-slate-600">
                Période: <span className="font-medium">{periodLabel}</span>
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
                        <div className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                          Planifié {plannedVisit?.date}
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
                Continuer
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
                Critère d'optimisation
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
                  Point de départ
                </h3>
                <div className="space-y-3">
                  {[
                    { id: 'lyon', label: 'Lyon Centre', desc: 'Part-Dieu' },
                    { id: 'grenoble', label: 'Grenoble', desc: 'Centre-ville' },
                    { id: 'home', label: 'Mon domicile', desc: 'Adresse personnelle' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setStartPoint(opt.id as 'lyon' | 'grenoble' | 'home')}
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
                  Paramètres
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Date de début
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
                      Visites par jour: <span className="text-al-blue-600">{visitsPerDay}</span>
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
                      Durée par visite: <span className="text-al-blue-600">{visitDuration} min</span>
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
                  <h3 className="font-bold text-lg text-slate-800">Résumé</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {selectedIds.size} praticiens sur ~{Math.ceil(selectedIds.size / visitsPerDay)} jours •
                    Début: {new Date(startDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCurrentStep('selection')}
                    className="btn-secondary"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour
                  </button>
                  <button
                    onClick={runOptimization}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Lancer l'optimisation
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
              <h3 className="font-bold text-xl text-slate-800 mb-2">Optimisation en cours...</h3>
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
            {/* Métriques globales — économies réelles vs parcours non-optimisé */}
            {(() => {
              const kmSaved = Math.max(0, Math.round((result.naiveDistance - result.totalDistance) * 10) / 10);
              const timeSaved = Math.max(0, Math.round(result.naiveTravelTime - result.totalTravelTime));
              const pctSaved = result.naiveDistance > 0
                ? Math.round((kmSaved / result.naiveDistance) * 100)
                : 0;
              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="glass-card p-4 bg-gradient-to-br from-green-50 to-emerald-50">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingDown className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-slate-600">Distance économisée</span>
                    </div>
                    <div className="text-2xl font-bold text-green-700">{kmSaved} km</div>
                    <div className="text-xs text-slate-500 mt-1">
                      vs parcours non-optimisé ({pctSaved}%)
                    </div>
                  </div>

                  <div className="glass-card p-4 bg-gradient-to-br from-blue-50 to-cyan-50">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span className="text-sm text-slate-600">Temps de trajet économisé</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-700">
                      {formatMinutes(timeSaved)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      sur l'ensemble de la tournée
                    </div>
                  </div>

                  <div className="glass-card p-4 bg-gradient-to-br from-purple-50 to-pink-50">
                    <div className="flex items-center gap-2 mb-1">
                      <Navigation className="w-5 h-5 text-purple-600" />
                      <span className="text-sm text-slate-600">Distance totale optimisée</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-700">{result.totalDistance} km</div>
                    <div className="text-xs text-slate-500 mt-1">
                      sur {result.days.length} jour{result.days.length > 1 ? 's' : ''} • trajet : {formatMinutes(result.totalTravelTime)}
                    </div>
                  </div>

                  <div className="glass-card p-4 bg-gradient-to-br from-amber-50 to-orange-50">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-5 h-5 text-amber-600" />
                      <span className="text-sm text-slate-600">Jours planifiés</span>
                    </div>
                    <div className="text-2xl font-bold text-amber-700">{result.days.length}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {result.days.reduce((s, d) => s + d.visits.length, 0)} visites au total
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Tabs pour les jours — date complète */}
            <div className="glass-card p-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {result.days.map((day, idx) => {
                  // Capitaliser la première lettre du jour
                  const dateCapitalized = day.date.charAt(0).toUpperCase() + day.date.slice(1);
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveDay(idx)}
                      className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                        activeDay === idx
                          ? 'bg-al-blue-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span className="font-medium">Jour {day.day}</span>
                      <span className="mx-1">—</span>
                      <span className="capitalize">{dateCapitalized}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Carte et liste */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Carte */}
              <div className="glass-card p-4">
                <h3 className="font-bold text-lg text-slate-800 mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-500" />
                  Itinéraire Jour {editableResult[activeDay]?.day}
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
                        <div className="font-bold text-green-700">Point de départ</div>
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>
              </div>

              {/* Liste des visites */}
              <div className="glass-card p-4">
                <h3 className="font-bold text-lg text-slate-800 mb-3 flex items-center gap-2">
                  <RouteIcon className="w-5 h-5 text-purple-500" />
                  Planning Jour {editableResult[activeDay]?.day}
                </h3>
                <div className="flex flex-wrap items-center gap-3 mb-3 text-sm">
                  <span className="bg-slate-100 px-2 py-1 rounded">
                    {editableResult[activeDay]?.visits.length} visites
                  </span>
                  <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                    {editableResult[activeDay]?.startTime} — {editableResult[activeDay]?.endTime}
                  </span>
                  <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded">
                    {editableResult[activeDay]?.totalDistance} km
                  </span>
                  <span className="bg-green-50 text-green-700 px-2 py-1 rounded">
                    {formatMinutes(editableResult[activeDay]?.totalTravelTime || 0)} trajet
                  </span>
                </div>
                <div className="space-y-2 max-h-[450px] overflow-y-auto">
                  {/* Point de départ */}
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">
                      H
                    </div>
                    <div className="flex-1">
                      <span className="font-medium text-sm text-green-800">
                        Départ — {startPoint === 'lyon' ? 'Lyon Centre' : startPoint === 'grenoble' ? 'Grenoble' : 'Mon domicile'}
                      </span>
                      <p className="text-xs text-green-600">{editableResult[activeDay]?.startTime}</p>
                    </div>
                  </div>

                  {editableResult[activeDay]?.visits.map((visit, idx) => (
                    <React.Fragment key={visit.practitioner.id}>
                      {/* Indicateur de pause déjeuner */}
                      {idx > 0 && (() => {
                        const prevDep = editableResult[activeDay]?.visits[idx - 1]?.departureTime || '';
                        const curArr = visit.arrivalTime;
                        const prevMin = parseInt(prevDep.split('h')[0]) * 60 + parseInt(prevDep.split('h')[1]);
                        const curMin = parseInt(curArr.split('h')[0]) * 60 + parseInt(curArr.split('h')[1]);
                        const gap = curMin - prevMin - visit.travelTime;
                        if (gap >= 45) {
                          return (
                            <div className="flex items-center gap-3 p-2 bg-amber-50 rounded-lg border border-dashed border-amber-300 ml-4">
                              <span className="text-sm">🍽</span>
                              <span className="text-xs font-medium text-amber-700">
                                Pause déjeuner ({formatMinutes(gap)})
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      <div
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
                          <div className="font-bold text-blue-600">{visit.arrivalTime} — {visit.departureTime}</div>
                          <div className="text-slate-500">{visit.travelTime} min trajet • {visit.visitDuration} min visite</div>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}

                  {/* Retour avec détails */}
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">
                      H
                    </div>
                    <div className="flex-1">
                      <span className="font-medium text-sm text-green-800">Retour à la base</span>
                      <p className="text-xs text-green-600">Arrivée : {editableResult[activeDay]?.endTime}</p>
                    </div>
                    <div className="text-right text-xs text-green-700">
                      <div>{editableResult[activeDay]?.returnTravelTime} min trajet</div>
                      <div>{editableResult[activeDay]?.returnDistance} km</div>
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
                        Visites enregistrées avec succès !
                      </h3>
                      <p className="text-sm text-green-700 mt-1">
                        {result.days.reduce((sum, d) => sum + d.visits.length, 0)} visites ajoutées à votre agenda
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="font-bold text-lg text-slate-800">Tournée optimisée avec succès !</h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {result.naiveDistance > result.totalDistance
                          ? `Économie de ${Math.round((result.naiveDistance - result.totalDistance) * 10) / 10} km et ${formatMinutes(Math.max(0, result.naiveTravelTime - result.totalTravelTime))} de trajet vs parcours initial`
                          : `${result.days.reduce((s, d) => s + d.visits.length, 0)} visites planifiées sur ${result.days.length} jour${result.days.length > 1 ? 's' : ''}`
                        }
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
                    Nouvelle optimisation
                  </button>
                  {!saved && (
                    <button onClick={saveToVisits} className="btn-secondary flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white border-green-500">
                      <Save className="w-4 h-4" />
                      Enregistrer dans mes visites
                    </button>
                  )}
                  <button onClick={exportIcal} className="btn-secondary flex items-center gap-2">
                    <CalendarPlus className="w-4 h-4" />
                    Export iCal
                  </button>
                  <button onClick={exportPDF} className="btn-primary flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export PDF
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
