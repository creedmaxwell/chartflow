import { useState } from 'react';
import supabase  from './lib/supabase'
import Sidebar from './components/layout/Sidebar';
import DashboardPage from './pages/DashboardPage';
import NewNotePage from './pages/NewNotePage';
//import PatientsPage from './pages/PatientsPage';
import AppointmentsPage from './pages/AppointmentsPage';
//import ReportsPage from './pages/ReportsPage';
//import SettingsPage from './pages/SettingsPage';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Render the appropriate page based on currentPage state
  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'new-note':
        return <NewNotePage />;
      case 'appointments':
        return <AppointmentsPage />;
      //case 'patients':
      //  return <PatientsPage />;
      //case 'reports':
       // return <ReportsPage />;
      //case 'settings':
        //return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar - always visible on desktop, slide-out on mobile */}
      <Sidebar activePage={currentPage} onPageChange={setCurrentPage} />

      {/* Main content area - takes up remaining space */}
      <div className="flex-1 lg:ml-0">
        {/* Extra padding on mobile to account for hamburger button */}
        <div className="p-6 lg:p-8 pt-20 lg:pt-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default App;