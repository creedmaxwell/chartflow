import { useState, useEffect } from 'react';
import supabase from './lib/supabase';
import Login from './pages/Login';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import DashboardPage from './pages/DashboardPage';
import NewNotePage from './pages/NewNotePage';
import ChartsPage from './pages/ChartsPage';
//import SettingsPage from './pages/SettingsPage';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    checkUser();

    // Listen for auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    } catch (error) {
      console.error('Error checking user session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setCurrentPage('dashboard');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Render the appropriate page based on currentPage state
  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'new-note':
        return <NewNotePage />;
      case 'charts':
        return <ChartsPage />;
      default:
        return <DashboardPage />;
    }
  };

  // Show loading screen while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return <Login />;
  }

  // Show main app if authenticated
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar - always visible on desktop, slide-out on mobile */}
      <Sidebar 
        activePage={currentPage} 
        onPageChange={setCurrentPage}
        user={user}
        onSignOut={handleSignOut}
      />

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