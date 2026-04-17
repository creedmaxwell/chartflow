import { useState, useEffect } from 'react';
import supabase from './lib/supabase';
import Login from './pages/Login';
import Sidebar from './components/layout/Sidebar';
import DashboardPage from './pages/DashboardPage';
import NotesPage from './pages/NotesPage';
import ChartsPage from './pages/ChartsPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- THEME INITIALIZATION ---
  // This ensures the app checks localStorage immediately on load 
  // and applies the 'dark' class to the HTML document.
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  }, []);

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
        return <DashboardPage onPageChange={setCurrentPage} />;
      case 'notes':
        return <NotesPage />;
      case 'charts':
        return <ChartsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage onPageChange={setCurrentPage} />;
    }
  };

  // Show themed loading screen while checking auth
  if (loading) {
    return (
      // Changed bg-surface to dynamic dark mode classes
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white transition-colors duration-200">
        <div className="text-center flex flex-col items-center">
          <span className="material-symbols-outlined text-primary dark:text-blue-400 text-5xl animate-spin mb-4">progress_activity</span>
          <p className="text-slate-500 dark:text-slate-400 font-bold tracking-widest uppercase text-sm">Authenticating...</p>
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
    // Changed bg-surface to dynamic dark mode classes
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-body transition-colors duration-200">
      {/* Sidebar - always visible on desktop, slide-out on mobile */}
      <Sidebar 
        activePage={currentPage} 
        onPageChange={setCurrentPage}
        user={user}
        onSignOut={handleSignOut}
      />

      {/* Main content area - takes up remaining space */}
      <div className="flex-1 lg:ml-0 w-full relative">
        <div className="w-full max-w-[1600px] mx-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default App;