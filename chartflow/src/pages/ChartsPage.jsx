import { useState, useCallback, useEffect } from 'react';
import supabase from '../lib/supabase';
import Odontogram from 'react-odontogram';
import { useDropzone } from 'react-dropzone';

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

function FileUpload(props) {
    const [uploadStatus, setUploadStatus] = useState('');

    const onDrop = useCallback(async (acceptedFiles) => {
        for (const file of acceptedFiles) {
            try {
                setUploadStatus('Uploading...');
                const filePath = `uploads/${Date.now()}_${file.name}`;

                const { data, error } = await supabase.storage
                    .from('images')
                    .upload(filePath, file);

                if (error) throw error;

                setUploadStatus(`Uploaded: ${file.name}`);
                console.log('File uploaded successfully:', data);

                const { data: { publicUrl } } = supabase.storage
                    .from('images')
                    .getPublicUrl(filePath);

                console.log('File URL for AI:', publicUrl);

            } catch (error) {
                console.error('Error uploading file:', error.message);
                setUploadStatus(`Failed: ${error.message}`);
            }
        }
    }, []);

    const { getRootProps, getInputProps, acceptedFiles } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.png', '.jpg', '.gif']
        }
    });

    const files = acceptedFiles.map(file => (
        <li key={file.path}>
            {file.path} - {file.size} bytes
        </li>
    ));
    
    return (
        <section className="container">
            <div {...getRootProps({ className: 'dropzone' })}>
                <div className='flex justify-center p-6'>
                    <input {...getInputProps()} />
                    <p className='text-gray-300'>Drag 'n' drop an image here, or click to select file</p>
                </div>
            </div>
            <aside className="mt-4">
                <h4 className="font-bold text-gray-700">Files:</h4>
                <ul>{files}</ul>
                {uploadStatus && (
                    <p className="mt-2 text-blue-600 font-semibold">{uploadStatus}</p>
                )}
            </aside>
        </section>
    );
}

function DentalChart({ chartId, onChartSaved }) {
    const [chartData, setChartData] = useState({});
    const [selectedTeeth, setSelectedTeeth] = useState([]);
    const [activeCondition, setActiveCondition] = useState('cavity');
    const [odontoKey, setOdontoKey] = useState(0);
    const [saveStatus, setSaveStatus] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (chartId) {
            loadChartData(chartId);
        }
    }, [chartId]);

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
                        <span className={`text-sm font-medium ${
                            saveStatus === 'Saved' ? 'text-green-600' : 
                            saveStatus.includes('Error') ? 'text-red-600' : 
                            'text-blue-600'
                        }`}>
                            {saveStatus}
                        </span>
                    )}
                </div>
                
                {/* Color-coded condition buttons */}
                <div className="flex gap-2 flex-wrap">
                    {conditionOptions.map(option => {
                        const colors = getConditionColors(option.value);
                        return (
                            <button
                                key={option.value}
                                onClick={() => setActiveCondition(option.value)}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                    activeCondition === option.value
                                        ? `${colors.bg} ${colors.text} ring-2 ring-offset-2 ${colors.border}`
                                        : `${colors.light} ${colors.lightText} hover:ring-2 ${colors.border}`
                                }`}
                            >
                                <span className="mr-1">{option.icon}</span>
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

            {/* Surface Selector with color coding */}
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
                                className={`p-3 rounded-lg border-2 text-sm transition-all ${
                                    surfaceData?.condition
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

            {/* Conditions with color-coded badges */}
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

            {/* Notes */}
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
    const [currentChartId, setCurrentChartId] = useState(null);
    const [charts, setCharts] = useState([]);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        loadCharts();
    }, []);

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
            
            if (data && data.length > 0 && !currentChartId) {
                setCurrentChartId(data[0].id);
            }
        } catch (error) {
            console.error('Error loading charts:', error);
        }
    };

    const createNewChart = async () => {
        try {
            setIsCreating(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('charts')
                .insert([{
                    user_id: user.id,
                    title: `Chart ${new Date().toLocaleDateString()}`
                }])
                .select()
                .single();

            if (error) throw error;

            setCharts(prev => [data, ...prev]);
            setCurrentChartId(data.id);
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

            setCharts(prev => prev.filter(c => c.id !== chartId));
            if (currentChartId === chartId) {
                setCurrentChartId(charts[0]?.id || null);
            }
        } catch (error) {
            console.error('Error deleting chart:', error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="max-w-7xl mx-auto p-6">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Charts</h1>
                            <p className="text-gray-600 mt-1">Create and edit charts</p>
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
                        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                            {charts.map(chart => (
                                <div key={chart.id} className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentChartId(chart.id)}
                                        className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium transition-all ${
                                            currentChartId === chart.id
                                                ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                                                : 'bg-gray-200 hover:bg-gray-300'
                                        }`}
                                    >
                                        {chart.title}
                                    </button>
                                    <button
                                        onClick={() => deleteChart(chart.id)}
                                        className="text-red-600 hover:text-red-800 px-2 text-xl font-bold"
                                        title="Delete chart"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Import */}
                <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
                    <h1 className="text-3xl font-bold text-gray-900">Import</h1>
                    <p className="text-gray-600 mt-1">Upload a chart</p>
                    <div className='bg-gray-100 border-2 border-gray-300 border-dashed mt-6 cursor-pointer rounded-md'>
                        <FileUpload />
                    </div>
                </div>

                {currentChartId ? (
                    <DentalChart 
                        key={currentChartId}
                        chartId={currentChartId} 
                        onChartSaved={loadCharts}
                    />
                ) : (
                    <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                        <p>Create a new chart to get started</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ChartsPage;