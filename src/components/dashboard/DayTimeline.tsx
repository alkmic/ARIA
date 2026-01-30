import { motion } from 'framer-motion';
import { MapPin, CheckCircle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Practitioner } from '../../types';

interface Visit {
  id: string;
  time: string;
  practitioner: Practitioner;
  status: 'prepared' | 'to-prepare' | 'completed';
  isNext?: boolean;
}

export function DayTimeline({ visits }: { visits: Visit[] }) {
  const navigate = useNavigate();

  const getStatusStyles = (status: Visit['status'], isNext: boolean) => {
    if (status === 'completed') return 'bg-green-100 border-green-300';
    if (isNext) return 'bg-al-blue-50 border-al-blue-300 ring-2 ring-al-blue-200';
    if (status === 'to-prepare') return 'bg-amber-50 border-amber-300';
    return 'bg-white border-slate-200';
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const getColorFromString = (str: string) => {
    const colors = ['#0066B3', '#00B5AD', '#F59E0B', '#10B981', '#6366F1', '#EC4899'];
    const index = str.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-lg flex items-center gap-2">
          📅 Ma journée
        </h3>
        <span className="text-sm text-slate-500">
          {visits.filter(v => v.status === 'completed').length}/{visits.length} terminées
        </span>
      </div>

      <div className="relative">
        {/* Ligne verticale de connexion */}
        <div className="absolute left-[22px] top-8 bottom-8 w-0.5 bg-slate-200" />

        <div className="space-y-4">
          {visits.map((visit, index) => (
            <motion.div
              key={visit.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => navigate(`/practitioner/${visit.practitioner.id}`)}
              className={`relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer
                         transition-all duration-200 hover:shadow-md
                         ${getStatusStyles(visit.status, visit.isNext || false)}`}
            >
              {/* Indicateur horaire */}
              <div className="flex flex-col items-center w-12 flex-shrink-0">
                <span className={`text-sm font-bold ${visit.isNext ? 'text-al-blue-600' : 'text-slate-600'}`}>
                  {visit.time}
                </span>
                <div className={`w-3 h-3 rounded-full mt-1 ${
                  visit.status === 'completed' ? 'bg-green-500' :
                  visit.isNext ? 'bg-al-blue-500 animate-pulse' :
                  'bg-slate-300'
                }`} />
              </div>

              {/* Avatar */}
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                style={{ backgroundColor: getColorFromString(visit.practitioner.id) }}
              >
                {getInitials(visit.practitioner.firstName, visit.practitioner.lastName)}
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-al-navy truncate">
                  {visit.practitioner.title} {visit.practitioner.firstName} {visit.practitioner.lastName}
                </p>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span>{visit.practitioner.specialty}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {visit.practitioner.city}
                  </span>
                </div>
              </div>

              {/* Statut */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {visit.status === 'completed' && (
                  <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Terminée
                  </span>
                )}
                {visit.status === 'prepared' && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    Pitch prêt ✓
                  </span>
                )}
                {visit.status === 'to-prepare' && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                    À préparer
                  </span>
                )}
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>

              {/* Badge "Prochaine" */}
              {visit.isNext && (
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-al-blue-500 text-white text-xs font-bold rounded-full">
                  PROCHAINE
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex gap-3">
        <button
          onClick={() => navigate('/visits')}
          className="flex-1 btn-secondary text-sm py-2"
        >
          Voir toutes les visites
        </button>
        <button className="flex-1 btn-primary text-sm py-2">
          Optimiser ma tournée
        </button>
      </div>
    </div>
  );
}
