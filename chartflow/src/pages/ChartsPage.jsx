import { useState, useCallback, useEffect } from 'react';
import supabase from '../lib/supabase';
import Odontogram from 'react-odontogram';
import FileUpload from '../components/file_upload/FileUpload';

const formatPrettyDate = (dateString) => {
    if (!dateString) return '';
    if (dateString.includes('/')) return dateString;
    const date = new Date(dateString.includes('T') ? dateString : `${dateString}T00:00:00`);
    return date.toLocaleDateString('en-US'); 
};

export const universalToFdi = {
    1: 18, 2: 17, 3: 16, 4: 15, 5: 14, 6: 13, 7: 12, 8: 11,
    9: 21, 10: 22, 11: 23, 12: 24, 13: 25, 14: 26, 15: 27, 16: 28,
    17: 38, 18: 37, 19: 36, 20: 35, 21: 34, 22: 33, 23: 32, 24: 31,
    25: 41, 26: 42, 27: 43, 28: 44, 29: 45, 30: 46, 31: 47, 32: 48
};

export const fdiToUniversal = Object.fromEntries(
    Object.entries(universalToFdi).map(([universal, fdi]) => [fdi, universal])
);

const DENTAL_COLORS = {
    cavity: { bg: 'bg-red-500', text: 'text-white', border: 'border-red-500', light: 'bg-red-100', lightText: 'text-red-800' },
    filling: { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-500', light: 'bg-blue-100', lightText: 'text-blue-800' },
    crown: { bg: 'bg-yellow-500', text: 'text-gray-900', border: 'border-yellow-500', light: 'bg-yellow-100', lightText: 'text-yellow-800' },
    root_canal: { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-500', light: 'bg-orange-100', lightText: 'text-orange-800' },
    missing: { bg: 'bg-gray-700', text: 'text-white', border: 'border-gray-700', light: 'bg-gray-200', lightText: 'text-gray-800' },
    implant: { bg: 'bg-gray-900', text: 'text-white', border: 'border-gray-900', light: 'bg-gray-300', lightText: 'text-gray-900' },
    bridge: { bg: 'bg-purple-500', text: 'text-white', border: 'border-purple-500', light: 'bg-purple-100', lightText: 'text-purple-800' },
    sealant: { bg: 'bg-purple-300', text: 'text-gray-900', border: 'border-purple-300', light: 'bg-purple-50', lightText: 'text-purple-700' },
    watch: { bg: 'bg-yellow-300', text: 'text-gray-900', border: 'border-yellow-300', light: 'bg-yellow-50', lightText: 'text-yellow-700' },
    fracture: { bg: 'bg-red-700', text: 'text-white', border: 'border-red-700', light: 'bg-red-200', lightText: 'text-red-900' },
    extraction_planned: { bg: 'bg-red-300', text: 'text-red-900', border: 'border-red-300', light: 'bg-red-50', lightText: 'text-red-700' },
};

const getConditionColors = (condition) => {
    return DENTAL_COLORS[condition] || {
        bg: 'bg-slate-500', text: 'text-white', border: 'border-slate-500', light: 'bg-slate-100', lightText: 'text-slate-800'
    };
};

function DentalChart({ chartId, onChartSaved, refreshTrigger }) {
    const [chartData, setChartData] = useState({});
    const [selectedTeeth, setSelectedTeeth] = useState([]);
    const [activeCondition, setActiveCondition] = useState('cavity');
    const [odontoKey, setOdontoKey] = useState(0);
    const [saveStatus, setSaveStatus] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const getToothColor = (toothId) => {
        const data = chartData[toothId];
        if (!data) return '#ffffff';

        const priority = ['missing', 'fracture', 'cavity', 'root_canal', 'crown', 'filling', 'bridge', 'implant', 'sealant', 'watch', 'extraction_planned'];

        for (const condition of priority) {
            if (data.conditions?.includes(condition)) {
                return getConditionHexColor(condition);
            }
        }

        if (data.surfaces) {
            for (const surface of Object.values(data.surfaces)) {
                if (surface?.condition) {
                    return getConditionHexColor(surface.condition);
                }
            }
        }

        return '#ffffff';
    };

    const getConditionHexColor = (condition) => {
        const colorMap = {
            cavity: '#fecaca', filling: '#bfdbfe', crown: '#fef08a', root_canal: '#fed7aa',
            missing: '#d1d5db', implant: '#9ca3af', bridge: '#e9d5ff', sealant: '#f3e8ff',
            watch: '#fef9c3', fracture: '#fca5a5', extraction_planned: '#fee2e2',
        };
        return colorMap[condition] || '#ffffff';
    };

    useEffect(() => {
        const styleId = 'dynamic-tooth-colors';
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) existingStyle.remove();

        const styles = Object.keys(chartData)
            .map(toothId => {
                const color = getToothColor(toothId);
                return `.Odontogram .${toothId} path[fill="currentColor"] { fill: ${color}; }`;
            })
            .join('\n');

        if (styles) {
            const styleTag = document.createElement('style');
            styleTag.id = styleId;
            styleTag.textContent = styles;
            document.head.appendChild(styleTag);
        }

        return () => {
            const styleToRemove = document.getElementById(styleId);
            if (styleToRemove) styleToRemove.remove();
        };
    }, [chartData]);

    useEffect(() => {
        if (chartId) loadChartData(chartId);
    }, [chartId, refreshTrigger]);

    useEffect(() => {
        if (!chartId) return;
        const timeoutId = setTimeout(() => saveChartData(), 1000);
        return () => clearTimeout(timeoutId);
    }, [chartData]);

    const loadChartData = async (id) => {
        try {
            const { data, error } = await supabase
                .from('chart_teeth')
                .select('*')
                .eq('chart_id', id);

            if (error) throw error;

            const loadedData = {};
            data.forEach(tooth => {
                const universalNum = parseInt(tooth.tooth_id.replace('teeth-', ''));
                const fdiNum = universalToFdi[universalNum];
                const uiKey = `teeth-${fdiNum}`;
                loadedData[uiKey] = {
                    surfaces: tooth.surfaces || {},
                    conditions: tooth.conditions || [],
                    notes: tooth.notes || ''
                };
            });

            setChartData(loadedData);
            setSaveStatus('Loaded');
        } catch (error) {
            console.error('Error loading chart:', error);
            setSaveStatus('Error loading');
        }
    };

    const saveChartData = async () => {
        if (!chartId || isSaving) return;

        try {
            setIsSaving(true);
            setSaveStatus('Saving...');

            const teethToSave = Object.entries(chartData).map(([fdiKey, data]) => {
                const fdiNum = parseInt(fdiKey.replace('teeth-', ''));
                const universalNum = fdiToUniversal[fdiNum];
                return {
                    chart_id: chartId,
                    tooth_id: `teeth-${universalNum}`,
                    surfaces: data.surfaces || {},
                    conditions: data.conditions || [],
                    notes: data.notes || ''
                };
            });

            const universalKeysToKeep = Object.keys(chartData).map(fdiKey => {
                const fdiNum = parseInt(fdiKey.replace('teeth-', ''));
                const universalNum = fdiToUniversal[fdiNum];
                return `teeth-${universalNum}`;
            });

            let deleteQuery = supabase.from('chart_teeth').delete().eq('chart_id', chartId);
            if (universalKeysToKeep.length > 0) {
                deleteQuery = deleteQuery.not('tooth_id', 'in', `(${universalKeysToKeep.join(',')})`);
            }
            
            const { error: deleteError } = await deleteQuery;
            if (deleteError) throw deleteError;

            if (teethToSave.length > 0) {
                const { error: upsertError } = await supabase.from('chart_teeth').upsert(teethToSave, {
                    onConflict: 'chart_id,tooth_id',
                    ignoreDuplicates: false
                });
                if (upsertError) throw upsertError;
            }

            const { error: updateError } = await supabase
                .from('charts')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', chartId);

            if (updateError) throw updateError;

            setSaveStatus('Saved');
            if (onChartSaved) onChartSaved();
            setTimeout(() => setSaveStatus(''), 2000);
        } catch (error) {
            console.error('Error saving chart:', error);
            setSaveStatus('Error saving');
        } finally {
            setIsSaving(false);
        }
    };

    const toothSelection = selectedTeeth.reduce((acc, toothId) => {
        acc[toothId] = true;
        return acc;
    }, {});

    const handleToothClick = (selectedTeethObj) => setSelectedTeeth(selectedTeethObj);

    const handleClearSelection = () => {
        setSelectedTeeth([]);
        setOdontoKey(prev => prev + 1);
    };

    const handleSurfaceClick = (surface) => {
        if (selectedTeeth.length === 0) return;
        setChartData(prev => {
            const updated = { ...prev };
            selectedTeeth.forEach(tooth => {
                const currentSurface = updated[tooth.id]?.surfaces?.[surface];
                if (currentSurface?.condition === activeCondition) {
                    const { [surface]: removed, ...remainingSurfaces } = updated[tooth.id]?.surfaces || {};
                    updated[tooth.id] = { ...updated[tooth.id], surfaces: remainingSurfaces };
                } else {
                    updated[tooth.id] = {
                        ...updated[tooth.id],
                        surfaces: {
                            ...updated[tooth.id]?.surfaces,
                            [surface]: { condition: activeCondition, date: new Date().toISOString() }
                        }
                    };
                }
            });
            return updated;
        });
    };

    const handleAddCondition = (condition) => {
        if (selectedTeeth.length === 0) return;
        setChartData(prev => {
            const updated = { ...prev };
            selectedTeeth.forEach((tooth) => {
                const existingConditions = updated[tooth.id]?.conditions || [];
                if (!existingConditions.includes(condition)) {
                    updated[tooth.id] = { ...updated[tooth.id], conditions: [...existingConditions, condition] };
                }
            });
            return updated;
        });
    };

    const handleRemoveCondition = (toothId, condition) => {
        setChartData(prev => ({
            ...prev,
            [toothId]: {
                ...prev[toothId],
                conditions: prev[toothId]?.conditions?.filter(c => c !== condition) || []
            }
        }));
    };

    const handleNotesChange = (toothId, notes) => {
        setChartData(prev => ({
            ...prev,
            [toothId]: { ...prev[toothId], notes }
        }));
    };

    const conditionOptions = [
        { value: 'cavity', label: 'Cavity'}, { value: 'filling', label: 'Filling'},
        { value: 'crown', label: 'Crown'}, { value: 'root_canal', label: 'Root Canal'},
        { value: 'missing', label: 'Missing'}, { value: 'implant', label: 'Implant'},
        { value: 'bridge', label: 'Bridge'}, { value: 'sealant', label: 'Sealant'},
        { value: 'watch', label: 'Watch'}, { value: 'fracture', label: 'Fracture'},
        { value: 'extraction_planned', label: 'Extract Plan'},
    ];

    return (
        <div className="space-y-6">
            <article className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-primary dark:text-blue-400">
                            <span className="material-symbols-outlined">build</span>
                        </div>
                        <h2 className="text-lg font-bold font-headline text-slate-900 dark:text-white">Charting Tools</h2>
                    </div>
                    {saveStatus && (
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${saveStatus === 'Saved' ? 'bg-green-500' : saveStatus.includes('Error') ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{saveStatus}</span>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 flex-wrap justify-center mb-6">
                    {conditionOptions.map(option => {
                        const colors = getConditionColors(option.value);
                        return (
                            <button
                                key={option.value}
                                onClick={() => setActiveCondition(option.value)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeCondition === option.value
                                    ? `${colors.bg} ${colors.text} shadow-md`
                                    : `${colors.light} ${colors.lightText} dark:bg-slate-700 dark:text-slate-300 hover:opacity-80`
                                }`}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>

                {selectedTeeth.length > 0 && (
                    <div className="flex items-center justify-center gap-4 py-3 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/10 dark:border-primary/20">
                        <span className="text-sm font-bold text-primary dark:text-blue-400">
                            {selectedTeeth.length} {selectedTeeth.length === 1 ? 'tooth' : 'teeth'} selected
                        </span>
                        <button onClick={handleClearSelection} className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 transition-colors underline underline-offset-2">
                            Clear selection
                        </button>
                    </div>
                )}
            </article>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <article className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center overflow-x-auto">
                    <div className="bg-white p-4 rounded-xl shadow-inner">
                        <Odontogram
                            key={odontoKey}
                            status={toothSelection}
                            notation="Universal"
                            onChange={handleToothClick}
                        />
                    </div>
                </article>

                <aside className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 max-h-[600px] overflow-y-auto">
                    {selectedTeeth.length > 0 ? (
                        selectedTeeth.length === 1 ? (
                            <ToothDetailPanel
                                toothId={selectedTeeth[0].id}
                                data={chartData[selectedTeeth[0].id]}
                                onSurfaceClick={handleSurfaceClick}
                                onAddCondition={handleAddCondition}
                                onRemoveCondition={handleRemoveCondition}
                                onNotesChange={handleNotesChange}
                                activeCondition={activeCondition}
                            />
                        ) : (
                            <MultipleTeethPanel
                                selectedTeeth={selectedTeeth}
                                chartData={chartData}
                                onSurfaceClick={handleSurfaceClick}
                                onAddCondition={handleAddCondition}
                                activeCondition={activeCondition}
                            />
                        )
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 py-12 text-center">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">touch_app</span>
                            <p className="text-sm font-medium">Select teeth on the chart to add findings</p>
                        </div>
                    )}
                </aside>
            </div>

            <article className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                <h3 className="text-xs font-bold font-headline text-slate-400 uppercase tracking-widest mb-4">Color Legend</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {conditionOptions.map(option => {
                        const colors = getConditionColors(option.value);
                        return (
                            <div key={option.value} className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${colors.bg}`}></div>
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{option.label}</span>
                            </div>
                        );
                    })}
                </div>
            </article>
        </div>
    );
}

function MultipleTeethPanel({ selectedTeeth, chartData, onSurfaceClick, onAddCondition, activeCondition }) {
    const surfaces = ['mesial', 'distal', 'occlusal', 'buccal', 'lingual'];
    const colors = getConditionColors(activeCondition);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
                <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-700 dark:text-teal-400">
                    <span className="material-symbols-outlined">layers</span>
                </div>
                <h3 className="text-lg font-bold font-headline text-slate-900 dark:text-white">{selectedTeeth.length} Teeth Selected</h3>
            </div>

            <div className="flex flex-wrap gap-2">
                {selectedTeeth.map((tooth) => (
                    <span key={tooth.id} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs">
                        {tooth.id.replace('teeth-', '')}
                    </span>
                ))}
            </div>

            <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Apply to Surface</h4>
                <div className="grid grid-cols-2 gap-2">
                    {surfaces.map(surface => (
                        <button
                            key={surface}
                            onClick={() => onSurfaceClick(surface)}
                            className={`p-3 rounded-xl border-2 text-left hover:ring-2 transition-all dark:border-slate-700 ${colors.border} hover:${colors.light} dark:hover:bg-slate-700`}
                        >
                            <div className="font-bold text-sm capitalize text-slate-800 dark:text-white">{surface}</div>
                            <div className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${colors.lightText} dark:text-slate-400`}>Apply {activeCondition}</div>
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Whole Tooth</h4>
                <button
                    onClick={() => onAddCondition(activeCondition)}
                    className={`w-full px-4 py-3 rounded-xl font-bold transition-transform active:scale-95 ${colors.bg} ${colors.text}`}
                >
                    Add {activeCondition} to all
                </button>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Individual Data</h4>
                <div className="space-y-2">
                    {selectedTeeth.map((tooth) => {
                        const data = chartData[tooth.id];
                        return (
                            <div key={tooth.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                                <div className="font-bold text-sm text-slate-800 dark:text-white mb-1">Tooth {tooth.id.replace('teeth-', '')}</div>
                                {data?.conditions && data.conditions.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {data.conditions.map((condition, idx) => {
                                            const condColors = getConditionColors(condition);
                                            return (
                                                <span key={idx} className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${condColors.light} ${condColors.lightText} dark:bg-slate-800 dark:text-slate-300`}>
                                                    {condition}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function ToothDetailPanel({ toothId, data, onSurfaceClick, onAddCondition, onRemoveCondition, onNotesChange, activeCondition }) {
    const surfaces = ['mesial', 'distal', 'occlusal', 'buccal', 'lingual'];
    const colors = getConditionColors(activeCondition);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
                <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-700 dark:text-teal-400">
                    <span className="material-symbols-outlined">dentistry</span>
                </div>
                <div>
                    <h3 className="text-lg font-bold font-headline leading-tight text-slate-900 dark:text-white">Tooth {toothId.replace('teeth-', '')}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-label">Detailed charting</p>
                </div>
            </div>

            <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Surfaces</h4>
                <div className="grid grid-cols-2 gap-2">
                    {surfaces.map(surface => {
                        const surfaceData = data?.surfaces?.[surface];
                        const surfaceColors = surfaceData?.condition
                            ? getConditionColors(surfaceData.condition)
                            : { border: 'border-slate-200 dark:border-slate-700', light: 'bg-slate-50 dark:bg-slate-900', lightText: 'text-slate-400 dark:text-slate-500' };

                        return (
                            <button
                                key={surface}
                                onClick={() => onSurfaceClick(surface)}
                                className={`p-3 rounded-xl border-2 text-left transition-all ${surfaceData?.condition
                                    ? `${surfaceColors.light} ${surfaceColors.border} ring-1 ring-offset-1 ring-${surfaceColors.border} dark:bg-slate-800`
                                    : `border-slate-200 dark:border-slate-700 hover:${colors.light} hover:${colors.border} dark:hover:bg-slate-800`
                                    }`}
                            >
                                <div className="font-bold text-sm capitalize text-slate-800 dark:text-white">{surface}</div>
                                <div className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${surfaceColors.lightText}`}>
                                    {surfaceData?.condition || 'Clear'}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Conditions</h4>
                <button
                    onClick={() => onAddCondition(activeCondition)}
                    className={`w-full mb-3 px-4 py-3 rounded-xl font-bold transition-transform active:scale-95 ${colors.bg} ${colors.text}`}
                >
                    Add {activeCondition}
                </button>

                {data?.conditions && data.conditions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {data.conditions.map((condition, idx) => {
                            const condColors = getConditionColors(condition);
                            return (
                                <span key={idx} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 ${condColors.light} ${condColors.lightText} dark:bg-slate-800 dark:text-slate-300`}>
                                    {condition}
                                    <button onClick={() => onRemoveCondition(toothId, condition)} className="hover:opacity-70 flex items-center">
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>

            <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Clinical Notes</h4>
                <textarea
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-1 focus:ring-primary/40 transition-all text-sm py-3 px-4 resize-none placeholder-slate-400 dark:placeholder-slate-500"
                    rows="3"
                    placeholder="Specific remarks for this tooth..."
                    value={data?.notes || ''}
                    onChange={(e) => onNotesChange(toothId, e.target.value)}
                />
            </div>
        </div>
    );
}

// Added isActive prop
export default function ChartsPage({ isActive }) {
    const [currentChart, setCurrentChart] = useState(null);
    const [charts, setCharts] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState(''); 
    const [isSaving, setIsSaving] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [availableNotes, setAvailableNotes] = useState([]);
    const [noteSearchTerm, setNoteSearchTerm] = useState('');

    // Fetch when active
    useEffect(() => { 
        if (isActive) {
            loadCharts(); 
        }
    }, [isActive]);

    const saveStatus = async (chartId, status) => {
        if (isSaving) return;
        try {
            setIsSaving(true);
            const { error } = await supabase.from('charts').update({ status: status }).eq('id', chartId).select();
            if (error) throw error;
            setCharts(prevCharts => prevCharts.map(chart => chart.id === chartId ? { ...chart, status: status } : chart));
            setCurrentChart(prevChart => ({ ...prevChart, status: status }));
        } catch (error) {
            console.error('Error saving chart:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleStatusChange = async (chartId, status) => {
        if (isSaving) return;
        if (status === 'In Progress') { saveStatus(chartId, 'Completed'); } 
        else { saveStatus(chartId, 'In Progress'); }
    }

    const loadCharts = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data, error } = await supabase.from('charts').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
            if (error) throw error;
            setCharts(data || []);
        } catch (error) {
            console.error('Error loading charts:', error);
        }
    };

    const createNewChart = async () => {
        try {
            setIsCreating(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const today = new Date();
            const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

            const { data, error } = await supabase
                .from('charts')
                .insert([{
                    user_id: user.id,
                    date: dateString,
                    patient_name: '', 
                    status: 'In Progress'
                }])
                .select()
                .single();

            if (error) throw error;

            setCharts(prev => [data, ...prev]);
            setCurrentChart(data); 
        } catch (error) {
            console.error('Error creating chart:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const deleteChart = async (chartId) => {
        if (!confirm('Are you sure you want to delete this chart?')) return;
        try {
            const { error } = await supabase.from('charts').delete().eq('id', chartId);
            if (error) throw error;
            setCharts(charts.filter(c => c.id !== chartId));
            if (currentChart?.id === chartId) setCurrentChart(null);
        } catch (error) {
            console.error('Error deleting chart:', error);
        }
    };

    useEffect(() => {
        if (!currentChart) return;
        const debounceTimer = setTimeout(async () => {
            try {
                await supabase.from('charts')
                    .update({ patient_name: currentChart.patient_name || '' })
                    .eq('id', currentChart.id);
                
                setCharts(prevCharts => prevCharts.map(c => 
                    c.id === currentChart.id ? { ...c, patient_name: currentChart.patient_name } : c
                ));
            } catch (err) {
                console.error("Error auto-saving name", err);
            }
        }, 1000);
        return () => clearTimeout(debounceTimer);
    }, [currentChart?.patient_name]);


    const createChartFromNote = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data, error } = await supabase.from('notes').select('*').eq('user_id', user.id).eq('status', 'finalized').order('created_at', { ascending: false });
            if (error) throw error;
            setAvailableNotes(data || []);
            setIsNoteModalOpen(true);
        } catch (error) {
            console.error('Error fetching notes:', error);
            alert('Could not load notes.');
        }
    };

    const handleSelectNoteForChart = async (note) => {
        try {
            setIsCreating(true);
            const { data: existingChart, error: checkError } = await supabase.from('charts').select('id').eq('note_id', note.id).single();
            if (existingChart) {
                alert("A chart has already been generated for this note!");
                setIsCreating(false);
                return;
            }
            if (checkError && checkError.code !== 'PGRST116') throw checkError;

            const combinedNoteText = `
            Medical History: ${note.patient_history || 'None'}
            Chief Complaint: ${note.chief_complaint || 'None'}
            Subjective: ${note.subjective?.text || 'None'}
            Objective: ${note.objective?.text || 'None'}
            Assessment: ${note.assessment?.text || 'None'}
            Plan: ${note.plan?.text || 'None'}
            Additional Notes: ${note.additional_notes || 'None'}
        `;

            const { data: { user } } = await supabase.auth.getUser();
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('http://localhost:8000/api/chart-from-note', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    user_id: user.id,
                    patient_name: note.patient_name,
                    date: note.date,
                    note_text: combinedNoteText,
                    note_id: note.id
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || 'Failed to generate chart');

            alert('Chart successfully generated!');
            setIsNoteModalOpen(false);
            loadCharts();

        } catch (error) {
            console.error("Chart generation error:", error);
            alert("Error generating chart: " + error.message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleUploadComplete = async (uploadRecord) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('http://localhost:8000/api/process-chart', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ chart_id: uploadRecord.chart_id, file_path: uploadRecord.file_path })
            });
            if (!response.ok) throw new Error('Agent failed to process the chart');
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error("Processing error:", error);
            alert("There was an error parsing the chart with the AI agent.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-body relative transition-colors duration-200">
            
            <header className="sticky top-0 z-40 flex justify-between items-center px-8 py-4 w-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800">
                <div className="flex items-center gap-6">
                    <h2 className="text-lg font-bold tracking-tight text-primary dark:text-blue-400 font-headline">Clinical Charts</h2>
                    {currentChart?.patient_name && (
                        <>
                            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">person</span>
                                Context: <span className="text-slate-800 dark:text-white font-semibold">{currentChart.patient_name}</span>
                            </div>
                        </>
                    )}
                </div>
            </header>

            <div className="p-8 max-w-7xl mx-auto">
                {!currentChart ? (
                    <div className="grid grid-cols-12 gap-6">
                        <section className="col-span-12 bg-white dark:bg-slate-800 rounded-xl p-1 shadow-sm border border-slate-100 dark:border-slate-700">
                            <div className="px-6 py-5 flex justify-between items-center border-b border-slate-100 dark:border-slate-700">
                                <h3 className="text-base font-bold font-headline text-slate-900 dark:text-white tracking-tight">Active Dental Charts</h3>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        placeholder="Search patients..."
                                        className="text-sm px-3 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border-none rounded-lg focus:ring-1 focus:ring-primary w-64 placeholder-slate-400 dark:placeholder-slate-500"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    <button
                                        onClick={createChartFromNote}
                                        disabled={isCreating}
                                        className="px-4 py-2 text-xs font-bold text-primary dark:text-blue-400 bg-primary/10 dark:bg-primary/20 rounded-lg hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                                        AI Generate
                                    </button>
                                    <button
                                        onClick={createNewChart}
                                        disabled={isCreating}
                                        className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors shadow-md shadow-primary/20 flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-sm">add</span>
                                        New Chart
                                    </button>
                                </div>
                            </div>

                            <div className="w-full overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Date</th>
                                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Patient</th>
                                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {charts.filter(chart => {
                                            const term = searchQuery.trim().toLowerCase();
                                            if (!term) return true;
                                            return (chart.patient_name || '').toLowerCase().includes(term);
                                        }).map(chart => (
                                            <tr key={chart.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer" onClick={() => setCurrentChart(chart)}>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{formatPrettyDate(chart.date)}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{chart.patient_name || 'Unnamed Chart'}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${chart.status === 'In Progress' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'}`}>
                                                        {chart.status || 'Draft'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={(e) => { e.stopPropagation(); deleteChart(chart.id); }} className="text-slate-400 dark:text-slate-500 hover:text-error dark:hover:text-red-400 transition-colors p-2">
                                                        <span className="material-symbols-outlined text-lg">delete</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                ) : (
                    <div className="space-y-6 pb-24">
                        <section className="flex justify-between items-center mb-8">
                            <div>
                                <button onClick={() => setCurrentChart(null)} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 text-sm font-bold mb-4 transition-colors">
                                    <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Charts
                                </button>
                                <input
                                    type="text"
                                    className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white bg-transparent border-none p-0 focus:ring-0 placeholder-slate-300 dark:placeholder-slate-600 w-full"
                                    placeholder="Patient Name"
                                    value={currentChart.patient_name || ''}
                                    onChange={(e) => setCurrentChart({...currentChart, patient_name: e.target.value})}
                                />
                                <div className="mt-2 text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">calendar_today</span>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatPrettyDate(currentChart.date)}</span>
                                </div>
                            </div>
                            <div>
                                <button
                                    onClick={() => handleStatusChange(currentChart.id, currentChart.status)}
                                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${currentChart.status === 'In Progress' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60' : 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60'}`}
                                >
                                    Mark as {currentChart.status === 'In Progress' ? 'Completed' : 'In Progress'}
                                </button>
                            </div>
                        </section>

                        <article className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold font-headline flex items-center gap-2 text-slate-900 dark:text-white">
                                    <span className="material-symbols-outlined text-primary dark:text-blue-400">document_scanner</span>
                                    AI Legacy Chart Import
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Upload a PDF or image of an old chart to automatically map findings.</p>
                            </div>
                            <div className="w-96">
                                <FileUpload elementId={currentChart.id} onUploadComplete={handleUploadComplete} />
                            </div>
                        </article>

                        <DentalChart
                            key={currentChart.id}
                            chartId={currentChart.id}
                            onChartSaved={loadCharts}
                            refreshTrigger={refreshTrigger}
                        />
                    </div>
                )}
            </div>

            {isNoteModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden border border-slate-200/50 dark:border-slate-700">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold font-headline text-slate-900 dark:text-white">Generate Chart from Note</h2>
                                <button onClick={() => { setIsNoteModalOpen(false); setNoteSearchTerm(''); }} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 dark:text-slate-500">
                                    <span className="material-symbols-outlined text-lg">search</span>
                                </span>
                                <input
                                    type="text"
                                    placeholder="Search finalized notes..."
                                    value={noteSearchTerm}
                                    onChange={(e) => setNoteSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-xl shadow-sm focus:ring-2 focus:ring-primary text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                                />
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-slate-800">
                            {availableNotes.length === 0 ? (
                                <div className="text-center py-12">
                                    <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-3">edit_document</span>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No finalized notes available.</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500">Finalize a SOAP note first to generate a chart from it.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {availableNotes
                                        .filter(note => (note.patient_name || '').toLowerCase().includes(noteSearchTerm.toLowerCase()))
                                        .map(note => (
                                            <div key={note.id} className="border border-slate-100 dark:border-slate-700 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:border-primary/30 dark:hover:border-blue-500/50 hover:bg-primary/5 dark:hover:bg-blue-500/10 transition-all group">
                                                <div className="mb-4 sm:mb-0">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className="font-bold text-lg text-slate-900 dark:text-white font-headline">{note.patient_name || 'Unknown Patient'}</span>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                                                            {formatPrettyDate(note.date)}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1 max-w-xl">
                                                        <span className="font-bold text-slate-800 dark:text-slate-200">CC:</span> {note.chief_complaint || 'No chief complaint recorded'}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleSelectNoteForChart(note)}
                                                    disabled={isCreating}
                                                    className="px-6 py-2.5 bg-primary hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 w-full sm:w-auto shrink-0"
                                                >
                                                    {isCreating ? 'Mapping...' : 'Generate AI Chart'}
                                                </button>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}