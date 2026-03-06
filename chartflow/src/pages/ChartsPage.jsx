import { useState, useCallback, useEffect } from 'react';
import supabase from '../lib/supabase';
import Odontogram from 'react-odontogram';
import FileUpload from '../components/file_upload/FileUpload';

// Industry-standard dental color codes
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

// Get color classes for a condition
const getConditionColors = (condition) => {
    return DENTAL_COLORS[condition] || {
        bg: 'bg-gray-500',
        text: 'text-white',
        border: 'border-gray-500',
        light: 'bg-gray-100',
        lightText: 'text-gray-800'
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

        // Check whole-tooth conditions first
        for (const condition of priority) {
            if (data.conditions?.includes(condition)) {
                return getConditionHexColor(condition);
            }
        }

        // Check if any surface has a condition
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
            cavity: '#fecaca',
            filling: '#bfdbfe',
            crown: '#fef08a',
            root_canal: '#fed7aa',
            missing: '#d1d5db',
            implant: '#9ca3af',
            bridge: '#e9d5ff',
            sealant: '#f3e8ff',
            watch: '#fef9c3',
            fracture: '#fca5a5',
            extraction_planned: '#fee2e2',
        };
        return colorMap[condition] || '#ffffff';
    };

    // Inject dynamic styles for tooth colors whenever chartData changes
    useEffect(() => {
        const styleId = 'dynamic-tooth-colors';

        // Remove existing style element if it exists
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
        }

        // Generate CSS for all teeth with conditions
        const styles = Object.keys(chartData)
            .map(toothId => {
                const color = getToothColor(toothId);
                return `.Odontogram .${toothId} path[fill="currentColor"] {
                    fill: ${color};
                }`;
            })
            .join('\n');

        // Create and inject style tag
        if (styles) {
            const styleTag = document.createElement('style');
            styleTag.id = styleId;
            styleTag.textContent = styles;
            document.head.appendChild(styleTag);
        }

        // Cleanup on unmount
        return () => {
            const styleToRemove = document.getElementById(styleId);
            if (styleToRemove) {
                styleToRemove.remove();
            }
        };
    }, [chartData]);

    // Load chart data when chartId changes
    useEffect(() => {
        if (chartId) {
            loadChartData(chartId);
        }
    }, [chartId, refreshTrigger]);

    // Auto-save chart data after 1 second of inactivity
    useEffect(() => {
        if (!chartId) return;

        const timeoutId = setTimeout(() => {
            saveChartData();
        }, 1000);

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
                loadedData[tooth.tooth_id] = {
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

            const teethToSave = Object.entries(chartData).map(([toothId, data]) => ({
                chart_id: chartId,
                tooth_id: toothId,
                surfaces: data.surfaces || {},
                conditions: data.conditions || [],
                notes: data.notes || ''
            }));

            const { error: deleteError } = await supabase
                .from('chart_teeth')
                .delete()
                .eq('chart_id', chartId)
                .not('tooth_id', 'in', `(${Object.keys(chartData).join(',')})`);

            if (deleteError) throw deleteError;

            if (teethToSave.length > 0) {
                const { error: upsertError } = await supabase
                    .from('chart_teeth')
                    .upsert(teethToSave, {
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

    const handleToothClick = (selectedTeethObj) => {
        setSelectedTeeth(selectedTeethObj);
    };

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

                // Toggle: if surface already has the active condition, remove it
                if (currentSurface?.condition === activeCondition) {
                    const { [surface]: removed, ...remainingSurfaces } = updated[tooth.id]?.surfaces || {};
                    updated[tooth.id] = {
                        ...updated[tooth.id],
                        surfaces: remainingSurfaces
                    };
                } else {
                    // Add or update surface with new condition
                    updated[tooth.id] = {
                        ...updated[tooth.id],
                        surfaces: {
                            ...updated[tooth.id]?.surfaces,
                            [surface]: {
                                condition: activeCondition,
                                date: new Date().toISOString()
                            }
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
                    updated[tooth.id] = {
                        ...updated[tooth.id],
                        conditions: [...existingConditions, condition]
                    };
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
            [toothId]: {
                ...prev[toothId],
                notes
            }
        }));
    };

    const conditionOptions = [
        { value: 'cavity', label: 'Cavity'},
        { value: 'filling', label: 'Filling'},
        { value: 'crown', label: 'Crown'},
        { value: 'root_canal', label: 'Root Canal'},
        { value: 'missing', label: 'Missing'},
        { value: 'implant', label: 'Implant'},
        { value: 'bridge', label: 'Bridge'},
        { value: 'sealant', label: 'Sealant'},
        { value: 'watch', label: 'Watch'},
        { value: 'fracture', label: 'Fracture'},
        { value: 'extraction_planned', label: 'Extract Plan'},
    ];

    return (
        <div>
            {/* Toolbar */}
            <div className="bg-white rounded-lg shadow p-4 mb-4">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-semibold">Charting Tools</h2>
                    {saveStatus && (
                        <span className={`text-sm font-medium ${saveStatus === 'Saved' ? 'text-green-600' :
                            saveStatus.includes('Error') ? 'text-red-600' :
                                'text-blue-600'
                            }`}>
                            {saveStatus}
                        </span>
                    )}
                </div>

                {/* Color-coded condition buttons */}
                <div className="flex gap-2 flex-wrap justify-center">
                    {conditionOptions.map(option => {
                        const colors = getConditionColors(option.value);
                        return (
                            <button
                                key={option.value}
                                onClick={() => setActiveCondition(option.value)}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${activeCondition === option.value
                                    ? `${colors.bg} ${colors.text} ring-2 ring-offset-2 ${colors.border}`
                                    : `${colors.light} ${colors.lightText} hover:ring-2 ${colors.border}`
                                    }`}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>

                {/* Selection indicator */}
                {selectedTeeth.length > 0 && (
                    <div className="mt-3 p-2 bg-blue-50 rounded">
                        <span className="text-sm font-medium">
                            {selectedTeeth.length} {selectedTeeth.length === 1 ? 'tooth' : 'teeth'} selected
                        </span>
                        <button
                            onClick={handleClearSelection}
                            className="ml-2 text-sm text-blue-600 hover:underline"
                        >
                            Clear selection
                        </button>
                    </div>
                )}
            </div>

            {/* Color Legend */}
            <div className="bg-white rounded-lg shadow p-4 mb-4">
                <h3 className="text-sm font-semibold mb-2 text-gray-700">Color Legend</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
                    {conditionOptions.map(option => {
                        const colors = getConditionColors(option.value);
                        return (
                            <div key={option.value} className="flex items-center gap-1">
                                <div className={`w-4 h-4 rounded ${colors.bg}`}></div>
                                <span className="text-gray-700">{option.label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Odontogram */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
                    <Odontogram
                        key={odontoKey}
                        status={toothSelection}
                        onChange={handleToothClick}
                    />
                </div>

                {/* Tooth Detail Panel */}
                <div className="bg-white rounded-lg shadow p-4 max-h-[600px] overflow-y-auto">
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
                        <p className="text-gray-500">Select tooth/teeth to chart</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function MultipleTeethPanel({ selectedTeeth, chartData, onSurfaceClick, onAddCondition, activeCondition }) {
    const surfaces = ['mesial', 'distal', 'occlusal', 'buccal', 'lingual'];
    const colors = getConditionColors(activeCondition);

    return (
        <div>
            <h3 className="text-xl font-bold mb-4">
                {selectedTeeth.length} Teeth Selected
            </h3>

            <div className="mb-4 p-3 bg-gray-50 rounded">
                <div className="text-sm font-medium mb-2">Selected teeth:</div>
                <div className="flex flex-wrap gap-2">
                    {selectedTeeth.map((tooth) => (
                        <span key={tooth.id} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                            {tooth.id.replace('teeth-', '')}
                        </span>
                    ))}
                </div>
            </div>

            {/* Batch Surface Editing */}
            <div className="mb-6">
                <h4 className="font-semibold mb-2">Apply to Surface (All Selected)</h4>
                <div className="grid grid-cols-2 gap-2">
                    {surfaces.map(surface => (
                        <button
                            key={surface}
                            onClick={() => onSurfaceClick(surface)}
                            className={`p-3 rounded-lg border-2 hover:ring-2 text-sm transition-all ${colors.border} hover:${colors.light}`}
                        >
                            <div className="font-medium capitalize">{surface}</div>
                            <div className={`text-xs ${colors.lightText}`}>
                                Apply {activeCondition}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Batch Condition Adding */}
            <div className="mb-6">
                <h4 className="font-semibold mb-2">Add Condition (All Selected)</h4>
                <button
                    onClick={() => onAddCondition(activeCondition)}
                    className={`w-full px-4 py-2 rounded-lg font-medium ${colors.bg} ${colors.text} hover:opacity-90`}
                >
                    Add {activeCondition} to all
                </button>
            </div>

            {/* Individual Tooth Summary */}
            <div>
                <h4 className="font-semibold mb-2">Individual Tooth Data</h4>
                <div className="space-y-3">
                    {selectedTeeth.map((tooth) => {
                        const data = chartData[tooth.id];
                        return (
                            <div key={tooth.id} className="p-3 border rounded">
                                <div className="font-medium mb-1">
                                    Tooth {tooth.id.replace('teeth-', '')}
                                </div>
                                {data?.conditions && data.conditions.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {data.conditions.map((condition, idx) => {
                                            const condColors = getConditionColors(condition);
                                            return (
                                                <span
                                                    key={idx}
                                                    className={`px-2 py-0.5 rounded text-xs ${condColors.light} ${condColors.lightText}`}
                                                >
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

function ToothDetailPanel({
    toothId,
    data,
    onSurfaceClick,
    onAddCondition,
    onRemoveCondition,
    onNotesChange,
    activeCondition
}) {
    const surfaces = ['mesial', 'distal', 'occlusal', 'buccal', 'lingual'];
    const colors = getConditionColors(activeCondition);

    return (
        <div>
            <h3 className="text-xl font-bold mb-4">Tooth {toothId.replace('teeth-', '')}</h3>

            <div className="mb-6">
                <h4 className="font-semibold mb-2">Surfaces</h4>
                <div className="grid grid-cols-2 gap-2">
                    {surfaces.map(surface => {
                        const surfaceData = data?.surfaces?.[surface];
                        const surfaceColors = surfaceData?.condition
                            ? getConditionColors(surfaceData.condition)
                            : { border: 'border-gray-300', light: 'bg-white', lightText: 'text-gray-600' };

                        return (
                            <button
                                key={surface}
                                onClick={() => onSurfaceClick(surface)}
                                className={`p-3 rounded-lg border-2 text-sm transition-all ${surfaceData?.condition
                                    ? `${surfaceColors.light} ${surfaceColors.border} ring-2 ring-offset-1`
                                    : `border-gray-300 hover:${colors.light} hover:${colors.border}`
                                    }`}
                            >
                                <div className="font-medium capitalize">{surface}</div>
                                {surfaceData && (
                                    <div className={`text-xs font-medium ${surfaceColors.lightText}`}>
                                        {surfaceData.condition}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="mb-4">
                <h4 className="font-semibold mb-2">Conditions</h4>
                <button
                    onClick={() => onAddCondition(activeCondition)}
                    className={`w-full mb-2 px-3 py-2 rounded-lg text-sm font-medium ${colors.bg} ${colors.text} hover:opacity-90`}
                >
                    Add {activeCondition}
                </button>

                {data?.conditions && data.conditions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {data.conditions.map((condition, idx) => {
                            const condColors = getConditionColors(condition);
                            return (
                                <span
                                    key={idx}
                                    className={`px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-2 ${condColors.light} ${condColors.lightText}`}
                                >
                                    {condition}
                                    <button
                                        onClick={() => onRemoveCondition(toothId, condition)}
                                        className={`text-lg hover:opacity-70 ${condColors.lightText}`}
                                    >
                                        ×
                                    </button>
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>

            <div>
                <h4 className="font-semibold mb-2">Notes</h4>
                <textarea
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                    placeholder="Add notes..."
                    value={data?.notes || ''}
                    onChange={(e) => onNotesChange(toothId, e.target.value)}
                />
            </div>
        </div>
    );
}

function ChartsPage() {
    const [currentChart, setCurrentChart] = useState(null);
    const [charts, setCharts] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [patientName, setPatientName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        loadCharts();
    }, []);

    const handlePatientNameChange = (event) => {
        setPatientName(event.target.value.trim());
    }

    const saveStatus = async (chartId, status) => {
        if (isSaving) return;
        
        try {
            setIsSaving(true);
            const {error} = await supabase
                .from('charts')
                .update({status: status})
                .eq('id', chartId)
                .select();
            
            if (error) throw error;

            setCharts(prevCharts => 
                prevCharts.map(chart => 
                    chart.id === chartId ? { ...chart, status: status } : chart
                )
            );

            setCurrentChart(prevChart => ({
                ...prevChart,
                status: status
            }));

        } catch (error) {
            console.error('Error saving chart:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleStatusChange = async (chartId, status) => {
        if (isSaving) return;

        if (status === 'In Progress') {
            saveStatus(chartId, 'Completed');
        } else {
            saveStatus(chartId, 'In Progress');
        }
    }

    const handleSetCurrentChart = (chart) => {
        setCurrentChart(chart);
    }

    const loadCharts = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('charts')
                .select('*')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            setCharts(data || []);

            
        } catch (error) {
            console.error('Error loading charts:', error);
        }
    };

    const createNewChart = async () => {
        if (!patientName.trim()) {
            alert("Please enter a patient name.")
            return;
        }
        try {
            setIsCreating(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('charts')
                .insert([{
                    user_id: user.id,
                    date: `${new Date().toLocaleDateString()}`,
                    patient_name: patientName
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
            const { error } = await supabase
                .from('charts')
                .delete()
                .eq('id', chartId);

            if (error) throw error;

            const remainingCharts = charts.filter(c => c.id !== chartId);
            setCharts(remainingCharts);
            
            if (currentChart?.id === chartId) {
                setCurrentChart(null);
            }

        } catch (error) {
            console.error('Error deleting chart:', error);
        }
    };

    const handleUploadComplete = async (uploadRecord) => {
    try {
        // Ping your new FastAPI endpoint
        const response = await fetch('http://localhost:8000/api/process-chart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chart_id: uploadRecord.chart_id,
                file_path: uploadRecord.file_path
            })
        });

        if (!response.ok) {
            throw new Error('Agent failed to process the chart');
        }

        setRefreshTrigger(prev => prev + 1);
        
    } catch (error) {
        console.error("Processing error:", error);
        alert("There was an error parsing the chart with the AI agent.");
    }
};

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="max-w-7xl mx-auto p-6">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex justify-between items-center">
                        <div className='flex'>
                            <h1 className="text-3xl font-bold text-gray-900 mr-5">Charts</h1>
                            <input
                                type="text"
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Patient Name"
                                value={patientName}
                                onChange={handlePatientNameChange}
                            />
                        </div>
                        <button
                            onClick={createNewChart}
                            disabled={isCreating}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                        >
                            {isCreating ? 'Creating...' : '+ New Chart'}
                        </button>
                    </div>

                    {/* Chart Selector */}
                    {charts.length > 0 && (
                        <div className="mt-4 overflow-x-auto border border-gray-200 rounded-lg">
                            <table className="w-full text-sm text-left text-gray-600">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                    <th scope="col" className="px-6 py-4 font-semibold">Date</th>
                                    <th scope="col" className="px-6 py-4 font-semibold">Chart Type</th>
                                    <th scope="col" className="px-6 py-4 font-semibold">Patient</th>
                                    <th scope="col" className="px-6 py-4 font-semibold">Status</th>
                                    <th scope="col" className="px-6 py-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {charts
                                    .filter(chart => {
                                        const searchTerm = patientName.trim().toLowerCase();

                                        if (!searchTerm) return true;

                                        const currentName = (chart.patient_name || '').toLowerCase();
                                        
                                        return currentName.includes(searchTerm);
                                    })
                                    .map(chart => (
                                        <tr key={chart.id} className="bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">{chart.date}</td>
                                            <td className="px-6 py-4">{chart.type}</td>
                                            <td className="px-6 py-4 font-medium text-gray-900">{chart.patient_name}</td>
                                            <td className="px-6 py-4">
                                                <button 
                                                    className={`text-xs font-medium px-2.5 py-1 rounded-md ${chart.status === 'In Progress'? 'bg-yellow-100 text-yellow-800': 'bg-green-100 text-green-800'} `}
                                                    onClick={() => handleStatusChange(chart.id, chart.status)}
                                                >{chart.status}</button>
                                            </td>
                                            <td className="px-6 py-4 text-right flex justify-end gap-3">
                                                <button onClick={() => handleSetCurrentChart(chart)} className="text-gray-500 hover:text-blue-600" title="Edit">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                                </button>
                                                <button onClick={() => deleteChart(chart.id)} className="text-red-500 hover:text-red-700" title="Delete">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Import */}
                <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
                    <h1 className="text-3xl font-bold text-gray-900">Import</h1>
                    <p className="text-gray-600 mt-1">Upload a chart</p>
                    <div className='bg-gray-100 mt-6 cursor-pointer rounded-md'>
                        <FileUpload
                            elementId={currentChart?.id}
                            onUploadComplete={handleUploadComplete}
                        />
                    </div>
                </div>
                {currentChart ? (
                    <div>
                        <div className='bg-white rounded-lg shadow p-4 mb-4'>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800">
                                        {currentChart.patient_name || 'Unknown Patient'}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Chart ID: #{currentChart.id.slice(0, 8)}
                                    </p>
                                </div>
                                <div className="mt-2 md:mt-0">
                                    <button
                                        className={`text-s font-medium px-2.5 py-1 rounded-md mr-6 ${currentChart.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'} `}
                                        onClick={() => handleStatusChange(currentChart.id, currentChart.status)}
                                    >{currentChart.status}</button>
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
                                        <svg className="mr-1.5 h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        {currentChart.date}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <DentalChart
                            key={currentChart.id}
                            chartId={currentChart.id}
                            onChartSaved={loadCharts}
                            refreshTrigger={refreshTrigger}
                        />
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500 mb-6">
                        <p>Select or create a new chart</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ChartsPage;