import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Landing } from './pages/Landing';
import Welcome from './pages/Welcome';
import { Dashboard } from './pages/Dashboard';
import { HCPProfile } from './pages/HCPProfile';
import PractitionerProfile from './pages/PractitionerProfile';
import { PitchGenerator } from './pages/PitchGenerator';
import AICoach from './pages/AICoach';
import { Settings } from './pages/Settings';
import { Visits } from './pages/Visits';
import TerritoryMap from './pages/TerritoryMap';
import ManagerDashboard from './pages/ManagerDashboard';
import KOLPlanningPage from './pages/KOLPlanningPage';
import TourOptimizationPage from './pages/TourOptimizationPage';
import VoiceVisitReport from './pages/VoiceVisitReport';
import NextBestActions from './pages/NextBestActions';
import { TimePeriodProvider } from './contexts/TimePeriodContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <TimePeriodProvider>
        <BrowserRouter>
          <Routes>
            {/* Landing page without Layout */}
            <Route path="/" element={<Navigate to="/welcome" replace />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/welcome" element={<Welcome />} />

            {/* App pages with Layout */}
            <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
            <Route path="/practitioners" element={<Layout><HCPProfile /></Layout>} />
            <Route path="/practitioner/:id" element={<Layout><ErrorBoundary fallbackTitle="Erreur chargement praticien"><PractitionerProfile /></ErrorBoundary></Layout>} />
            <Route path="/visits" element={<Layout><Visits /></Layout>} />
            <Route path="/pitch" element={<Layout><ErrorBoundary fallbackTitle="Erreur chargement pitch"><PitchGenerator /></ErrorBoundary></Layout>} />
            <Route path="/coach" element={<Layout><ErrorBoundary fallbackTitle="Erreur chargement coach"><AICoach /></ErrorBoundary></Layout>} />
            <Route path="/map" element={<Layout><TerritoryMap /></Layout>} />
            <Route path="/manager" element={<Layout><ManagerDashboard /></Layout>} />
            <Route path="/kol-planning" element={<Layout><KOLPlanningPage /></Layout>} />
            <Route path="/tour-optimization" element={<Layout><TourOptimizationPage /></Layout>} />
            <Route path="/settings" element={<Layout><Settings /></Layout>} />

            {/* New AI-powered pages */}
            <Route path="/visit-report" element={<Layout><VoiceVisitReport /></Layout>} />
            <Route path="/next-actions" element={<Layout><NextBestActions /></Layout>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </TimePeriodProvider>
    </ErrorBoundary>
  );
}

export default App;
