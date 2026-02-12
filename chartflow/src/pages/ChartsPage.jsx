import { useState, useCallback } from 'react';
import supabase from '../lib/supabase';
import Odontogram from 'react-odontogram';
import { useDropzone } from 'react-dropzone';

function FileUpload(props) {
    //const {acceptedFiles, getRootProps, getInputProps} = useDropzone();
    const [uploadStatus, setUploadStatus] = useState('');

    const onDrop = useCallback(async (acceptedFiles) => {
        for (const file of acceptedFiles) {
            try {
                setUploadStatus('Uploading...');

                // 2. Generate a unique file path (to avoid overwrites)
                // Example: "public/171562334_myimage.png"
                const filePath = `uploads/${Date.now()}_${file.name}`;

                // 3. Upload to Supabase Storage
                // Replace 'images' with your actual bucket name
                const { data, error } = await supabase.storage
                    .from('images')
                    .upload(filePath, file);

                if (error) {
                    throw error;
                }

                setUploadStatus(`Uploaded: ${file.name}`);
                console.log('File uploaded successfully:', data);

                // 4. (Optional) Get the Public URL to feed to your AI
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
            'image/*': ['.jpeg', '.png', '.jpg', '.gif'] // Allow generic images
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

function DentalChart() {
    // Complex data structure for full charting
    const [chartData, setChartData] = useState({
        'teeth-11': {
            surfaces: {
                mesial: { condition: 'cavity', severity: 'moderate' },
                distal: { condition: 'filling', material: 'composite' },
                occlusal: { condition: 'healthy' },
                buccal: { condition: 'healthy' },
                lingual: { condition: 'healthy' }
            },
            conditions: ['root_canal', 'crown'],
            notes: 'Patient reports sensitivity',
            procedures: [
                { date: '2024-01-15', type: 'filling', surface: 'distal' }
            ]
        },
        // ... more teeth
    });

    const [selectedTeeth, setSelectedTeeth] = useState([]); // Array of selected tooth IDs
    const [activeCondition, setActiveCondition] = useState('cavity');
    const [odontoKey, setOdontoKey] = useState(0);

    // Convert chartData to simple selection for Odontogram display
    const toothSelection = selectedTeeth.reduce((acc, toothId) => {
        acc[toothId] = true;
        return acc;
    }, {});

    const handleToothClick = (selectedTeethObj) => {
        // Convert object to array of selected tooth IDs
        //const selected = Object.keys(selectedTeethObj).filter(id => selectedTeethObj[id]);
        //console.log('selectedTeethObj:', selectedTeethObj);
        setSelectedTeeth(selectedTeethObj);
    };

    const handleClearSelection = () => {
        setSelectedTeeth([]);
        setOdontoKey(prev => prev + 1);
    };

    const handleSurfaceClick = (surface) => {
        if (selectedTeeth.length === 0) return;

        // Apply to ALL selected teeth
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

    return (
        <div>
            {/* Toolbar */}
            <div className="bg-white rounded-lg shadow p-4 mb-4">
                <h2 className="text-lg font-semibold mb-3">Charting Tools</h2>
                <div className="flex gap-2 flex-wrap">
                    {['cavity', 'filling', 'crown', 'missing', 'implant', 'bridge'].map(condition => (
                        <button
                            key={condition}
                            onClick={() => setActiveCondition(condition)}
                            className={`px-4 py-2 rounded ${activeCondition === condition
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200'
                                }`}
                        >
                            {condition}
                        </button>
                    ))}
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
                            // Single tooth - show full detail
                            <ToothDetailPanel
                                toothId={selectedTeeth[0].id}
                                data={chartData[selectedTeeth[0]]}
                                onSurfaceClick={handleSurfaceClick}
                                onAddCondition={handleAddCondition}
                                onRemoveCondition={handleRemoveCondition}
                                onNotesChange={handleNotesChange}
                                activeCondition={activeCondition}
                            />
                        ) : (
                            // Multiple teeth - show batch editing
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
                            className="p-3 rounded border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 text-sm"
                        >
                            <div className="font-medium">{surface}</div>
                            <div className="text-xs text-gray-600">
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
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
                                    <div className="text-xs text-gray-600">
                                        {data.conditions.join(', ')}
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

    return (
        <div>
            <h3 className="text-xl font-bold mb-4">Tooth {toothId.replace('teeth-', '')}</h3>

            {/* Surface Selector */}
            <div className="mb-6">
                <h4 className="font-semibold mb-2">Surfaces</h4>
                <div className="grid grid-cols-2 gap-2">
                    {surfaces.map(surface => {
                        const surfaceData = data?.surfaces?.[surface];
                        return (
                            <button
                                key={surface}
                                onClick={() => onSurfaceClick(surface)}
                                className={`p-3 rounded border-2 text-sm ${surfaceData?.condition
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-300'
                                    }`}
                            >
                                <div className="font-medium capitalize">{surface}</div>
                                {surfaceData && (
                                    <div className="text-xs text-gray-600">
                                        {surfaceData.condition}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Conditions */}
            <div className="mb-4">
                <h4 className="font-semibold mb-2">Conditions</h4>
                <button
                    onClick={() => onAddCondition(activeCondition)}
                    className="w-full mb-2 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                    Add {activeCondition}
                </button>
                
                {data?.conditions && data.conditions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {data.conditions.map((condition, idx) => (
                            <span 
                                key={idx} 
                                className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm flex items-center gap-1"
                            >
                                {condition}
                                <button
                                    onClick={() => onRemoveCondition(toothId, condition)}
                                    className="ml-1 text-red-600 hover:text-red-800"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Notes */}
            <div>
                <h4 className="font-semibold mb-2">Notes</h4>
                <textarea
                    className="w-full border rounded p-2 text-sm"
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
    const [toothState, setToothState] = useState({});
    const handleChange = (selectedTeeth) => {
        setTimeout(() => {
            setToothState(selectedTeeth);
        }, 0);
    }
    return (
        <div className="min-h-screen bg-gray-100">
            <div className="max-w-7xl mx-auto p-6">
                { /* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Charts</h1>
                    <p className="text-gray-600 mt-1">Create and edit charts</p>
                </div>

                { /* Import */}
                <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
                    <h1 className="text-3xl font-bold text-gray-900">Import</h1>
                    <p className="text-gray-600 mt-1">Upload a chart</p>
                    <div className='bg-gray-100 border-2 border-gray-300 border-dashed mt-6 cursor-pointer rounded-md'>
                        <FileUpload />
                    </div>
                </div>

                <DentalChart />
            </div>
        </div>
    );
}

export default ChartsPage;