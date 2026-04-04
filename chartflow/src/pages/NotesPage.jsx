import { useEffect, useState } from 'react';
import supabase from '../lib/supabase';
import FileUpload from '../components/file_upload/FileUpload';
import AudioInputHandler from '../components/audio/AudioInputHandler';

function CustomDateSelector({ value, onChange }) {
    const parseDate = () => {
        if (value) {
            const parts = value.split('-');
            return {
                year: parseInt(parts[0]),
                month: parseInt(parts[1]),
                day: parseInt(parts[2])
            };
        }
        const today = new Date();
        return {
            year: today.getFullYear(),
            month: today.getMonth() + 1,
            day: today.getDate()
        };
    };

    const { year: initialYear, month: initialMonth, day: initialDay } = parseDate();
    const [month, setMonth] = useState(initialMonth);
    const [day, setDay] = useState(initialDay);
    const [year, setYear] = useState(initialYear);

    // Sync initial date to parent on mount
    useEffect(() => {
        const dateString = `${initialYear}-${String(initialMonth).padStart(2, '0')}-${String(initialDay).padStart(2, '0')}`;
        onChange(dateString);
    }, []);

    const updateDate = (newMonth, newDay, newYear) => {
        setMonth(newMonth);
        setDay(newDay);
        setYear(newYear);
        const dateString = `${newYear}-${String(newMonth).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;
        onChange(dateString);
    };

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

    return (
        <div className="w-full">
            <div className="flex gap-3">
                <select
                    value={month}
                    onChange={(e) => updateDate(parseInt(e.target.value), day, year)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="">Month</option>
                    {months.map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                    ))}
                </select>

                <select
                    value={day}
                    onChange={(e) => updateDate(month, parseInt(e.target.value), year)}
                    className="w-20 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="">Day</option>
                    {days.map(d => (
                        <option key={d} value={d}>{d}</option>
                    ))}
                </select>

                <select
                    value={year}
                    onChange={(e) => updateDate(month, day, parseInt(e.target.value))}
                    className="w-24 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="">Year</option>
                    {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}

function ReadOnlyNote({ note }) {
    const Section = ({ title, content }) => {
        if (!content || content.trim() === '') return null;
        return (
            <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</h3>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-gray-800 whitespace-pre-wrap">{content}</p>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-2 mt-4">
            <Section title="Chief Complaint" content={note.chiefComplaint} />
            <Section title="Medical History" content={note.patient_history} />
            <Section title="Subjective (S)" content={note.subjective} />
            <Section title="Objective (O)" content={note.objective} />
            <Section title="Assessment (A)" content={note.assessment} />
            <Section title="Plan (P)" content={note.plan} />
            <Section title="Additional Notes" content={note.additional_notes} />

            {(!note.chiefComplaint && !note.patient_history && !note.subjective && !note.objective && !note.assessment && !note.plan && !note.additional_notes) && (
                <div className="text-center text-gray-400 py-8 italic">
                    This note is currently empty.
                </div>
            )}
        </div>
    );
}

function NoteEditor({ note, onChange }) {
    return (
        <div className="space-y-6">
            <div className='flex justify-between w-full'>
                <div className='flex-1 mr-4'>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Patient Name
                    </label>
                    <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., John Doe"
                        value={note.patientName || ''}
                        onChange={(e) => onChange({ ...note, patientName: e.target.value })}
                    />
                </div>
                <div className='flex-1'>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Date
                    </label>
                    <CustomDateSelector value={note.date} onChange={(date) => onChange({ ...note, date })} />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chief Complaint
                </label>
                <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Pain in lower right molar"
                    value={note.chiefComplaint || ''}
                    onChange={(e) => onChange({ ...note, chiefComplaint: e.target.value })}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medical History
                </label>
                <textarea
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
                    placeholder="Preexisting conditions, previous work, drug allergies..."
                    value={note.patient_history || ''}
                    onChange={(e) => onChange({ ...note, patient_history: e.target.value })}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subjective (S)
                </label>
                <textarea
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
                    placeholder="Patient's description of symptoms, history..."
                    value={note.subjective || ''}
                    onChange={(e) => onChange({ ...note, subjective: e.target.value })}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Objective (O)
                </label>
                <textarea
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
                    placeholder="Clinical findings, exam results..."
                    value={note.objective || ''}
                    onChange={(e) => onChange({ ...note, objective: e.target.value })}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assessment (A)
                </label>
                <textarea
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
                    placeholder="Diagnosis, interpretation..."
                    value={note.assessment || ''}
                    onChange={(e) => onChange({ ...note, assessment: e.target.value })}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plan (P)
                </label>
                <textarea
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
                    placeholder="Treatment plan, next steps..."
                    value={note.plan || ''}
                    onChange={(e) => onChange({ ...note, plan: e.target.value })}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes
                </label>
                <textarea
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
                    placeholder='Any other remarks, patient preferences, follow-up instructions...'
                    value={note.additional_notes || ''}
                    onChange={(e) => onChange({ ...note, additional_notes: e.target.value })}
                />
            </div>
        </div>
    );
}

export default function NotesPage() {
    const [currentNote, setCurrentNote] = useState(null);
    const [notes, setNotes] = useState([]);
    const [user, setUser] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [patientName, setPatientName] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [isGeneratingChart, setIsGeneratingChart] = useState(false);
    
    // UI STATES for audio processing and notifications
    const [isProcessingAudio, setIsProcessingAudio] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success'); // 'success' | 'error'

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, []);

    useEffect(() => {
        if (user) {
            loadNotes();
        }
    }, [user]);

    // --- FAILSAFE TIMEOUT EFFECT ---
    useEffect(() => {
        let timeoutId;
        
        // If the spinner is active, start a 2-minute countdown
        if (isProcessingAudio) {
            timeoutId = setTimeout(() => {
                setIsProcessingAudio(false);
                setToastType('error');
                setToastMessage('Transcription took too long or failed. Please check your connection and try again.');
                
                // Auto-hide the error after 6 seconds
                setTimeout(() => setToastMessage(''), 6000);
            }, 120000); // 120,000 ms = 2 minutes
        }

        // Cleanup the timer if the transcription finishes successfully before 2 minutes
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [isProcessingAudio]);

    // --- REAL-TIME SUBSCRIPTION EFFECT ---
    useEffect(() => {
        if (!user) return;

        const notesSubscription = supabase
            .channel('custom-notes-channel')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notes',
                    filter: `user_id=eq.${user.id}` 
                },
                (payload) => {
                    console.log('Real-time new note detected:', payload);
                    
                    loadNotes();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(notesSubscription);
        };
    }, [user]);

    // --- AUTOSAVE EFFECT ---
    useEffect(() => {
        if (!currentNote || !currentNote.patientName?.trim()) return;

        const debounceTimer = setTimeout(() => {
            handleSaveNote(true); 
        }, 1500);

        return () => clearTimeout(debounceTimer);
    }, [currentNote]); 

    const handlePatientNameChange = (event) => {
        setPatientName(event.target.value);
    };

    const loadNotes = async () => {
        try {
            const { data, error } = await supabase
                .from('notes')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const transformedNotes = data.map(note => ({
                ...note,
                patientName: note.patient_name,
                chiefComplaint: note.chief_complaint || '',
                subjective: note.subjective?.text || '',
                objective: note.objective?.text || '',
                assessment: note.assessment?.text || '',
                plan: note.plan?.text || '',
                patient_history: note.patient_history || '',
                additional_notes: note.additional_notes || ''
            }));

            setNotes(transformedNotes || []);
        } catch (error) {
            console.error('Error loading notes:', error);
        }
    };

    const saveStatus = async (noteId, status) => {
        if (isSaving) return;

        try {
            setIsSaving(true);
            const { error } = await supabase
                .from('notes')
                .update({ status: status })
                .eq('id', noteId);

            if (error) throw error;

            setNotes(prevNotes =>
                prevNotes.map(note =>
                    note.id === noteId ? { ...note, status: status } : note
                )
            );

            if (currentNote?.id === noteId) {
                setCurrentNote(prev => ({ ...prev, status: status }));
            }
        } catch (error) {
            console.error('Error saving status:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleStatusChange = async (noteId, status) => {
        if (isSaving) return;

        if (status === 'draft') {
            saveStatus(noteId, 'finalized');
        } else {
            saveStatus(noteId, 'draft');
        }
    };

    const handleSetCurrentNote = (note) => {
        setCurrentNote({ ...note });
    };

    const handleAudioSubmit = async (audioData, filename) => {
        setIsProcessingAudio(true);
        setToastMessage('');

        const formData = new FormData();
        formData.append('audio_file', audioData, filename);

        try {
            const response = await fetch('http://localhost:8000/api/process-transcript', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            
            if (data.status === "success" && data.structured_note) {
                const aiData = data.structured_note;

                if (currentNote) {
                    // SCENARIO A: A note is already selected. Update it.
                    setCurrentNote(prev => ({
                        ...prev,
                        chiefComplaint: aiData.chief_complaint || prev.chiefComplaint,
                        patient_history: aiData.patient_history || prev.patient_history,
                        subjective: aiData.subjective || prev.subjective,
                        objective: aiData.objective || prev.objective,
                        assessment: aiData.assessment || prev.assessment,
                        plan: aiData.plan || prev.plan,
                        additional_notes: aiData.additional_notes || prev.additional_notes,
                    }));
                } else {
                    // SCENARIO B: Cold start. Create a brand new note in Supabase.
                    const today = new Date();
                    const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

                    const { data: newDbNote, error } = await supabase
                        .from('notes')
                        .insert([{
                            user_id: user.id,
                            patient_name: 'New Audio Patient', // A placeholder so the user knows to change it
                            date: dateString,
                            note_type: 'SOAP',
                            status: 'draft',
                            generated_by: 'audio_upload', // Prevents the real-time listener from double-firing
                            chief_complaint: aiData.chief_complaint || '',
                            subjective: { text: aiData.subjective || '' },
                            objective: { text: aiData.objective || '' },
                            assessment: { text: aiData.assessment || '' },
                            plan: { text: aiData.plan || '' },
                            patient_history: aiData.patient_history || '',
                            additional_notes: aiData.additional_notes || ''
                        }])
                        .select()
                        .single();

                    if (error) throw error;

                    const formattedNote = {
                        ...newDbNote,
                        patientName: newDbNote.patient_name,
                        chiefComplaint: newDbNote.chief_complaint || '',
                        subjective: newDbNote.subjective?.text || '',
                        objective: newDbNote.objective?.text || '',
                        assessment: newDbNote.assessment?.text || '',
                        plan: newDbNote.plan?.text || '',
                        patient_history: newDbNote.patient_history || '',
                        additional_notes: newDbNote.additional_notes || ''
                    };

                    // Add it to the sidebar and instantly open it in the editor
                    setNotes(prev => [formattedNote, ...prev]);
                    setCurrentNote(formattedNote);
                }
                
                setToastType('success');
                setToastMessage('Note successfully generated from audio!');
                setTimeout(() => setToastMessage(''), 5000);
            } else {
                throw new Error(data.detail || "Error processing audio");
            }
        } catch (error) {
            console.error("Transcription error:", error);
            setToastType('error');
            setToastMessage('Failed to transcribe audio. Please try again.');
            setTimeout(() => setToastMessage(''), 5000);
        } finally {
            setIsProcessingAudio(false);
        }
    };

    const createNewNote = async () => {
        if (!patientName.trim()) {
            alert("Please enter a patient name.")
            return;
        }
        try {
            setIsCreating(true);
            if (!user) return;

            const today = new Date();
            const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

            const { data, error } = await supabase
                .from('notes')
                .insert([{
                    user_id: user.id,
                    patient_name: patientName,
                    date: dateString,
                    note_type: 'SOAP',
                    status: 'draft',
                    generated_by: 'manual',
                    chief_complaint: '',
                    subjective: { text: '' },
                    objective: { text: '' },
                    assessment: { text: '' },
                    plan: { text: '' },
                    patient_history: '',
                    additional_notes: ''
                }])
                .select()
                .single();

            if (error) throw error;

            const newNote = {
                ...data,
                patientName: data.patient_name,
                chiefComplaint: data.chief_complaint || '',
                subjective: data.subjective?.text || '',
                objective: data.objective?.text || '',
                assessment: data.assessment?.text || '',
                plan: data.plan?.text || '',
                patient_history: data.patient_history || '',
                additional_notes: data.additional_notes || ''
            };

            setNotes(prev => [newNote, ...prev]);
            setCurrentNote(newNote);
        } catch (error) {
            console.error('Error creating note:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleSaveNote = async (isAutoSave = false) => {
        if (!user || !currentNote) return;

        if (!currentNote.patientName?.trim()) {
            if (!isAutoSave) alert('Please name a patient');
            return;
        }

        try {
            setIsSaving(true);
            const { data, error } = await supabase
                .from('notes')
                .update({
                    patient_name: currentNote.patientName,
                    date: currentNote.date,
                    chief_complaint: currentNote.chiefComplaint,
                    subjective: { text: currentNote.subjective },
                    objective: { text: currentNote.objective },
                    assessment: { text: currentNote.assessment },
                    plan: { text: currentNote.plan },
                    patient_history: currentNote.patient_history,
                    additional_notes: currentNote.additional_notes
                })
                .eq('id', currentNote.id)
                .select();

            if (error) throw error;

            setNotes(prevNotes =>
                prevNotes.map(note =>
                    note.id === currentNote.id ? {
                        ...note,
                        ...data[0],
                        patientName: currentNote.patientName,
                        date: currentNote.date,
                        chiefComplaint: currentNote.chiefComplaint,
                        subjective: currentNote.subjective,
                        objective: currentNote.objective,
                        assessment: currentNote.assessment,
                        plan: currentNote.plan,
                        patient_history: currentNote.patient_history,
                        additional_notes: currentNote.additional_notes
                    } : note
                )
            );

            if (!isAutoSave) {
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
            }
        } catch (error) {
            console.error('Error saving note:', error);
            if (!isAutoSave) alert('Failed to save note: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const deleteNote = async (noteId) => {
        if (!confirm('Are you sure you want to delete this note?')) return;

        try {
            const { error } = await supabase
                .from('notes')
                .delete()
                .eq('id', noteId);

            if (error) throw error;

            setNotes(prev => prev.filter(n => n.id !== noteId));

            if (currentNote?.id === noteId) {
                setCurrentNote(null);
            }
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    };

    const handleGenerateChart = async () => {
        if (!currentNote || !currentNote.patientName) {
            alert("Please save the note with a patient name first.");
            return;
        }

        try {
            setIsGeneratingChart(true);

            const { data: existingChart, error: checkError } = await supabase
                .from('charts')
                .select('id')
                .eq('note_id', currentNote.id)
                .single();

            if (existingChart) {
                alert("A chart has already been generated for this note! Please check the Charts tab.");
                setIsGeneratingChart(false);
                return;
            }

            if (checkError && checkError.code !== 'PGRST116') {
                throw checkError;
            }

            const combinedNoteText = `
                Medical History: ${currentNote.patient_history || 'None'}
                Chief Complaint: ${currentNote.chiefComplaint || 'None'}
                Subjective: ${currentNote.subjective || 'None'}
                Objective: ${currentNote.objective || 'None'}
                Assessment: ${currentNote.assessment || 'None'}
                Plan: ${currentNote.plan || 'None'}
                Additional Notes: ${currentNote.additional_notes || 'None'}
            `;

            const response = await fetch('http://localhost:8000/api/chart-from-note', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    patient_name: currentNote.patientName,
                    date: currentNote.date,
                    note_text: combinedNoteText,
                    note_id: currentNote.id
                })
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.detail || 'Failed to generate chart');

            alert('Chart successfully generated! You can view it in the Charts tab.');

        } catch (error) {
            console.error("Chart generation error:", error);
            alert("Error generating chart: " + error.message);
        } finally {
            setIsGeneratingChart(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 relative">
            
            {/* Dynamic Global Toast Notification */}
            {toastMessage && (
                <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-lg shadow-xl flex items-center gap-3 animate-fade-in-down text-white ${toastType === 'success' ? 'bg-gray-900' : 'bg-red-600'}`}>
                    <span className="text-xl">{toastType === 'success' ? '✨' : '⚠️'}</span>
                    <p className="font-medium">{toastMessage}</p>
                    <button onClick={() => setToastMessage('')} className="ml-4 text-white opacity-70 hover:opacity-100">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
            )}

            <div className="max-w-7xl mx-auto p-6">
                {/* Header Block & Table */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex justify-between items-center">
                        <div className='flex'>
                            <h1 className="text-3xl font-bold text-gray-900 mr-5">Notes</h1>
                            <input
                                type="text"
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Patient Name"
                                value={patientName}
                                onChange={handlePatientNameChange}
                            />
                        </div>
                        <button
                            onClick={createNewNote}
                            disabled={isCreating}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                        >
                            {isCreating ? 'Creating...' : '+ New Note'}
                        </button>
                    </div>

                    {/* Notes Selector Table */}
                    {notes.length > 0 && (
                        <div className="mt-4 overflow-x-auto border border-gray-200 rounded-lg">
                            <table className="w-full text-sm text-left text-gray-600">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th scope="col" className="px-6 py-4 font-semibold">Date</th>
                                        <th scope="col" className="px-6 py-4 font-semibold">Note Type</th>
                                        <th scope="col" className="px-6 py-4 font-semibold">Patient</th>
                                        <th scope="col" className="px-6 py-4 font-semibold">Status</th>
                                        <th scope="col" className="px-6 py-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {notes
                                        .filter(note => {
                                            const searchTerm = patientName.trim().toLowerCase();
                                            if (!searchTerm) return true;
                                            const currentName = (note.patient_name || '').toLowerCase();
                                            return currentName.includes(searchTerm);
                                        })
                                        .map(note => (
                                            <tr key={note.id} className="bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">{note.date}</td>
                                                <td className="px-6 py-4">{note.note_type}</td>
                                                <td className="px-6 py-4 font-medium text-gray-900">{note.patient_name}</td>
                                                <td className="px-6 py-4">
                                                    <label
                                                        className={`text-xs font-medium px-2.5 py-1 rounded-md ${note.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}
                                                    >
                                                        {note.status || 'Draft'}
                                                    </label>
                                                </td>
                                                <td className="px-6 py-4 text-right flex justify-end gap-3">
                                                    <button onClick={() => handleSetCurrentNote(note)} className="text-gray-500 hover:text-blue-600" title="Edit">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                                    </button>
                                                    <button onClick={() => deleteNote(note.id)} className="text-red-500 hover:text-red-700" title="Delete">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Transcribe Block */}
                <div className='bg-white rounded-lg shadow-sm p-6 mb-6 transition-all duration-300'>
                    <h1 className="text-3xl font-bold text-gray-900">Transcribe</h1>
                    <p className="text-gray-600 mt-1">
                        Upload an audio file or record dictation to automatically create a note.
                    </p>
                    
                    {isProcessingAudio ? (
                        <div className="mt-6 border-2 border-blue-200 border-dashed bg-blue-50 rounded-lg p-10 flex flex-col items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                            <p className="text-blue-800 font-semibold text-lg">AI is generating your note...</p>
                            <p className="text-blue-600 text-sm mt-1">This usually takes about a minute depending on the audio length.</p>
                            <button 
                                onClick={() => setIsProcessingAudio(false)}
                                className="mt-4 text-sm text-blue-500 hover:text-blue-700 underline"
                            >
                                Cancel Waiting
                            </button>
                        </div>
                    ) : (
                        <div className='bg-gray-100 mt-6 rounded-md'>
                            {/* The handler is now permanently enabled */}
                            <AudioInputHandler onAudioSubmit={handleAudioSubmit} />
                        </div>
                    )}
                </div>

                {/* Editor Container */}
                {currentNote ? (
                    <div>
                        <h1 className='text-4xl mb-6 mt-12 font-bold'>Note Editor</h1>
                        <div className='bg-white rounded-lg shadow p-4 mb-4'>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800">
                                        {currentNote.patientName || 'Unknown Patient'}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Note ID: #{currentNote.id.slice(0, 8)}
                                    </p>
                                </div>
                                <div className="mt-2 md:mt-0 flex items-center">
                                    <label
                                        className={`text-sm font-medium px-2.5 py-1 rounded-md mr-6 ${currentNote.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}
                                    >
                                        {currentNote.status || 'Draft'}
                                    </label>
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700 mr-6">
                                        <svg className="mr-1.5 h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        {currentNote.date}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                                <h2 className="text-xl font-semibold text-gray-800">
                                    {currentNote.status === 'finalized' ? 'Clinical Note' : 'Edit Note'}
                                </h2>

                                <div className="flex items-center gap-4">
                                    {currentNote.status === 'draft' && isSaving && <span className="text-sm text-gray-500">Saving...</span>}
                                    {currentNote.status === 'draft' && showSuccess && <span className="text-sm text-green-600">Saved successfully</span>}

                                    {currentNote.status === 'finalized' && (
                                        <button
                                            onClick={() => handleStatusChange(currentNote.id, 'draft')}
                                            className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                            Unlock for Editing
                                        </button>
                                    )}
                                </div>
                            </div>

                            {currentNote.status === 'finalized' ? (
                                <ReadOnlyNote note={currentNote} />
                            ) : (
                                <NoteEditor note={currentNote} onChange={setCurrentNote} />
                            )}

                            <div className="mt-8 pt-6 border-t border-gray-200">
                                {currentNote.status === 'finalized' ? (
                                    <button
                                        onClick={handleGenerateChart}
                                        disabled={isGeneratingChart || isSaving}
                                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
                                    >
                                        {isGeneratingChart ? 'Generating Chart...' : 'Generate Chart'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleStatusChange(currentNote.id, 'finalized')}
                                        disabled={isSaving}
                                        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50"
                                    >
                                        {isSaving ? 'Saving...' : 'Finalize Note'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500 mb-6">
                        <p>Select or create a new note</p>
                    </div>
                )}
            </div>
        </div>
    );
}