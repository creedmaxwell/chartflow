import { useState } from 'react';
import supabase from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');

  const handleSignUp = async () => {
    if (!email || !password || !fullName.trim()) {
      setMessage('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim()
          }
        }
      });

      if (error) throw error;

      setMessage('Success! Check your email for confirmation link.');
      setEmail('');
      setPassword('');
      setFullName('');
    } catch (error) {
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      setMessage('Please fill in all fields');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // User will be automatically set in App.jsx via onAuthStateChange
    } catch (error) {
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSignUp) {
      handleSignUp();
    } else {
      handleSignIn();
    }
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Decorative ambient background glows */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="bg-surface-container-lowest p-10 rounded-2xl shadow-2xl shadow-slate-200/50 border border-white w-full max-w-md relative z-10">
        
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-50 text-primary rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
            <span className="material-symbols-outlined text-3xl">dentistry</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 font-headline tracking-tight mb-2">ChartFlow</h1>
          <p className="text-sm font-medium text-slate-500">
            {isSignUp ? 'Create your clinical workspace' : 'Sign in to your account'}
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          
          {/* 3. Conditionally render the Full Name input */}
          {isSignUp && (
            <div className="animate-fade-in-down">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                </span>
                <input
                  type="text"
                  placeholder="Jane Smith"
                  className="w-full bg-surface-container-low border-none rounded-xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/40 focus:bg-white transition-all outline-none"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
                <span className="material-symbols-outlined text-[20px]">mail</span>
              </span>
              <input
                type="email"
                placeholder="doctor@clinic.com"
                className="w-full bg-surface-container-low border-none rounded-xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/40 focus:bg-white transition-all outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
                <span className="material-symbols-outlined text-[20px]">lock</span>
              </span>
              <input
                type="password"
                placeholder={isSignUp ? 'At least 6 characters' : 'Enter your password'}
                className="w-full bg-surface-container-low border-none rounded-xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/40 focus:bg-white transition-all outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-xl text-sm font-medium flex items-start gap-3 ${
              message.includes('Error') || message.includes('fill in')
                ? 'bg-red-50 text-red-800 border border-red-100'
                : 'bg-green-50 text-green-800 border border-green-100'
            }`}>
              <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">
                {message.includes('Error') || message.includes('fill in') ? 'error' : 'check_circle'}
              </span>
              <p>{message}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3.5 px-4 rounded-xl hover:bg-primary-container font-bold text-sm transition-all shadow-lg shadow-primary/25 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-[20px]">
                {isSignUp ? 'person_add' : 'login'}
              </span>
            )}
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="text-center mt-8 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMessage('');
              // Clear fields when toggling modes to prevent confusion
              setFullName('');
              setPassword('');
            }}
            className="text-xs font-bold text-slate-500 hover:text-primary transition-colors"
            disabled={loading}
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>

      </div>
    </div>
  );
}