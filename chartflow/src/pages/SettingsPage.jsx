import { useState, useEffect } from 'react';
import supabase from '../lib/supabase';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState('');
    
    // Form States
    const [profile, setProfile] = useState({
        fullName: '',
        email: '',
        clinicalTitle: 'DDS',
        licenseNumber: ''
    });

    const [aiConfig, setAiConfig] = useState({
        defaultTemplate: 'SOAP',
        transcriptionLanguage: 'en-US',
        autoGenerateCharts: true,
        aiVerbosity: 'concise'
    });

    // Fetch user data on load
    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setProfile(prev => ({
                    ...prev,
                    email: user.email,
                    fullName: user.user_metadata?.full_name || ''
                }));
            }
        };
        fetchUser();
    }, []);

    const handleSave = async () => {
        setLoading(true);
        setSaveStatus('Saving...');
        
        try {
            // Simulate API delay for saving preferences
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // If saving profile, update Supabase auth metadata
            if (activeTab === 'profile') {
                await supabase.auth.updateUser({
                    data: { full_name: profile.fullName }
                });
            }

            setSaveStatus('Changes saved successfully');
            setTimeout(() => setSaveStatus(''), 3000);
        } catch (error) {
            console.error(error);
            setSaveStatus('Error saving changes');
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'profile', label: 'Clinical Profile', icon: 'person' },
        { id: 'ai', label: 'AI Agent Configuration', icon: 'auto_awesome' },
        { id: 'preferences', label: 'App Preferences', icon: 'tune' },
        { id: 'security', label: 'Security & Auth', icon: 'lock' },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            {/* Top Header */}
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 font-headline">Settings</h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">Manage your account and clinical workflow preferences</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                
                {/* Left Navigation */}
                <aside className="md:col-span-4 lg:col-span-3 space-y-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
                                activeTab === tab.id
                                    ? 'bg-primary/10 text-primary font-bold border-l-4 border-primary shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium border-l-4 border-transparent'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                            <span className="text-sm">{tab.label}</span>
                        </button>
                    ))}
                </aside>

                {/* Right Content Area */}
                <main className="md:col-span-8 lg:col-span-9 space-y-6">
                    
                    {/* PROFILE TAB */}
                    {activeTab === 'profile' && (
                        <div className="animate-fade-in-down space-y-6">
                            <article className="bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-slate-100">
                                <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100">
                                    <div className="relative">
                                        <div className="w-24 h-24 rounded-full bg-blue-50 border-2 border-primary/20 flex items-center justify-center text-primary font-black text-3xl font-headline">
                                            {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : 'DR'}
                                        </div>
                                        <button className="absolute bottom-0 right-0 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-primary hover:border-primary transition-colors shadow-sm">
                                            <span className="material-symbols-outlined text-sm">photo_camera</span>
                                        </button>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold font-headline text-slate-900">Profile Picture</h3>
                                        <p className="text-sm text-slate-500 mt-1">PNG, JPG up to 5MB. This appears on your generated charts.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                                        <input
                                            type="text"
                                            value={profile.fullName}
                                            onChange={(e) => setProfile({...profile, fullName: e.target.value})}
                                            className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/40 focus:bg-white transition-all outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Clinical Title</label>
                                        <select 
                                            value={profile.clinicalTitle}
                                            onChange={(e) => setProfile({...profile, clinicalTitle: e.target.value})}
                                            className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/40 focus:bg-white transition-all outline-none appearance-none"
                                        >
                                            <option value="DDS">DDS (Doctor of Dental Surgery)</option>
                                            <option value="DMD">DMD (Doctor of Medicine in Dentistry)</option>
                                            <option value="RDH">RDH (Registered Dental Hygienist)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                                        <input
                                            type="email"
                                            value={profile.email}
                                            disabled
                                            className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-sm text-slate-400 cursor-not-allowed outline-none"
                                        />
                                        <p className="text-xs text-slate-400 ml-1">Contact support to change your primary account email.</p>
                                    </div>
                                </div>
                            </article>
                        </div>
                    )}

                    {/* AI CONFIGURATION TAB */}
                    {activeTab === 'ai' && (
                        <div className="animate-fade-in-down space-y-6">
                            <article className="bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-slate-100">
                                <h3 className="text-lg font-bold font-headline text-slate-900 mb-1">Transcription Engine</h3>
                                <p className="text-sm text-slate-500 mb-6">Configure how the AI agent processes your audio recordings.</p>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <div>
                                            <p className="font-bold text-sm text-slate-900">Auto-Generate Charts</p>
                                            <p className="text-xs text-slate-500 mt-1">Automatically extract charting data when a SOAP note is finalized.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer mt-1">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer" 
                                                checked={aiConfig.autoGenerateCharts}
                                                onChange={() => setAiConfig({...aiConfig, autoGenerateCharts: !aiConfig.autoGenerateCharts})}
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">AI Output Detail Level</label>
                                        <select 
                                            value={aiConfig.aiVerbosity}
                                            onChange={(e) => setAiConfig({...aiConfig, aiVerbosity: e.target.value})}
                                            className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/40 focus:bg-white transition-all outline-none appearance-none"
                                        >
                                            <option value="concise">Concise (Bullet points, brief summaries)</option>
                                            <option value="standard">Standard (Balanced clinical narrative)</option>
                                            <option value="detailed">Highly Detailed (Captures all patient quotes and minutiae)</option>
                                        </select>
                                    </div>
                                </div>
                            </article>
                        </div>
                    )}

                    {/* PREFERENCES TAB (Placeholder structure) */}
                    {activeTab === 'preferences' && (
                        <div className="animate-fade-in-down space-y-6">
                            <article className="bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center py-16 text-center">
                                <span className="material-symbols-outlined text-4xl text-slate-300 mb-4">palette</span>
                                <h3 className="text-lg font-bold font-headline text-slate-900">Display Preferences</h3>
                                <p className="text-sm text-slate-500 mt-2 max-w-sm">Theme customization and regional settings are currently locked to default clinical standards.</p>
                            </article>
                        </div>
                    )}

                    {/* SECURITY TAB (Placeholder structure) */}
                    {activeTab === 'security' && (
                        <div className="animate-fade-in-down space-y-6">
                            <article className="bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-error/20">
                                <h3 className="text-lg font-bold font-headline text-slate-900 mb-1">Danger Zone</h3>
                                <p className="text-sm text-slate-500 mb-6">Irreversible account actions.</p>
                                
                                <button className="px-6 py-3 bg-error/10 text-error hover:bg-error hover:text-white font-bold text-sm rounded-xl transition-colors">
                                    Request Account Deletion
                                </button>
                            </article>
                        </div>
                    )}

                    {/* Global Action Bar for saving */}
                    <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {saveStatus && (
                                <>
                                    <span className={`material-symbols-outlined text-[18px] ${saveStatus.includes('Error') ? 'text-error' : 'text-green-600'}`}>
                                        {saveStatus.includes('Error') ? 'error' : 'check_circle'}
                                    </span>
                                    <span className={`text-sm font-bold ${saveStatus.includes('Error') ? 'text-error' : 'text-green-600'}`}>
                                        {saveStatus}
                                    </span>
                                </>
                            )}
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-md shadow-primary/20 hover:bg-primary-container active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> : <span className="material-symbols-outlined text-[20px]">save</span>}
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>

                </main>
            </div>
        </div>
    );
}