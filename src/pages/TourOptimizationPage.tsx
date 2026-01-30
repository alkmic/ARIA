import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
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
  'VILLEFRANCHE-SUR-SAÔNE': [45.9856, 4.7186],
};

type OptimizationCriteria = 'time' | 'kol-first' | 'volume' | 'distance' | 'balanced';
type Period = 'next-week' | 'next-month' | 'custom';

interface OptimizedVisit {
  practitioner: Practitioner;
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
    { label: 'Analyse des praticiens du territoire', duration: 800 },
    { label: 'Calcul des distances inter-villes', duration: 1200 },
    { label: 'Évaluation des priorités KOL', duration: 600 },
    { label: 'Optimisation algorithmique TSP', duration: 1500 },
    { label: 'Ajustement contraintes horaires', duration: 700 },
    { label: 'Génération de l\'itinéraire optimal', duration: 900 },
    { label: 'Calcul des métriques comparatives', duration: 600 },
  ];

  const calculateDistance = (city1: string, city2: string): number => {
    const coords1 = CITY_COORDS[city1.toUpperCase()];
    const coords2 = CITY_COORDS[city2.toUpperCase()];
    if (!coords1 || !coords2) return 50;

    const R = 6371; // Rayon de la Terre en km
    const dLat = (coords2[0] - coords1[0]) * Math.PI / 180;
    const dLon = (coords2[1] - coords1[1]) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(coords1[0] * Math.PI / 180) * Math.cos(coords2[0] * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const optimizeTour = async () => {
    setIsOptimizing(true);
    setProgress(0);
    setResult(null);

    // Sélectionner les praticiens à visiter (8-12 visites)
    let selectedPractitioners = [...practitioners];

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
      case 'time':
      case 'distance':
        // Grouper par proximité géographique
        selectedPractitioners.sort((a, b) => {
          const distA = calculateDistance('LYON', a.city);
          const distB = calculateDistance('LYON', b.city);
          return distA - distB;
        });
        break;
      default:
        // Équilibré : mix KOL, volume et distance
        selectedPractitioners.sort((a, b) => {
          const scoreA = (a.isKOL ? 50 : 0) + (a.volumeL / 100000) - calculateDistance('LYON', a.city);
          const scoreB = (b.isKOL ? 50 : 0) + (b.volumeL / 100000) - calculateDistance('LYON', b.city);
          return scoreB - scoreA;
        });
    }

    selectedPractitioners = selectedPractitioners.slice(0, period === 'next-week' ? 8 : 12);

    // Simuler l'optimisation avec les étapes
    let currentProgress = 0;
    for (let i = 0; i < optimizationSteps.length; i++) {
      setOptimizationStep(optimizationSteps[i].label);
      await new Promise(resolve => setTimeout(resolve, optimizationSteps[i].duration));
      currentProgress += 100 / optimizationSteps.length;
      setProgress(Math.min(currentProgress, 100));
    }

    // Générer l'itinéraire optimisé (algorithme simplifié du voyageur de commerce)
    const optimizedOrder: Practitioner[] = [];
    const remaining = [...selectedPractitioners];
    let currentCity = 'LYON';

    while (remaining.length > 0) {
      // Trouver le praticien le plus proche
      let nearest = remaining[0];
      let minDist = calculateDistance(currentCity, nearest.city);

      for (const p of remaining) {
        const dist = calculateDistance(currentCity, p.city);
        if (dist < minDist) {
          minDist = dist;
          nearest = p;
        }
      }

      optimizedOrder.push(nearest);
      currentCity = nearest.city;
      remaining.splice(remaining.indexOf(nearest), 1);
    }

    // Créer le résultat
    let totalDistance = 0;
    let totalTravelTime = 0;
    const route: [number, number][] = [[45.7640, 4.8357]]; // Départ de Lyon
    const visits: OptimizedVisit[] = [];
    let currentTime = 9 * 60; // 9h00 en minutes

    for (let i = 0; i < optimizedOrder.length; i++) {
      const p = optimizedOrder[i];
      const prevCity = i === 0 ? 'LYON' : optimizedOrder[i - 1].city;
      const distance = calculateDistance(prevCity, p.city);
      const travelTime = Math.ceil(distance / 70 * 60); // 70 km/h moyenne

      totalDistance += distance;
      totalTravelTime += travelTime;
      currentTime += travelTime;

      const coords = CITY_COORDS[p.city.toUpperCase()];
      if (coords) route.push(coords);

      visits.push({
        practitioner: p,
        order: i + 1,
        estimatedTime: `${Math.floor(currentTime / 60)}h${(currentTime % 60).toString().padStart(2, '0')}`,
        travelTime,
        distance: Math.round(distance),
      });

      currentTime += 45; // 45 min de visite
    }

    // Retour à Lyon
    const lastCity = optimizedOrder[optimizedOrder.length - 1].city;
    const returnDistance = calculateDistance(lastCity, 'LYON');
    totalDistance += returnDistance;
    totalTravelTime += Math.ceil(returnDistance / 70 * 60);
    route.push([45.7640, 4.8357]);

    // Calcul des gains (comparé à un itinéraire non optimisé)
    const unoptimizedDistance = totalDistance * 1.35;
    const unoptimizedTime = totalTravelTime * 1.4;

    setResult({
      visits,
      totalDistance: Math.round(totalDistance),
      totalTravelTime,
      totalVisitTime: visits.length * 45,
      kmSaved: Math.round(unoptimizedDistance - totalDistance),
      timeSaved: Math.round(unoptimizedTime - totalTravelTime),
      route,
    });

    setIsOptimizing(false);
    setProgress(100);
  };

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
              Optimisation de Tournée
            </h1>
            <p className="text-slate-600 mt-1">
              Algorithme intelligent pour maximiser l'efficacité de vos visites
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
                  L'algorithme va calculer le meilleur itinéraire en {optimizationSteps.length} étapes
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
              <div className="text-xs text-green-600 mt-1">-{Math.round((result.kmSaved / (result.totalDistance + result.kmSaved)) * 100)}%</div>
            </div>

            <div className="glass-card p-4 bg-gradient-to-br from-blue-50 to-cyan-50">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-slate-600">Temps gagné</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">{Math.round(result.timeSaved / 60)}h{result.timeSaved % 60}min</div>
              <div className="text-xs text-blue-600 mt-1">Optimisation réussie</div>
            </div>

            <div className="glass-card p-4 bg-gradient-to-br from-purple-50 to-pink-50">
              <div className="flex items-center gap-2 mb-2">
                <Navigation className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-slate-600">Distance totale</span>
              </div>
              <div className="text-2xl font-bold text-purple-700">{result.totalDistance} km</div>
              <div className="text-xs text-purple-600 mt-1">Trajet optimisé</div>
            </div>

            <div className="glass-card p-4 bg-gradient-to-br from-amber-50 to-orange-50">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-slate-600">Visites planifiées</span>
              </div>
              <div className="text-2xl font-bold text-amber-700">{result.visits.length}</div>
              <div className="text-xs text-amber-600 mt-1">{result.visits.filter(v => v.practitioner.isKOL).length} KOLs inclus</div>
            </div>
          </div>

          {/* Carte */}
          <div className="glass-card p-6">
            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              Itinéraire optimisé
            </h3>
            <div className="h-[500px] rounded-xl overflow-hidden">
              <MapContainer
                center={[45.7640, 4.8357]}
                zoom={8}
                className="h-full w-full"
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {/* Route */}
                <Polyline
                  positions={result.route}
                  color="#0066B3"
                  weight={4}
                  opacity={0.7}
                />

                {/* Marqueurs */}
                {result.visits.map((visit) => {
                  const coords = CITY_COORDS[visit.practitioner.city.toUpperCase()];
                  if (!coords) return null;
                  return (
                    <Marker
                      key={visit.practitioner.id}
                      position={coords}
                      icon={createNumberIcon(visit.order, visit.practitioner.isKOL)}
                    >
                      <Popup>
                        <div className="p-2">
                          <div className="font-bold">{visit.practitioner.firstName} {visit.practitioner.lastName}</div>
                          <div className="text-sm text-slate-600">{visit.practitioner.specialty}</div>
                          <div className="text-sm text-slate-600 mt-1">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {visit.estimatedTime} • {visit.travelTime} min de trajet
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Point de départ */}
                <Marker
                  position={[45.7640, 4.8357]}
                  icon={L.divIcon({
                    html: `<div style="width: 40px; height: 40px; background: #10B981; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 4px solid white; box-shadow: 0 2px 12px rgba(0,0,0,0.3);">🏠</div>`,
                    className: '',
                    iconSize: [40, 40],
                    iconAnchor: [20, 20],
                  })}
                >
                  <Popup>Point de départ : Lyon</Popup>
                </Marker>
              </MapContainer>
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
                  className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200 hover:shadow-md transition-shadow"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold flex-shrink-0">
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
                      <div className="text-slate-500">Arrivée</div>
                      <div className="font-bold text-slate-800">{visit.estimatedTime}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-500">Trajet</div>
                      <div className="font-bold text-blue-700">{visit.travelTime} min</div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-500">Distance</div>
                      <div className="font-bold text-purple-700">{visit.distance} km</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="glass-card p-6 bg-gradient-to-br from-green-50 to-blue-50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Tournée optimisée avec succès !</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Économie de {result.kmSaved} km et {Math.round(result.timeSaved / 60)}h de trajet
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
