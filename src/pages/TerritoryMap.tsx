import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Filter, Route, MapPin, TrendingUp, Clock } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { useNavigate } from 'react-router-dom';
import { useTimePeriod } from '../contexts/TimePeriodContext';
import { PeriodSelector } from '../components/shared/PeriodSelector';
import { filterPractitionersByPeriod } from '../services/metricsCalculator';
import { optimizeRoute } from '../services/routeOptimizer';
import type { RouteOptimizationCriteria, RouteOptimizationResult } from '../services/routeOptimizer';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix pour les icônes Leaflet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Coordonnées pour les villes principales de Rhône-Alpes
const CITY_COORDS: Record<string, [number, number]> = {
  'BOURG-EN-BRESSE': [46.2056, 5.2256],
  'BOURG EN BRESSE': [46.2056, 5.2256],
  'LYON': [45.7640, 4.8357],
  'LYON 1ER': [45.7675, 4.8332],
  'LYON 2E': [45.7485, 4.8270],
  'LYON 3E': [45.7547, 4.8677],
  'LYON 4E': [45.7787, 4.8272],
  'LYON 5E': [45.7578, 4.8102],
  'LYON 6E': [45.7695, 4.8502],
  'LYON 7E': [45.7349, 4.8410],
  'LYON 8E': [45.7368, 4.8677],
  'LYON 9E': [45.7788, 4.8043],
  'VILLEURBANNE': [45.7676, 4.8799],
  'GRENOBLE': [45.1885, 5.7245],
  'SAINT-ÉTIENNE': [45.4397, 4.3872],
  'ANNECY': [45.8992, 6.1294],
  'CHAMBÉRY': [45.5646, 5.9178],
  'VALENCE': [44.9334, 4.8924],
  'VIENNE': [45.5253, 4.8777],
  'ANNEMASSE': [46.1958, 6.2354],
  'THONON-LES-BAINS': [46.3713, 6.4808],
  'ALBERTVILLE': [45.6758, 6.3925],
  'BRON': [45.7392, 4.9112],
  'CALUIRE-ET-CUIRE': [45.7947, 4.8497],
  'VÉNISSIEUX': [45.6973, 4.8871],
  'MEYZIEU': [45.7667, 5.0036],
  'BELLEVILLE': [46.1108, 4.7497],
  'MÂCON': [46.3064, 4.8285],
  'ROANNE': [46.0333, 4.0667],
  'MONTÉLIMAR': [44.5584, 4.7509],
  'PRIVAS': [44.7353, 4.5994],
  'OYONNAX': [46.2567, 5.6558],
  'AUBENAS': [44.6203, 4.3903],
  'TOURNON-SUR-RHÔNE': [45.0678, 4.8336],
  'CREST': [44.7281, 5.0211],
  'VILLEFRANCHE-SUR-SAÔNE': [45.9889, 4.7189],
  'BELLEY': [45.7589, 5.6889],
};

// Icônes personnalisées par vingtile
const createCustomIcon = (vingtile: number, isKOL: boolean) => {
  const color = vingtile <= 2 ? '#EF4444' : vingtile <= 5 ? '#F59E0B' : vingtile <= 10 ? '#10B981' : '#6B7280';
  const size = isKOL ? 40 : 30;

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${isKOL ? '14px' : '12px'};
      ">
        ${isKOL ? '⭐' : vingtile}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

export function TerritoryMap() {
  const { practitioners } = useAppStore();
  const navigate = useNavigate();
  const { timePeriod, periodLabel } = useTimePeriod();

  const [filters, setFilters] = useState({
    specialty: 'all',
    vingtileMax: 20,
    kolOnly: false,
  });

  const [optimizationCriteria, setOptimizationCriteria] = useState<RouteOptimizationCriteria>({
    optimizeFor: 'distance',
    maxVisitsPerDay: 6,
    prioritizeKOLs: true,
    prioritizeAtRisk: true,
  });

  const [optimizationResult, setOptimizationResult] = useState<RouteOptimizationResult | null>(null);
  const [showOptimization, setShowOptimization] = useState(false);
  const [selectedPractitionerIds, setSelectedPractitionerIds] = useState<Set<string>>(new Set());
  const [showSelectionList, setShowSelectionList] = useState(false);
  const [nonOptimizedDistance, setNonOptimizedDistance] = useState<number>(0);

  // Filtrer les praticiens par période
  const periodFilteredPractitioners = useMemo(() => {
    return filterPractitionersByPeriod(practitioners, timePeriod);
  }, [practitioners, timePeriod]);

  // Filtrer et géocoder les praticiens
  const mappedPractitioners = useMemo(() => {
    return periodFilteredPractitioners
      .filter(p => {
        if (filters.specialty !== 'all' && p.specialty !== filters.specialty) return false;
        if (p.vingtile > filters.vingtileMax) return false;
        if (filters.kolOnly && !p.isKOL) return false;
        return true;
      })
      .map(p => {
        const cityKey = p.city?.toUpperCase() || '';
        const coords = CITY_COORDS[cityKey];
        if (!coords) return null;

        // Ajouter un léger offset aléatoire pour éviter la superposition
        const offset = () => (Math.random() - 0.5) * 0.02;
        return {
          ...p,
          coords: [coords[0] + offset(), coords[1] + offset()] as [number, number],
        };
      })
      .filter(Boolean);
  }, [periodFilteredPractitioners, filters]);

  // Count by specialty
  const pneumologues = practitioners.filter(p => p.specialty === 'Pneumologue').length;
  const generalistes = practitioners.filter(p => p.specialty === 'Médecin généraliste').length;
  const totalVolume = mappedPractitioners.reduce((sum, p) => sum + (p?.volumeL || 0), 0);

  // Praticiens sélectionnés pour l'optimisation
  const selectedPractitioners = useMemo(() => {
    return mappedPractitioners.filter(p => p && selectedPractitionerIds.has(p.id));
  }, [mappedPractitioners, selectedPractitionerIds]);

  // Initialiser la sélection avec tous les praticiens filtrés
  useMemo(() => {
    if (mappedPractitioners.length > 0 && selectedPractitionerIds.size === 0) {
      setSelectedPractitionerIds(new Set(mappedPractitioners.filter(p => p).map(p => p!.id)));
    }
  }, [mappedPractitioners]);

  // Fonction pour calculer la distance d'un itinéraire non optimisé (ordre actuel)
  const calculateNonOptimizedDistance = (practitioners: any[]) => {
    if (practitioners.length < 2) return 0;
    let totalDistance = 0;
    for (let i = 0; i < practitioners.length - 1; i++) {
      const p1 = practitioners[i];
      const p2 = practitioners[i + 1];
      if (p1.coords && p2.coords) {
        const distance = Math.sqrt(
          Math.pow(p2.coords[0] - p1.coords[0], 2) +
          Math.pow(p2.coords[1] - p1.coords[1], 2)
        ) * 111; // approximation en km
        totalDistance += distance;
      }
    }
    return totalDistance;
  };

  // Fonction pour basculer la sélection d'un praticien
  const togglePractitionerSelection = (id: string) => {
    setSelectedPractitionerIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Fonction pour calculer l'itinéraire optimal
  const handleOptimizeRoute = () => {
    if (selectedPractitioners.length === 0) {
      alert('Veuillez sélectionner au moins un praticien pour l\'optimisation');
      return;
    }

    // Calculer la distance non optimisée
    const nonOptDist = calculateNonOptimizedDistance(selectedPractitioners);
    setNonOptimizedDistance(nonOptDist);

    // Optimiser
    const result = optimizeRoute(selectedPractitioners as any[], optimizationCriteria);
    setOptimizationResult(result);
    setShowOptimization(true);
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="w-6 h-6 text-al-blue-500" />
          <h1 className="text-2xl font-bold text-al-navy">Carte du territoire</h1>
        </div>
        <PeriodSelector />
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panneau de filtres et options */}
        <div className="w-96 bg-white border-r border-slate-200 overflow-y-auto">
          {/* Filtres */}
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5 text-al-blue-500" />
              Filtres
            </h2>

            {/* Spécialité */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Spécialité</label>
              <select
                value={filters.specialty}
                onChange={(e) => setFilters(f => ({ ...f, specialty: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-al-blue-500"
              >
                <option value="all">Toutes ({practitioners.length})</option>
                <option value="Pneumologue">Pneumologues ({pneumologues})</option>
                <option value="Médecin généraliste">Généralistes ({generalistes})</option>
              </select>
            </div>

            {/* Vingtile */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Vingtile max : {filters.vingtileMax}
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={filters.vingtileMax}
                onChange={(e) => setFilters(f => ({ ...f, vingtileMax: parseInt(e.target.value) }))}
                className="w-full accent-al-blue-500"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>Top 5%</span>
                <span>Tous</span>
              </div>
            </div>

            {/* KOL uniquement */}
            <div className="mb-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.kolOnly}
                  onChange={(e) => setFilters(f => ({ ...f, kolOnly: e.target.checked }))}
                  className="w-4 h-4 text-al-blue-500 rounded"
                />
                <span className="font-medium">KOLs uniquement</span>
              </label>
            </div>

            {/* Stats */}
            <div className="p-4 bg-al-blue-50 rounded-xl">
              <h3 className="font-semibold text-al-navy mb-2 text-sm">Résumé {periodLabel}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Praticiens affichés</span>
                  <span className="font-medium">{mappedPractitioners.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">dont KOLs</span>
                  <span className="font-medium">{mappedPractitioners.filter(p => p?.isKOL).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Volume total</span>
                  <span className="font-medium">
                    {(totalVolume / 1000000).toFixed(1)}M L
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section Sélection des praticiens à visiter */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-500" />
                Praticiens à visiter
              </h2>
              <button
                onClick={() => setShowSelectionList(!showSelectionList)}
                className="text-sm text-al-blue-500 hover:underline font-medium"
              >
                {showSelectionList ? 'Masquer' : 'Voir la liste'}
              </button>
            </div>

            <div className="text-sm text-slate-600 mb-3">
              <strong>{selectedPractitioners.length}</strong> praticien(s) sélectionné(s) pour {periodLabel.toLowerCase()}
            </div>

            {showSelectionList && (
              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                {mappedPractitioners.map((p) => p && (
                  <label
                    key={p.id}
                    className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPractitionerIds.has(p.id)}
                      onChange={() => togglePractitionerSelection(p.id)}
                      className="w-4 h-4 text-al-blue-500 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {p.title} {p.lastName}
                        {p.isKOL && ' ⭐'}
                      </p>
                      <p className="text-xs text-slate-500">{p.city} • {(p.volumeL / 1000).toFixed(0)}K L</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setSelectedPractitionerIds(new Set(mappedPractitioners.filter(p => p).map(p => p!.id)))}
                className="flex-1 text-xs py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                Tout sélectionner
              </button>
              <button
                onClick={() => setSelectedPractitionerIds(new Set())}
                className="flex-1 text-xs py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                Tout désélectionner
              </button>
            </div>
          </div>

          {/* Section Optimisation d'itinéraire */}
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Route className="w-5 h-5 text-al-blue-500" />
              Optimisation d'itinéraire
            </h2>

            {/* Critères d'optimisation */}
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Optimiser pour</label>
                <select
                  value={optimizationCriteria.optimizeFor}
                  onChange={(e) => setOptimizationCriteria(c => ({ ...c, optimizeFor: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-al-blue-500 text-sm"
                >
                  <option value="distance">Distance minimale</option>
                  <option value="time">Temps minimal</option>
                  <option value="kol_priority">Priorité KOLs</option>
                  <option value="volume_priority">Priorité volume</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Visites par jour : {optimizationCriteria.maxVisitsPerDay}
                </label>
                <input
                  type="range"
                  min="3"
                  max="10"
                  value={optimizationCriteria.maxVisitsPerDay}
                  onChange={(e) => setOptimizationCriteria(c => ({ ...c, maxVisitsPerDay: parseInt(e.target.value) }))}
                  className="w-full accent-al-blue-500"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>3</span>
                  <span>10</span>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optimizationCriteria.prioritizeKOLs}
                    onChange={(e) => setOptimizationCriteria(c => ({ ...c, prioritizeKOLs: e.target.checked }))}
                    className="w-4 h-4 text-al-blue-500 rounded"
                  />
                  <span className="text-sm font-medium">Prioriser les KOLs</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optimizationCriteria.prioritizeAtRisk}
                    onChange={(e) => setOptimizationCriteria(c => ({ ...c, prioritizeAtRisk: e.target.checked }))}
                    className="w-4 h-4 text-al-blue-500 rounded"
                  />
                  <span className="text-sm font-medium">Prioriser à risque</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleOptimizeRoute}
              disabled={selectedPractitioners.length === 0}
              className="w-full bg-al-blue-500 hover:bg-al-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Calculer l'itinéraire optimal
            </button>
          </div>

          {/* Résultat de l'optimisation */}
          {showOptimization && optimizationResult && (
            <div className="p-6 border-b border-slate-200 bg-green-50">
              <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Résultat
              </h3>

              <p className="text-sm text-green-800 mb-4">{optimizationResult.summary}</p>

              {/* Comparaison avant/après */}
              {nonOptimizedDistance > 0 && (
                <div className="mb-4 p-3 bg-white rounded-lg border-2 border-green-300">
                  <p className="font-semibold text-sm text-green-900 mb-2">💡 Bénéfices de l'optimisation</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Distance sans optimisation</span>
                      <span className="font-medium text-slate-800">{nonOptimizedDistance.toFixed(1)} km</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Distance optimisée</span>
                      <span className="font-medium text-green-700">{optimizationResult.totalDistance.toFixed(1)} km</span>
                    </div>
                    <div className="pt-2 border-t border-green-200 flex justify-between items-center">
                      <span className="font-semibold text-green-900">Économie</span>
                      <span className="font-bold text-green-700">
                        -{(nonOptimizedDistance - optimizationResult.totalDistance).toFixed(1)} km
                        ({(((nonOptimizedDistance - optimizationResult.totalDistance) / nonOptimizedDistance) * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-green-900">Temps gagné</span>
                      <span className="font-bold text-green-700">
                        ~{Math.floor(((nonOptimizedDistance - optimizationResult.totalDistance) / 60) * 60)} min
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {optimizationResult.routes.map((route, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-3 shadow-sm">
                    <h4 className="font-semibold text-sm mb-2">Jour {route.day}</h4>
                    <div className="space-y-1 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span>Visites</span>
                        <span className="font-medium">{route.practitioners.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Distance</span>
                        <span className="font-medium">{route.totalDistance.toFixed(1)} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Temps estimé</span>
                        <span className="font-medium">
                          {Math.floor(route.totalTime / 60)}h{route.totalTime % 60}min
                        </span>
                      </div>
                    </div>

                    {/* Liste des praticiens dans l'ordre */}
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <p className="text-xs font-medium text-slate-700 mb-1">Ordre de visite:</p>
                      <ol className="text-xs space-y-1">
                        {route.order.map((idx, orderIdx) => {
                          const p = route.practitioners[idx];
                          return (
                            <li key={orderIdx} className="flex items-center gap-2">
                              <span className="font-medium text-al-blue-600">{orderIdx + 1}.</span>
                              <span className="truncate">
                                {p.lastName} ({p.city})
                                {p.isKOL && ' ⭐'}
                              </span>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Légende */}
          <div className="p-6">
            <h3 className="font-semibold mb-3 text-sm">Légende</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Vingtile 1-2 (Top prescripteurs)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Vingtile 3-5</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Vingtile 6-10</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500" />
                <span>Vingtile 11+</span>
              </div>
              <div className="flex items-center gap-2">
                <span>⭐</span>
                <span>Key Opinion Leader</span>
              </div>
            </div>
          </div>
        </div>

      {/* Carte */}
      <div className="flex-1 relative">
          <MapContainer
            center={[45.75, 4.85]} // Centre sur Lyon
            zoom={9}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {mappedPractitioners.map((p) => p && (
              <Marker
                key={p.id}
                position={p.coords}
                icon={createCustomIcon(p.vingtile, p.isKOL)}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <h3 className="font-bold">{p.title} {p.firstName} {p.lastName}</h3>
                    <p className="text-sm text-slate-600">{p.specialty}</p>
                    <p className="text-sm">{p.city}</p>
                    <div className="mt-2 flex gap-2 text-xs">
                      <span className="px-2 py-1 bg-al-blue-100 text-al-blue-700 rounded">
                        V{p.vingtile}
                      </span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                        {(p.volumeL / 1000).toFixed(0)}K L
                      </span>
                    </div>
                    <button
                      onClick={() => navigate(`/practitioner/${p.id}`)}
                      className="mt-3 w-full bg-al-blue-500 hover:bg-al-blue-600 text-white py-2 rounded-lg text-sm transition-colors"
                    >
                      Voir le profil
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Overlay stats */}
          <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-4 z-[1000]">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-al-navy">{mappedPractitioners.length}</p>
                <p className="text-xs text-slate-500">Praticiens</p>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="text-center">
                <p className="text-2xl font-bold text-al-navy">
                  {mappedPractitioners.filter(p => p?.isKOL).length}
                </p>
                <p className="text-xs text-slate-500">KOLs</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
