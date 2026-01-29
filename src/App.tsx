import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { HCPProfile } from './pages/HCPProfile';
import { PitchGenerator } from './pages/PitchGenerator';
import { AICoach } from './pages/AICoach';
import { useAppStore } from './stores/useAppStore';

function App() {
  const { currentPage } = useAppStore();

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'practitioners':
        return <HCPProfile />;
      case 'pitch':
        return <PitchGenerator />;
      case 'coach':
        return <AICoach />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout>
      {renderPage()}
    </Layout>
  );
}

export default App;
