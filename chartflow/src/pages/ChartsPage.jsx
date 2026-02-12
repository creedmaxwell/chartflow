import { useState } from 'react';
import supabase from '../lib/supabase';
import Odontogram from 'react-odontogram';

function ChartsPage () {
    const [toothState, setToothState] = useState({});
    const handleChange = (selectedTeeth) => {
        setTimeout(() => {
            setToothState(selectedTeeth); 
        }, 0);
    }
    return (
        <div className="min-h-screen bg-gray-100">
            <div className="max-w-7xl mx-auto p-6">
                { /* Header */ }
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Charts</h1>
                    <p className="text-gray-600 mt-1">Create and edit charts</p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow">
                    <Odontogram 
                        status={toothState}
                        onChange={handleChange}
                    />
                </div>
            </div>
        </div>
    );
}

export default ChartsPage;