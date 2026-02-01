import { useState } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Plus, Calendar as CalendarIcon, List, Edit, Trash2 } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { motion } from 'framer-motion';
import type { UpcomingVisit } from '../types';

const localizer = momentLocalizer(moment);

const messages = {
  allDay: 'Journée',
  previous: 'Précédent',
  next: 'Suivant',
  today: "Aujourd'hui",
  month: 'Mois',
  week: 'Semaine',
  day: 'Jour',
  agenda: 'Agenda',
  date: 'Date',
  time: 'Heure',
  event: 'Visite',
  noEventsInRange: 'Aucune visite prévue sur cette période.',
  showMore: (total: number) => `+ ${total} visite(s) supplémentaire(s)`,
};

export default function VisitsCalendar() {
  const { upcomingVisits } = useAppStore();
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [selectedVisit, setSelectedVisit] = useState<UpcomingVisit | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Transformer les visites pour le calendrier
  const events = upcomingVisits.map(visit => ({
    id: visit.id,
    title: `${visit.time} - ${visit.practitioner.firstName} ${visit.practitioner.lastName}`,
    start: new Date(`${visit.date}T${visit.time}`),
    end: new Date(`${visit.date}T${visit.time}`),
    resource: visit,
  }));

  const handleSelectEvent = (event: any) => {
    setSelectedVisit(event.resource);
    setShowModal(true);
  };

  const handleSelectSlot = (slotInfo: any) => {
    // Créer nouvelle visite
    console.log('Nouvelle visite à créer:', slotInfo);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Gestion des Visites
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Planifiez et suivez vos visites médicales
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle View */}
          <div className="flex rounded-lg bg-slate-100 dark:bg-gray-800 p-1">
            <button
              onClick={() => setView('calendar')}
              className={`px-4 py-2 rounded-md transition-colors ${
                view === 'calendar'
                  ? 'bg-white dark:bg-gray-700 text-al-blue-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <CalendarIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-md transition-colors ${
                view === 'list'
                  ? 'bg-white dark:bg-gray-700 text-al-blue-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>

          {/* Nouvelle visite */}
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Nouvelle visite</span>
          </button>
        </div>
      </div>

      {/* Calendrier */}
      {view === 'calendar' ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 min-h-[600px] calendar-container">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 600 }}
            views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
            messages={messages}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            popup
            className="dark-calendar"
          />
        </div>
      ) : (
        <div className="grid gap-4">
          {upcomingVisits.map(visit => (
            <motion.div
              key={visit.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-medium text-al-blue-600 dark:text-al-sky">
                      {new Date(visit.date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {visit.time}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {visit.practitioner.title} {visit.practitioner.firstName}{' '}
                    {visit.practitioner.lastName}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {visit.practitioner.specialty} • {visit.practitioner.city}
                  </p>
                  {visit.notes && (
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                      {visit.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-500 hover:text-al-blue-600 dark:hover:text-al-sky rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">
                    <Edit className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal détails visite */}
      {showModal && selectedVisit && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Détails de la visite
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Praticien</label>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedVisit.practitioner.title} {selectedVisit.practitioner.firstName}{' '}
                  {selectedVisit.practitioner.lastName}
                </p>
              </div>

              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Date et heure</label>
                <p className="text-gray-900 dark:text-white">
                  {new Date(selectedVisit.date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}{' '}
                  à {selectedVisit.time}
                </p>
              </div>

              {selectedVisit.notes && (
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Notes</label>
                  <p className="text-gray-900 dark:text-white">{selectedVisit.notes}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button className="flex-1 btn-primary">Modifier</button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Fermer
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <style>{`
        .calendar-container .rbc-calendar {
          font-family: inherit;
        }

        .dark-calendar .rbc-month-view,
        .dark-calendar .rbc-time-view {
          background: transparent;
          border-color: rgba(75, 85, 99, 0.3);
        }

        .dark-calendar .rbc-header {
          background: rgba(31, 41, 55, 0.5);
          border-color: rgba(75, 85, 99, 0.3);
          color: rgb(209, 213, 219);
          font-weight: 600;
        }

        .dark-calendar .rbc-today {
          background-color: rgba(0, 102, 179, 0.1);
        }

        .dark-calendar .rbc-off-range-bg {
          background: rgba(31, 41, 55, 0.3);
        }

        .dark-calendar .rbc-event {
          background-color: rgb(0, 102, 179);
        }

        .dark-calendar .rbc-day-slot .rbc-time-slot {
          border-color: rgba(75, 85, 99, 0.2);
        }

        .dark-calendar .rbc-time-content {
          border-color: rgba(75, 85, 99, 0.3);
        }

        .dark-calendar .rbc-current-time-indicator {
          background-color: rgb(239, 68, 68);
        }

        .dark-calendar .rbc-month-row,
        .dark-calendar .rbc-day-bg,
        .dark-calendar .rbc-date-cell {
          border-color: rgba(75, 85, 99, 0.2);
        }

        .dark-calendar .rbc-date-cell button {
          color: rgb(209, 213, 219);
        }

        .dark-calendar .rbc-button-link {
          color: rgb(209, 213, 219);
        }

        .dark-calendar .rbc-event-label {
          font-size: 0.75rem;
        }

        .dark-calendar .rbc-toolbar button {
          color: rgb(107, 114, 128);
          border-color: rgba(75, 85, 99, 0.3);
        }

        .dark-calendar .rbc-toolbar button:hover {
          background-color: rgba(31, 41, 55, 0.5);
          color: rgb(209, 213, 219);
        }

        .dark-calendar .rbc-toolbar button.rbc-active {
          background-color: rgb(0, 102, 179);
          color: white;
        }
      `}</style>
    </div>
  );
}
