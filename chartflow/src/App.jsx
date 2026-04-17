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
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white transition-colors duration-200">
        <div className="text-center flex flex-col items-center">
          <span className="material-symbols-outlined text-primary dark:text-blue-400 text-5xl animate-spin mb-4">progress_activity</span>
          <p className="text-slate-500 dark:text-slate-400 font-bold tracking-widest uppercase text-sm">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-body transition-colors duration-200">
      <Sidebar 
        activePage={currentPage} 
        onPageChange={setCurrentPage}
        user={user}
        onSignOut={handleSignOut}
      />

      <div className="flex-1 lg:ml-0 w-full relative">
        <div className="w-full max-w-[1600px] mx-auto">
          
          {/* HIDDEN RENDER PATTERN
            All pages are mounted, but only the active one is visible.
            This preserves state (like open editors) and prevents unnecessary refetching.
          */}
          
          <div className={currentPage === 'dashboard' ? 'block' : 'hidden'}>
            <DashboardPage onPageChange={setCurrentPage} isActive={currentPage === 'dashboard'} />
          </div>
          
          <div className={currentPage === 'notes' ? 'block' : 'hidden'}>
            <NotesPage isActive={currentPage === 'notes'} />
          </div>
          
          <div className={currentPage === 'charts' ? 'block' : 'hidden'}>
            <ChartsPage isActive={currentPage === 'charts'} />
          </div>
          
          <div className={currentPage === 'settings' ? 'block' : 'hidden'}>
            <SettingsPage isActive={currentPage === 'settings'} />
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;