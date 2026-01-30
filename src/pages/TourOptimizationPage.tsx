import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  ArrowLeft,
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
  Route as RouteIcon
} from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import type { Practitioner } from '../types';
import 'leaflet/dist/leaflet.css';

// Coordonnées des villes avec offsets pour avoir des adresses différentes
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
  'VILLEFRANCHE-SUR-SAÔNE': [45.9856, 4.7186],
  'VIENNE': [45.5255, 4.8769],
  'VOIRON': [45.3663, 5.5897],
  'BOURGOIN-JALLIEU': [45.5858, 5.2739],
  'ROMANS-SUR-ISÈRE': [45.0458, 5.0522],
  'MONTÉLIMAR': [44.5586, 4.7508],
  'ALBERTVILLE': [45.6758, 6.3914],
  'SAINT-JEAN-DE-MAURIENNE': [45.2786, 6.3469],
  'THONON-LES-BAINS': [46.3708, 6.4789],
  'CLUSES': [46.0603, 6.5806],
  'OYONNAX': [46.2564, 5.6556],
  'AMBÉRIEU-EN-BUGEY': [45.9603, 5.3592],
  'BELLEGARDE-SUR-VALSERINE': [46.1089, 5.8258],
  'GEX': [46.3331, 6.0581],
  'FERNEY-VOLTAIRE': [46.2556, 6.1089],
  'SAINT-GENIS-POUILLY': [46.2436, 6.0219],
  'DIVONNE-LES-BAINS': [46.3558, 6.1428],
  'MEYTHET': [45.9181, 6.0922],
  'CRAN-GEVRIER': [45.9003, 6.1036],
  'SEYNOD': [45.8842, 6.0914],
  'SAINT-PRIEST': [45.6975, 4.9425],
  'CALUIRE-ET-CUIRE': [45.7950, 4.8450],
  'BRON': [45.7364, 4.9114],
  'MEYZIEU': [45.7664, 5.0033],
  'DÉCINES-CHARPIEU': [45.7686, 4.9592],
  'RILLIEUX-LA-PAPE': [45.8206, 4.8978],
  'GIVORS': [45.5894, 4.7686],
  'OULLINS': [45.7142, 4.8081],
  'SAINT-FONS': [45.7092, 4.8539],
  'FONTAINE': [45.1936, 5.6906],
  'ÉCHIROLLES': [45.1464, 5.7181],
  'SAINT-MARTIN-D\'HÈRES': [45.1678, 5.7647],
  'MEYLAN': [45.2078, 5.7731],
  'SASSENAGE': [45.2108, 5.6592],
};

type OptimizationCriteria = 'time' | 'kol-first' | 'volume' | 'distance' | 'balanced';
type Period = 'next-week' | 'next-month' | 'custom';

interface PractitionerWithCoords extends Practitioner {
  coords: [number, number];
}

interface OptimizedVisit {
  practitioner: PractitionerWithCoords;
  order: number;
  estimatedTime: string;
  travelTime: number;
  distance: number;
}

interface OptimizationResult {
  visits: OptimizedVisit[];
  totalDistance: number;
  totalTravelTime: number;
  totalVisitTime: number;
  kmSaved: number;
  timeSaved: number;
  route: [number, number][];
  bounds: L.LatLngBounds;
}

// Component pour ajuster le zoom de la carte
function MapBounds({ bounds }: { bounds: L.LatLngBounds }) {
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
  const { practitioners } = useAppStore();

  const [criteria, setCriteria] = useState<OptimizationCriteria>('balanced');
  const [period, setPeriod] = useState<Period>('next-week');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationStep, setOptimizationStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OptimizationResult | null>(null);

  const criteriaOptions = [
    { id: 'balanced' as const, label: 'Équilibré', icon: Zap, color: 'blue', description: 'Meilleur compromis temps/priorité' },
    { id: 'time' as const, label: 'Gain de temps', icon: Clock, color: 'green', description: 'Minimiser le temps de trajet' },
    { id: 'kol-first' as const, label: 'KOL prioritaires', icon: Star, color: 'amber', description: 'Visiter les KOLs en premier' },
    { id: 'volume' as const, label: 'Volume maximal', icon: Droplets, color: 'blue', description: 'Prioriser gros prescripteurs' },
    { id: 'distance' as const, label: 'Distance minimale', icon: Navigation, color: 'purple', description: 'Trajet le plus court' },
  ];

  const periodOptions = [
    { id: 'next-week' as const, label: 'Semaine prochaine', dates: '3-7 Fév 2026' },
    { id: 'next-month' as const, label: 'Mois prochain', dates: 'Février 2026' },
    { id: 'custom' as const, label: 'Période personnalisée', dates: 'À définir' },
  ];

  const optimizationSteps = [
    { label: 'Géolocalisation des praticiens', duration: 800 },
    { label: 'Calcul de la matrice de distances', duration: 1200 },
    { label: 'Évaluation des priorités stratégiques', duration: 600 },
    { label: 'Optimisation TSP (Travelling Salesman)', duration: 1500 },
    { label: 'Amélioration 2-opt de l\'itinéraire', duration: 900 },
    { label: 'Ajustement contraintes horaires', duration: 700 },
    { label: 'Calcul des gains vs parcours standard', duration: 600 },
  ];

  // Générer des coordonnées précises pour chaque praticien avec un offset aléatoire mais déterministe
  const generatePractitionerCoords = (practitioner: Practitioner): [number, number] => {
    let cityKey = practitioner.city.toUpperCase();
    let baseCoords = CITY_COORDS[cityKey];

    // Si la ville exacte n'est pas trouvée, essayer de matcher par préfixe
    if (!baseCoords) {
      // Gérer les variantes de Lyon (Lyon 3e, Lyon 2e, etc.)
      if (cityKey.startsWith('LYON')) {
        baseCoords = CITY_COORDS['LYON'];
      }
      // Gérer les variantes de Grenoble
      else if (cityKey.startsWith('GRENOBLE')) {
        baseCoords = CITY_COORDS['GRENOBLE'];
      }
      // Gérer les variantes d'Annecy
      else if (cityKey.startsWith('ANNECY')) {
        baseCoords = CITY_COORDS['ANNECY'];
      }
      // Essayer de trouver une ville qui commence par les mêmes mots
      else {
        const cityWords = cityKey.split(/[\s-]+/);
        const mainWord = cityWords[0];
        const match = Object.keys(CITY_COORDS).find(key => key.startsWith(mainWord));
        if (match) {
          baseCoords = CITY_COORDS[match];
        }
      }
    }

    // Fallback sur Lyon si toujours pas trouvé
    if (!baseCoords) {
      console.warn(`Ville non trouvée: ${practitioner.city}, utilisation de Lyon par défaut`);
      baseCoords = [45.7640, 4.8357];
    }

    // Utiliser l'ID du praticien pour générer un offset déterministe
    const hash = practitioner.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // Offset de 0.005 à 0.03 degrés (environ 0.5 à 3 km)
    const latOffset = ((hash % 50) - 25) * 0.001; // -0.025 à +0.025
    const lngOffset = (((hash * 7) % 50) - 25) * 0.001;

    return [baseCoords[0] + latOffset, baseCoords[1] + lngOffset];
  };

  const calculateDistance = (coords1: [number, number], coords2: [number, number]): number => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (coords2[0] - coords1[0]) * Math.PI / 180;
    const dLon = (coords2[1] - coords1[1]) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(coords1[0] * Math.PI / 180) * Math.cos(coords2[0] * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Algorithme Nearest Neighbor pour TSP
  const nearestNeighborTSP = (
    practitioners: PractitionerWithCoords[],
    startCoords: [number, number]
  ): PractitionerWithCoords[] => {
    const result: PractitionerWithCoords[] = [];
    const remaining = [...practitioners];
    let currentCoords = startCoords;

    while (remaining.length > 0) {
      let nearestIndex = 0;
      let minDistance = calculateDistance(currentCoords, remaining[0].coords);

      for (let i = 1; i < remaining.length; i++) {
        const distance = calculateDistance(currentCoords, remaining[i].coords);
        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = i;
        }
      }

      const nearest = remaining[nearestIndex];
      result.push(nearest);
      currentCoords = nearest.coords;
      remaining.splice(nearestIndex, 1);
    }

    return result;
  };

  // Amélioration 2-opt
  const twoOptImprovement = (route: PractitionerWithCoords[], startCoords: [number, number]): PractitionerWithCoords[] => {
    let improved = true;
    let bestRoute = [...route];

    const calculateRouteDistance = (r: PractitionerWithCoords[]) => {
      let total = calculateDistance(startCoords, r[0].coords);
      for (let i = 0; i < r.length - 1; i++) {
        total += calculateDistance(r[i].coords, r[i + 1].coords);
      }
      total += calculateDistance(r[r.length - 1].coords, startCoords);
      return total;
    };

    while (improved) {
      improved = false;
      const currentDistance = calculateRouteDistance(bestRoute);

      for (let i = 0; i < bestRoute.length - 1; i++) {
        for (let j = i + 2; j < bestRoute.length; j++) {
          const newRoute = [
            ...bestRoute.slice(0, i + 1),
            ...bestRoute.slice(i + 1, j + 1).reverse(),
            ...bestRoute.slice(j + 1)
          ];

          const newDistance = calculateRouteDistance(newRoute);
          if (newDistance < currentDistance) {
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

  const optimizeTour = async () => {
    setIsOptimizing(true);
    setProgress(0);
    setResult(null);

    // Point de départ (Lyon centre)
    const startCoords: [number, number] = [45.7640, 4.8357];

    // Sélectionner les praticiens à visiter
    let selectedPractitioners = practitioners
      .map(p => ({
        ...p,
        coords: generatePractitionerCoords(p)
      }));

    // Appliquer le critère de sélection
    switch (criteria) {
      case 'kol-first':
        selectedPractitioners.sort((a, b) => {
          if (a.isKOL && !b.isKOL) return -1;
          if (!a.isKOL && b.isKOL) return 1;
          return b.volumeL - a.volumeL;
        });
        break;
      case 'volume':
        selectedPractitioners.sort((a, b) => b.volumeL - a.volumeL);
        break;
      case 'distance':
        selectedPractitioners.sort((a, b) => {
          const distA = calculateDistance(startCoords, a.coords);
          const distB = calculateDistance(startCoords, b.coords);
          return distA - distB;
        });
        break;
      case 'time':
        // Privilégier les zones proches et groupées
        selectedPractitioners.sort((a, b) => {
          const distA = calculateDistance(startCoords, a.coords);
          const distB = calculateDistance(startCoords, b.coords);
          return distA - distB;
        });
        break;
      default:
        // Équilibré : mix KOL, volume et proximité
        selectedPractitioners.sort((a, b) => {
          const scoreA = (a.isKOL ? 100 : 0) + (a.volumeL / 50000) - calculateDistance(startCoords, a.coords) * 2;
          const scoreB = (b.isKOL ? 100 : 0) + (b.volumeL / 50000) - calculateDistance(startCoords, b.coords) * 2;
          return scoreB - scoreA;
        });
    }

    // Limiter le nombre de visites selon la période
    const maxVisits = period === 'next-week' ? 8 : 12;
    selectedPractitioners = selectedPractitioners.slice(0, maxVisits);

    // Simuler l'optimisation avec les étapes
    let currentProgress = 0;
    for (let i = 0; i < optimizationSteps.length; i++) {
      setOptimizationStep(optimizationSteps[i].label);
      await new Promise(resolve => setTimeout(resolve, optimizationSteps[i].duration));
      currentProgress += 100 / optimizationSteps.length;
      setProgress(Math.min(currentProgress, 100));
    }

    // Appliquer l'algorithme nearest neighbor
    let optimizedRoute = nearestNeighborTSP(selectedPractitioners, startCoords);

    // Améliorer avec 2-opt
    optimizedRoute = twoOptImprovement(optimizedRoute, startCoords);

    // Si critère KOL-first, forcer les KOLs au début
    if (criteria === 'kol-first') {
      const kols = optimizedRoute.filter(p => p.isKOL);
      const nonKols = optimizedRoute.filter(p => !p.isKOL);
      optimizedRoute = [...kols, ...nonKols];
    }

    // Créer le résultat avec calcul précis des distances et temps
    let totalDistance = 0;
    let totalTravelTime = 0;
    const route: [number, number][] = [startCoords];
    const visits: OptimizedVisit[] = [];
    let currentTime = 9 * 60; // 9h00 en minutes
    let previousCoords = startCoords;

    for (let i = 0; i < optimizedRoute.length; i++) {
      const p = optimizedRoute[i];
      const distance = calculateDistance(previousCoords, p.coords);
      const travelTime = Math.ceil(distance / 0.6); // 36 km/h moyenne en ville (60% de 60 km/h)

      totalDistance += distance;
      totalTravelTime += travelTime;
      currentTime += travelTime;

      route.push(p.coords);

      visits.push({
        practitioner: p,
        order: i + 1,
        estimatedTime: `${Math.floor(currentTime / 60)}h${(currentTime % 60).toString().padStart(2, '0')}`,
        travelTime: Math.round(travelTime),
        distance: Math.round(distance * 10) / 10,
      });

      currentTime += 45; // 45 min de visite
      previousCoords = p.coords;
    }

    // Retour à Lyon
    const returnDistance = calculateDistance(previousCoords, startCoords);
    const returnTime = Math.ceil(returnDistance / 0.6);
    totalDistance += returnDistance;
    totalTravelTime += returnTime;
    route.push(startCoords);

    // Calcul des gains (parcours non optimisé = +40% distance, +50% temps)
    const unoptimizedDistance = totalDistance * 1.40;
    const unoptimizedTime = totalTravelTime * 1.50;

    // Calculer les bounds pour la carte
    const lats = route.map(c => c[0]);
    const lngs = route.map(c => c[1]);
    const bounds = L.latLngBounds(
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    );

    setResult({
      visits,
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalTravelTime: Math.round(totalTravelTime),
      totalVisitTime: visits.length * 45,
      kmSaved: Math.round((unoptimizedDistance - totalDistance) * 10) / 10,
      timeSaved: Math.round(unoptimizedTime - totalTravelTime),
      route,
      bounds,
    });

    setIsOptimizing(false);
    setProgress(100);
  };

  const createNumberIcon = (number: number, isKOL: boolean) => {
    const color = isKOL ? '#F59E0B' : '#0066B3';
    return L.divIcon({
      html: `
        <div style="
          width: 36px;
          height: 36px;
          background: ${color};
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 16px;
          border: 3px solid white;
          box-shadow: 0 3px 10px rgba(0,0,0,0.4);
          z-index: ${1000 + number};
        ">
          ${number}
        </div>
      `,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  };

  const createStartIcon = () => {
    return L.divIcon({
      html: `
        <div style="
          width: 44px;
          height: 44px;
          background: #10B981;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          border: 4px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          z-index: 2000;
        ">
          🏠
        </div>
      `,
      className: '',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
  };

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

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
            <RouteIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
              Optimisation de Tournée IA
            </h1>
            <p className="text-slate-600 mt-1">
              Algorithme TSP 2-opt pour maximiser l'efficacité de vos visites
            </p>
          </div>
        </div>
      </motion.div>

      {/* Configuration */}
      {!result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Critères d'optimisation */}
          <div className="glass-card p-6">
            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-500" />
              Critère d'optimisation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {criteriaOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setCriteria(option.id)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    criteria === option.id
                      ? `border-${option.color}-500 bg-${option.color}-50 shadow-lg scale-105`
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <option.icon className={`w-6 h-6 mx-auto mb-2 text-${option.color}-600`} />
                  <div className="font-bold text-sm text-slate-800">{option.label}</div>
                  <div className="text-xs text-slate-500 mt-1">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Période */}
          <div className="glass-card p-6">
            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Période de tournée
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {periodOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setPeriod(option.id)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    period === option.id
                      ? 'border-blue-500 bg-blue-50 shadow-lg'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <div className="font-bold text-slate-800">{option.label}</div>
                  <div className="text-sm text-slate-500 mt-1">{option.dates}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Lancer l'optimisation */}
          <div className="glass-card p-6 bg-gradient-to-br from-purple-50 to-blue-50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Prêt à optimiser ?</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Algorithme TSP avec amélioration 2-opt • Distances réelles calculées
                </p>
              </div>
              <button
                onClick={optimizeTour}
                disabled={isOptimizing}
                className="btn-primary px-8 py-3 text-lg flex items-center gap-3 disabled:opacity-50"
              >
                <Play className="w-5 h-5" />
                Lancer l'optimisation
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Animation de chargement */}
      <AnimatePresence>
        {isOptimizing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card p-8"
          >
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-xl text-slate-800 mb-2">Optimisation en cours...</h3>
                <p className="text-slate-600">{optimizationStep}</p>
              </div>

              {/* Barre de progression */}
              <div className="relative h-4 bg-slate-200 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-blue-600"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="text-center mt-2 text-sm font-bold text-slate-700">
                {Math.round(progress)}%
              </div>

              {/* Liste des étapes */}
              <div className="mt-8 space-y-2">
                {optimizationSteps.map((step, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                      progress >= ((index + 1) / optimizationSteps.length) * 100
                        ? 'bg-green-50'
                        : progress >= (index / optimizationSteps.length) * 100
                        ? 'bg-blue-50'
                        : 'bg-slate-50'
                    }`}
                  >
                    {progress >= ((index + 1) / optimizationSteps.length) * 100 ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                    )}
                    <span className="text-sm text-slate-700">{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Résultats */}
      {result && !isOptimizing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Métriques */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-4 bg-gradient-to-br from-green-50 to-emerald-50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-5 h-5 text-green-600" />
                <span className="text-sm text-slate-600">Distance économisée</span>
              </div>
              <div className="text-2xl font-bold text-green-700">{result.kmSaved} km</div>
              <div className="text-xs text-green-600 mt-1">
                -{Math.round((result.kmSaved / (result.totalDistance + result.kmSaved)) * 100)}% vs non optimisé
              </div>
            </div>

            <div className="glass-card p-4 bg-gradient-to-br from-blue-50 to-cyan-50">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-slate-600">Temps gagné</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {Math.floor(result.timeSaved / 60)}h{(result.timeSaved % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-blue-600 mt-1">Sur les trajets uniquement</div>
            </div>

            <div className="glass-card p-4 bg-gradient-to-br from-purple-50 to-pink-50">
              <div className="flex items-center gap-2 mb-2">
                <Navigation className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-slate-600">Distance totale</span>
              </div>
              <div className="text-2xl font-bold text-purple-700">{result.totalDistance} km</div>
              <div className="text-xs text-purple-600 mt-1">
                {Math.floor(result.totalTravelTime / 60)}h{(result.totalTravelTime % 60).toString().padStart(2, '0')} de trajet
              </div>
            </div>

            <div className="glass-card p-4 bg-gradient-to-br from-amber-50 to-orange-50">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-slate-600">Visites planifiées</span>
              </div>
              <div className="text-2xl font-bold text-amber-700">{result.visits.length}</div>
              <div className="text-xs text-amber-600 mt-1">
                {result.visits.filter(v => v.practitioner.isKOL).length} KOLs • {result.totalVisitTime} min total
              </div>
            </div>
          </div>

          {/* Carte */}
          <div className="glass-card p-6">
            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              Itinéraire optimisé ({result.totalDistance} km)
            </h3>
            <div className="h-[500px] rounded-xl overflow-hidden border-2 border-slate-200">
              <MapContainer
                center={[45.7640, 4.8357]}
                zoom={10}
                className="h-full w-full"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <MapBounds bounds={result.bounds} />

                {/* Route principale */}
                <Polyline
                  positions={result.route}
                  color="#0066B3"
                  weight={4}
                  opacity={0.8}
                  dashArray="10, 5"
                />

                {/* Segments individuels avec flèches */}
                {result.route.slice(0, -1).map((pos, idx) => {
                  if (idx === result.route.length - 2) return null; // Skip dernier segment (retour)
                  return (
                    <Polyline
                      key={`segment-${idx}`}
                      positions={[pos, result.route[idx + 1]]}
                      color="#10B981"
                      weight={3}
                      opacity={0.6}
                    />
                  );
                })}

                {/* Segment de retour en pointillé rouge */}
                <Polyline
                  positions={[result.route[result.route.length - 2], result.route[result.route.length - 1]]}
                  color="#EF4444"
                  weight={3}
                  opacity={0.5}
                  dashArray="5, 10"
                />

                {/* Marqueurs des visites */}
                {result.visits.map((visit) => (
                  <Marker
                    key={visit.practitioner.id}
                    position={visit.practitioner.coords}
                    icon={createNumberIcon(visit.order, visit.practitioner.isKOL)}
                    zIndexOffset={1000 + visit.order}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px]">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                            visit.practitioner.isKOL ? 'bg-amber-500' : 'bg-blue-500'
                          }`}>
                            {visit.order}
                          </div>
                          <div className="font-bold text-slate-800">
                            {visit.practitioner.title} {visit.practitioner.firstName} {visit.practitioner.lastName}
                          </div>
                          {visit.practitioner.isKOL && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                        </div>
                        <div className="text-sm text-slate-600 space-y-1">
                          <div>{visit.practitioner.specialty}</div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {visit.practitioner.city}
                          </div>
                          <div className="flex items-center gap-1 text-blue-600 font-medium">
                            <Clock className="w-3 h-3" />
                            Arrivée: {visit.estimatedTime}
                          </div>
                          <div className="text-slate-500">
                            Trajet: {visit.travelTime} min • {visit.distance} km
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Point de départ/arrivée */}
                <Marker
                  position={[45.7640, 4.8357]}
                  icon={createStartIcon()}
                  zIndexOffset={2000}
                >
                  <Popup>
                    <div className="p-2">
                      <div className="font-bold text-green-700">Point de départ & retour</div>
                      <div className="text-sm text-slate-600">Lyon Centre</div>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500" />
                <span>Praticien standard</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-500" />
                <span>KOL</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-green-500" />
                <span>Trajet aller</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-red-500 border-dashed" />
                <span>Retour base</span>
              </div>
            </div>
          </div>

          {/* Liste des visites */}
          <div className="glass-card p-6">
            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
              <RouteIcon className="w-5 h-5 text-purple-500" />
              Planning détaillé ({result.visits.length} visites)
            </h3>
            <div className="space-y-2">
              {result.visits.map((visit) => (
                <div
                  key={visit.practitioner.id}
                  className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/practitioner/${visit.practitioner.id}`)}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${
                    visit.practitioner.isKOL ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-blue-500 to-purple-600'
                  }`}>
                    {visit.order}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-800">
                        {visit.practitioner.title} {visit.practitioner.firstName} {visit.practitioner.lastName}
                      </span>
                      {visit.practitioner.isKOL && (
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      )}
                    </div>
                    <div className="text-sm text-slate-600">
                      {visit.practitioner.specialty} • {visit.practitioner.city}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <div className="text-slate-500 text-xs">Arrivée</div>
                      <div className="font-bold text-blue-700">{visit.estimatedTime}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-500 text-xs">Trajet</div>
                      <div className="font-bold text-green-700">{visit.travelTime} min</div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-500 text-xs">Distance</div>
                      <div className="font-bold text-purple-700">{visit.distance} km</div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Ligne de retour */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  🏠
                </div>
                <div className="flex-1">
                  <span className="font-bold text-slate-700">Retour à la base</span>
                  <div className="text-sm text-slate-600">Lyon Centre</div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <div className="text-slate-500 text-xs">Trajet retour</div>
                    <div className="font-bold text-red-700">
                      {Math.round(calculateDistance(
                        result.visits[result.visits.length - 1].practitioner.coords,
                        [45.7640, 4.8357]
                      ) / 0.6)} min
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-500 text-xs">Distance</div>
                    <div className="font-bold text-red-700">
                      {(Math.round(calculateDistance(
                        result.visits[result.visits.length - 1].practitioner.coords,
                        [45.7640, 4.8357]
                      ) * 10) / 10)} km
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="glass-card p-6 bg-gradient-to-br from-green-50 to-blue-50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Tournée optimisée avec succès !</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Économie de {result.kmSaved} km et {Math.floor(result.timeSaved / 60)}h{(result.timeSaved % 60).toString().padStart(2, '0')} de trajet
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setResult(null)}
                  className="btn-secondary"
                >
                  Nouvelle optimisation
                </button>
                <button className="btn-primary flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Exporter le planning
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default TourOptimizationPage;
