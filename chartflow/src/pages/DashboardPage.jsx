import { useState, useEffect } from 'react';
import supabase from '../lib/supabase';

function DashboardPage({ onPageChange }) {
    const [userName, setUserName] = useState('Doctor');
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ totalPatients: 0, pendingNotes: 0, pendingCharts: 0 });
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
                
                const uniquePatients = new Set([
                    ...safeNotes.map(n => n.patient_name),
                    ...safeCharts.map(c => c.patient_name)
                ].filter(name => name && name.trim() !== ''));

                setStats({
                    totalPatients: uniquePatients.size,
                    pendingNotes: draftNotes,
                    pendingCharts: inProgressCharts
                });

                // 5. Combine & Sort for Recent Activity
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

    const formatActivityDate = (timestamp) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const getInitials = (name) => {
        if (!name || name.trim() === '') return '??';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    return (
        <div className="p-8 space-y-8 pb-12 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors duration-200">
            <header className="flex justify-between items-center mb-2">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-headline">Dashboard</h2>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Overview and clinical activity</p>
                </div>
            </header>

            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 dark:from-slate-800 dark:to-slate-900 p-8 text-white shadow-lg border dark:border-slate-700 border-transparent">
                <div className="relative z-10 max-w-2xl">
                    <h2 className="text-3xl font-extrabold font-headline mb-2 tracking-tight">Welcome back, Dr. {userName}.</h2>
                    <p className="text-blue-100 dark:text-slate-300 text-lg font-medium opacity-90">
                        {isLoading ? 'Loading your clinical summary...' : `You have ${stats.pendingNotes} pending notes and ${stats.pendingCharts} charts to finalize.`}
                    </p>
                    <div className="mt-6 flex gap-4">
                        <button onClick={() => onPageChange('notes')} className="bg-white dark:bg-slate-700 text-blue-700 dark:text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors shadow-sm active:scale-95">
                            <span className="material-symbols-outlined text-[20px]">edit_note</span> Review Notes
                        </button>
                        <button onClick={() => onPageChange('charts')} className="bg-blue-900/20 dark:bg-slate-800/50 text-white border border-white/30 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-900/40 dark:hover:bg-slate-800 transition-colors shadow-sm active:scale-95">
                            <span className="material-symbols-outlined text-[20px]">dentistry</span> Open Charts
                        </button>
                    </div>
                </div>
                <div className="absolute right-0 top-0 h-full w-1/3 opacity-10 flex items-center justify-center pointer-events-none">
                    <span className="material-symbols-outlined text-[12rem]">medical_services</span>
                </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between hover:border-primary/30 dark:hover:border-blue-400/50 transition-colors">
                    <div>
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Active Patients</p>
                            <span className="material-symbols-outlined text-slate-400">group</span>
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white font-headline mt-2">{isLoading ? '-' : stats.totalPatients}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Total recorded patients</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border-0 border-l-4 border-amber-500 dark:border-amber-600 flex flex-col justify-between relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Pending Notes</p>
                        <h3 className="text-3xl font-black text-amber-600 dark:text-amber-500 font-headline mt-2">{isLoading ? '-' : stats.pendingNotes}</h3>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border-0 border-l-4 border-blue-500 dark:border-blue-600 flex flex-col justify-between relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Pending Charts</p>
                        <h3 className="text-3xl font-black text-blue-600 dark:text-blue-400 font-headline mt-2">{isLoading ? '-' : stats.pendingCharts}</h3>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-headline font-bold text-primary dark:text-blue-400 flex items-center gap-2">
                                <span className="material-symbols-outlined animate-pulse text-[18px]">auto_awesome</span> Agent Status
                            </h4>
                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded uppercase tracking-wider">Active</span>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-600 dark:text-slate-400 font-medium">Model: Flash Image</span>
                                <span className="text-primary dark:text-blue-400 font-bold">Ready</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className="bg-primary dark:bg-blue-500 h-full w-full"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                    <h3 className="text-xl font-extrabold font-headline text-slate-900 dark:text-white mb-6">Recent Activity</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-slate-400 dark:text-slate-500 text-[11px] font-bold uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                                    <th className="pb-3">Patient Name</th>
                                    <th className="pb-3">Type</th>
                                    <th className="pb-3">Last Updated</th>
                                    <th className="pb-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {recentActivity.map((item) => (
                                    <tr key={`${item.type}-${item.id}`} className="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${item.type === 'Note' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'}`}>
                                                    {getInitials(item.patient_name)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-slate-900 dark:text-white">{item.patient_name || 'Unnamed'}</p>
                                                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">ID: #{item.id.slice(0, 5)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-600 dark:text-slate-300">
                                                <span className="material-symbols-outlined text-[16px]">{item.type === 'Note' ? 'description' : 'dentistry'}</span> {item.type}
                                            </div>
                                        </td>
                                        <td className="py-4 text-sm font-medium text-slate-600 dark:text-slate-400">{formatActivityDate(item.updated_at)}</td>
                                        <td className="py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${(item.status === 'draft' || item.status === 'In Progress') ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>{item.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                        <h3 className="text-lg font-extrabold font-headline mb-4 text-slate-900 dark:text-white">Common Actions</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <button onClick={() => onPageChange('notes')} className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 rounded-xl group hover:border-primary/40 dark:hover:border-blue-500 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                                        <span className="material-symbols-outlined text-[20px]">mic</span>
                                    </div>
                                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200 group-hover:text-primary dark:group-hover:text-blue-400">New Transcription</span>
                                </div>
                                <span className="material-symbols-outlined text-slate-400 group-hover:text-primary dark:group-hover:text-blue-400">chevron_right</span>
                            </button>
                            
                            <button onClick={() => onPageChange('charts')} className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 rounded-xl group hover:border-teal-500/40 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
                                        <span className="material-symbols-outlined text-[20px]">add_chart</span>
                                    </div>
                                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200 group-hover:text-teal-600">Update Charting</span>
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