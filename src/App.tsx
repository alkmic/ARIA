import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { HCPProfile } from './pages/HCPProfile';
import PractitionerProfile from './pages/PractitionerProfile';
import { PitchGenerator } from './pages/PitchGenerator';
import AICoach from './pages/AICoach';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/practitioners" element={<HCPProfile />} />
          <Route path="/practitioner/:id" element={<PractitionerProfile />} />
          <Route path="/pitch" element={<PitchGenerator />} />
          <Route path="/coach" element={<AICoach />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
