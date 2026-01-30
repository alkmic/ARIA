import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { Map, ChevronRight } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface TerritoryStats {
  urgent: number;    // Non vus >90 jours
  toSchedule: number; // Non vus 30-90 jours
  upToDate: number;  // Vus <30 jours
}

interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  status: 'urgent' | 'toSchedule' | 'upToDate';
  name: string;
}

export function TerritoryMiniMap({ stats, points }: { stats: TerritoryStats; points: MapPoint[] }) {
  const navigate = useNavigate();

  const getColor = (status: string) => {
    switch (status) {
      case 'urgent': return '#EF4444';
      case 'toSchedule': return '#F59E0B';
      default: return '#10B981';
    }
  };

  return (
    <div className="glass-card p-4 sm:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
          <Map className="w-4 h-4 sm:w-5 sm:h-5 text-al-blue-500" />
          Mon territoire
        </h3>
      </div>

      {/* Carte */}
      <div className="flex-1 rounded-xl overflow-hidden mb-3 sm:mb-4 min-h-[180px] sm:min-h-[200px]">
        <MapContainer
          center={[45.75, 4.85]}
          zoom={8}
          className="h-full w-full"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {points.map((point) => (
            <CircleMarker
              key={point.id}
              center={[point.lat, point.lng]}
              radius={8}
              pathOptions={{
                color: getColor(point.status),
                fillColor: getColor(point.status),
                fillOpacity: 0.8,
              }}
            >
              <Tooltip>{point.name}</Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* Légende stats */}
      <div className="space-y-1.5 sm:space-y-2">
        <div className="flex items-center justify-between p-1.5 sm:p-2 bg-red-50 rounded-lg">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-red-700">Urgents (&gt;90j)</span>
          </div>
          <span className="font-bold text-sm sm:text-base text-red-700">{stats.urgent}</span>
        </div>
        <div className="flex items-center justify-between p-1.5 sm:p-2 bg-amber-50 rounded-lg">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-500 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-amber-700">À planifier (30-90j)</span>
          </div>
          <span className="font-bold text-sm sm:text-base text-amber-700">{stats.toSchedule}</span>
        </div>
        <div className="flex items-center justify-between p-1.5 sm:p-2 bg-green-50 rounded-lg">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-green-700">À jour (&lt;30j)</span>
          </div>
          <span className="font-bold text-sm sm:text-base text-green-700">{stats.upToDate}</span>
        </div>
      </div>

      {/* Action */}
      <button
        onClick={() => navigate('/map')}
        className="mt-3 sm:mt-4 w-full btn-secondary text-xs sm:text-sm py-2 flex items-center justify-center gap-2"
      >
        Voir la carte complète
        <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
      </button>
    </div>
  );
}
