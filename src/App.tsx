import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { TimePeriodProvider } from './contexts/TimePeriodContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

// Lazy loading pour optimiser les performances
const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const Welcome = lazy(() => import('./pages/Welcome'));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const HCPProfile = lazy(() => import('./pages/HCPProfile').then(m => ({ default: m.HCPProfile })));
const PractitionerProfile = lazy(() => import('./pages/PractitionerProfile'));
const PitchGenerator = lazy(() => import('./pages/PitchGenerator').then(m => ({ default: m.PitchGenerator })));
const AICoach = lazy(() => import('./pages/AICoach'));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Visits = lazy(() => import('./pages/Visits').then(m => ({ default: m.Visits })));
const TerritoryMap = lazy(() => import('./pages/TerritoryMap'));
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard'));
const KOLPlanningPage = lazy(() => import('./pages/KOLPlanningPage'));
const TourOptimizationPage = lazy(() => import('./pages/TourOptimizationPage'));

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <TimePeriodProvider>
            <BrowserRouter>
              <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900">
                  <LoadingSpinner size="lg" />
                </div>
              }>
                <Routes>
                  {/* Landing page without Layout */}
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/landing" element={<Landing />} />
                  <Route path="/welcome" element={<Welcome />} />

                  {/* App pages with Layout */}
                  <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
                  <Route path="/practitioners" element={<Layout><HCPProfile /></Layout>} />
                  <Route path="/practitioner/:id" element={<Layout><PractitionerProfile /></Layout>} />
                  <Route path="/visits" element={<Layout><Visits /></Layout>} />
                  <Route path="/pitch" element={<Layout><PitchGenerator /></Layout>} />
                  <Route path="/coach" element={<Layout><AICoach /></Layout>} />
                  <Route path="/map" element={<Layout><TerritoryMap /></Layout>} />
                  <Route path="/manager" element={<Layout><ManagerDashboard /></Layout>} />
                  <Route path="/kol-planning" element={<Layout><KOLPlanningPage /></Layout>} />
                  <Route path="/tour-optimization" element={<Layout><TourOptimizationPage /></Layout>} />
                  <Route path="/settings" element={<Layout><Settings /></Layout>} />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TimePeriodProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
