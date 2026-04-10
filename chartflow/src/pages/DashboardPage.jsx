// src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react';
import supabase from '../lib/supabase';

function DashboardPage({ onPageChange }) {
    const [userName, setUserName] = useState('Doctor');
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        totalPatients: 0,
        pendingNotes: 0,
        pendingCharts: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            try {
                // 1. Fetch Profile Name
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', user.id)
                    .single();
                
                if (profile?.full_name) {
                    const name = profile.full_name;
                    setUserName(name.charAt(0).toUpperCase() + name.slice(1));
                }

                // 2. Fetch Notes
                const { data: notes, error: notesError } = await supabase
                    .from('notes')
                    .select('id, patient_name, status, updated_at')
                    .eq('user_id', user.id);

                if (notesError) throw notesError;

                // 3. Fetch Charts
                const { data: charts, error: chartsError } = await supabase
                    .from('charts')
                    .select('id, patient_name, status, updated_at')
                    .eq('user_id', user.id);

                if (chartsError) throw chartsError;

                const safeNotes = notes || [];
                const safeCharts = charts || [];

                // 4. Calculate Stats
                const draftNotes = safeNotes.filter(n => n.status === 'draft').length;
                const inProgressCharts = safeCharts.filter(c => c.status === 'In Progress').length;
                
                // Get unique patients by aggregating non-empty names from both tables
                const uniquePatients = new Set([
                    ...safeNotes.map(n => n.patient_name),
                    ...safeCharts.map(c => c.patient_name)
                ].filter(name => name && name.trim() !== ''));

                setStats({
                    totalPatients: uniquePatients.size,
                    pendingNotes: draftNotes,
                    pendingCharts: inProgressCharts
                });

                // 5. Combine & Sort for Recent Activity (Top 5 most recently updated)
                const combinedActivity = [
                    ...safeNotes.map(n => ({ ...n, type: 'Note' })),
                    ...safeCharts.map(c => ({ ...c, type: 'Chart' }))
                ].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
                 .slice(0, 5);

                setRecentActivity(combinedActivity);

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    // Helper formatting functions
    const formatActivityDate = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const getInitials = (name) => {
        if (!name || name.trim() === '') return '??';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Top Header */}
            <header className="flex justify-between items-center mb-2">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 font-headline">Dashboard</h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">Overview and clinical activity</p>
                </div>
            </header>

            {/* Welcome Hero Section */}
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-container p-8 text-white shadow-lg">
                <div className="relative z-10 max-w-2xl">
                    <h2 className="text-3xl font-extrabold font-headline mb-2 tracking-tight">Welcome back, Dr. {userName}.</h2>
                    <p className="text-blue-100 text-lg font-medium opacity-90">
                        {isLoading ? 'Loading your clinical summary...' : `You have ${stats.pendingNotes} pending notes and ${stats.pendingCharts} charts to finalize.`}
                    </p>
                    <div className="mt-6 flex gap-4">
                        <button 
                            onClick={() => onPageChange('notes')}
                            className="bg-surface-container-lowest text-primary px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-50 transition-colors shadow-sm active:scale-95"
                        >
                            <span className="material-symbols-outlined text-[20px]">edit_note</span>
                            Review Notes
                        </button>
                        <button 
                            onClick={() => onPageChange('charts')}
                            className="bg-primary-fixed/20 text-white border border-primary-fixed/30 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary-fixed/30 transition-colors shadow-sm active:scale-95"
                        >
                            <span className="material-symbols-outlined text-[20px]">dentistry</span>
                            Open Charts
                        </button>
                    </div>
                </div>
                {/* Decorative element */}
                <div className="absolute right-0 top-0 h-full w-1/3 opacity-10 flex items-center justify-center pointer-events-none">
                    <span className="material-symbols-outlined text-[12rem]">medical_services</span>
                </div>
            </section>

            {/* Bento Grid: Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Active Patients */}
                <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between hover:border-primary/30 transition-colors">
                    <div>
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Active Patients</p>
                            <span className="material-symbols-outlined text-slate-400 text-sm">group</span>
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 font-headline mt-2">
                            {isLoading ? '-' : stats.totalPatients}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-1">Total recorded patients</p>
                    </div>
                </div>

                {/* Pending Notes */}
                <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-0 border-l-4 border-amber-500 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-[6rem]">description</span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Pending Notes</p>
                        <h3 className="text-3xl font-black text-amber-600 font-headline mt-2">
                            {isLoading ? '-' : stats.pendingNotes}
                        </h3>
                        <p className="text-xs text-amber-700 font-bold mt-1">Drafts to finalize</p>
                    </div>
                </div>

                {/* Pending Charts */}
                <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-0 border-l-4 border-blue-500 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-[6rem]">add_chart</span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Pending Charts</p>
                        <h3 className="text-3xl font-black text-blue-600 font-headline mt-2">
                            {isLoading ? '-' : stats.pendingCharts}
                        </h3>
                        <p className="text-xs text-blue-700 font-bold mt-1">In progress</p>
                    </div>
                </div>

                {/* AI Agent Status */}
                <div className="bg-slate-50 p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-headline font-bold text-primary flex items-center gap-2">
                                <span className="material-symbols-outlined animate-pulse text-[18px]">auto_awesome</span>
                                Agent Status
                            </h4>
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase tracking-wider">Active</span>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-600 font-medium">Model: Flash Image</span>
                                <span className="text-primary font-bold">Ready</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div className="bg-primary h-full w-full"></div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Main Content Split */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* Left side: Recent Activity Table */}
                <div className="xl:col-span-2 bg-surface-container-lowest rounded-xl shadow-sm border border-slate-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-extrabold font-headline text-slate-900">Recent Activity</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-slate-400 text-[11px] font-bold uppercase tracking-widest border-b border-slate-100">
                                    <th className="pb-3">Patient Name</th>
                                    <th className="pb-3">Type</th>
                                    <th className="pb-3">Last Updated</th>
                                    <th className="pb-3">Status</th>
                                    <th className="pb-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="5" className="py-8 text-center text-slate-400 font-medium text-sm">
                                            Loading recent activity...
                                        </td>
                                    </tr>
                                ) : recentActivity.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="py-8 text-center text-slate-400 font-medium text-sm">
                                            No recent activity found.
                                        </td>
                                    </tr>
                                ) : (
                                    recentActivity.map((item) => (
                                        <tr key={`${item.type}-${item.id}`} className="group hover:bg-slate-50 transition-colors">
                                            <td className="py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${item.type === 'Note' ? 'bg-amber-50 text-amber-600' : 'bg-teal-50 text-teal-600'}`}>
                                                        {getInitials(item.patient_name)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-900">{item.patient_name || 'Unnamed Patient'}</p>
                                                        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">ID: #{item.id.slice(0, 5)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-600">
                                                    <span className="material-symbols-outlined text-[16px]">
                                                        {item.type === 'Note' ? 'description' : 'dentistry'}
                                                    </span>
                                                    {item.type}
                                                </div>
                                            </td>
                                            <td className="py-4 text-sm font-medium text-slate-600">
                                                {formatActivityDate(item.updated_at)}
                                            </td>
                                            <td className="py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                                    (item.status === 'draft' || item.status === 'In Progress') 
                                                        ? 'bg-amber-100 text-amber-800' 
                                                        : 'bg-green-100 text-green-700'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="py-4 text-right">
                                                <button 
                                                    onClick={() => onPageChange(item.type === 'Note' ? 'notes' : 'charts')}
                                                    className="text-slate-400 hover:text-primary p-2 rounded-lg transition-colors"
                                                    title={`Go to ${item.type}s`}
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right side: Quick Links */}
                <div className="space-y-6">
                    <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-slate-100 p-6">
                        <h3 className="text-lg font-extrabold font-headline mb-4 text-slate-900">Common Actions</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <button 
                                onClick={() => onPageChange('notes')}
                                className="w-full flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl group hover:border-primary/40 hover:bg-primary/5 transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                                        <span className="material-symbols-outlined text-[20px]">mic</span>
                                    </div>
                                    <span className="font-bold text-sm text-slate-700 group-hover:text-primary">New Transcription</span>
                                </div>
                                <span className="material-symbols-outlined text-slate-400 group-hover:text-primary">chevron_right</span>
                            </button>
                            
                            <button 
                                onClick={() => onPageChange('charts')}
                                className="w-full flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl group hover:border-teal-500/40 hover:bg-teal-50 transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
                                        <span className="material-symbols-outlined text-[20px]">add_chart</span>
                                    </div>
                                    <span className="font-bold text-sm text-slate-700 group-hover:text-teal-700">Update Charting</span>
                                </div>
                                <span className="material-symbols-outlined text-slate-400 group-hover:text-teal-600">chevron_right</span>
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default DashboardPage;