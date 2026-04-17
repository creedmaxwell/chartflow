import { useEffect, useState } from 'react';
import supabase from '../lib/supabase';
import FileUpload from '../components/file_upload/FileUpload';
import AudioInputHandler from '../components/audio/AudioInputHandler';

const formatPrettyDate = (dateString) => {
    if (!dateString) return '';
    if (dateString.includes('/')) return dateString;
    const date = new Date(dateString.includes('T') ? dateString : `${dateString}T00:00:00`);
    return date.toLocaleDateString('en-US');
};

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

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

    return (
        <div className="w-full">
            <div className="flex gap-3">
                <select
                    value={month}
                    onChange={(e) => updateDate(parseInt(e.target.value), day, year)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="">Month</option>
                    {months.map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                    ))}
                </select>

                <select
                    value={day}
                    onChange={(e) => updateDate(month, parseInt(e.target.value), year)}
                    className="w-20 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="">Day</option>
                    {days.map(d => (
                        <option key={d} value={d}>{d}</option>
                    ))}
                </select>

                <select
                    value={year}
                    onChange={(e) => updateDate(month, day, parseInt(e.target.value))}
                    className="w-24 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{title}</h3>
                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                    <p className="text-gray-800 dark:text-slate-200 whitespace-pre-wrap">{content}</p>
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
                <div className="text-center text-gray-400 dark:text-slate-500 py-8 italic">
                    This note is currently empty.
                </div>
            )}
        </div>
    );
}

function NoteEditor({ note, onChange, onBack, onSave, onFinalize, onUnlock, onGenerateChart, isSaving, isGeneratingChart }) {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopyToClipboard = async () => {
        const formattedText = `
PATIENT: ${note.patientName || 'Unspecified'}
DATE: ${formatPrettyDate(note.date) || 'Unspecified'}

CHIEF COMPLAINT:
${note.chiefComplaint || 'None'}

MEDICAL HISTORY:
${note.patient_history || 'None'}

SUBJECTIVE (S):
${note.subjective || 'None'}

OBJECTIVE (O):
${note.objective || 'None'}

ASSESSMENT (A):
${note.assessment || 'None'}

PLAN (P):
${note.plan || 'None'}

ADDITIONAL NOTES:
${note.additional_notes || 'None'}
        `.trim();

        try {
            await navigator.clipboard.writeText(formattedText);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000); 
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy note to clipboard. Check browser permissions.');
        }
    };

    const SoapBox = ({ title, icon, colorClass, placeholder, field }) => (
        <article className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center`}>
                    <span className="material-symbols-outlined">{icon}</span>
                </div>
                <h3 className="text-lg font-bold font-headline text-slate-900 dark:text-white">{title}</h3>
            </div>
            <textarea
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/40 transition-all text-sm py-3 px-4 min-h-[120px] resize-y text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                placeholder={placeholder}
                value={note[field] || ''}
                onChange={(e) => onChange({ ...note, [field]: e.target.value })}
                disabled={note.status === 'finalized'}
            />
        </article>
    );

    return (
        <div className="space-y-6 pb-24">
            <section className="flex justify-between items-center mb-8">
                <div>
                    <button onClick={onBack} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 text-sm font-bold mb-4 transition-colors">
                        <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Notes
                    </button>
                    <div className="flex items-center gap-4">
                        <input
                            type="text"
                            className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white bg-transparent border-none p-0 focus:ring-0 placeholder-slate-300 dark:placeholder-slate-600 w-full"
                            placeholder="Patient Name"
                            value={note.patientName || ''}
                            onChange={(e) => onChange({ ...note, patientName: e.target.value })}
                            disabled={note.status === 'finalized'}
                        />
                    </div>
                    <div className="mt-2 text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                        {note.status === 'finalized' ? (
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatPrettyDate(note.date)}</span>
                        ) : (
                            <CustomDateSelector value={note.date} onChange={(date) => onChange({ ...note, date })} />
                        )}
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SoapBox title="Chief Complaint" icon="record_voice_over" colorClass="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" placeholder="Describe the reason for the visit..." field="chiefComplaint" />
                <SoapBox title="Medical History" icon="history" colorClass="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300" placeholder="Preexisting conditions, drug allergies..." field="patient_history" />
                <SoapBox title="Subjective (S)" icon="chat_bubble" colorClass="bg-blue-50 dark:bg-blue-900/30 text-primary dark:text-blue-400" placeholder="Patient's description of symptoms..." field="subjective" />
                <SoapBox title="Objective (O)" icon="visibility" colorClass="bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400" placeholder="Clinical findings, exam results..." field="objective" />
                <SoapBox title="Assessment (A)" icon="psychology" colorClass="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" placeholder="Diagnosis, interpretation..." field="assessment" />
                <SoapBox title="Plan (P)" icon="assignment" colorClass="bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-400" placeholder="Treatment plan, next steps..." field="plan" />
            </div>

            <SoapBox title="Additional Notes" icon="note_add" colorClass="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300" placeholder="Any other remarks..." field="additional_notes" />

            <div className="fixed bottom-6 right-8 left-72 z-40">
                <div className="max-w-5xl mx-auto bg-white/85 dark:bg-slate-800/85 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl py-4 px-8 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</span>
                        <div className="flex items-center gap-2 mt-1">
                            <div className={`w-2 h-2 rounded-full ${note.status === 'finalized' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{note.status || 'Draft'}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={onSave} disabled={isSaving} className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 font-bold text-sm transition-colors">
                            {isSaving ? 'Saving...' : 'Force Save'}
                        </button>
                        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700"></div>

                        {note.status === 'draft' ? (
                            <button onClick={onFinalize} disabled={isSaving} className="bg-primary text-white font-black text-sm px-8 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95">
                                FINALIZE NOTE
                            </button>
                        ) : (
                            <div className="flex items-center gap-3">
                                <button onClick={handleCopyToClipboard} className="bg-slate-800 dark:bg-slate-700 text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-slate-700 dark:hover:bg-slate-600 transition-all shadow-sm active:scale-95 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">{isCopied ? 'check' : 'content_copy'}</span>
                                    {isCopied ? 'Copied!' : 'Copy Note'}
                                </button>
                                <button onClick={onUnlock} disabled={isSaving} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm px-6 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">lock_open</span> Unlock Note
                                </button>
                                <button onClick={onGenerateChart} disabled={isGeneratingChart || isSaving} className="bg-teal-600 text-white font-black text-sm px-8 py-3 rounded-xl hover:bg-teal-700 transition-all shadow-md active:scale-95">
                                    {isGeneratingChart ? 'GENERATING...' : 'GENERATE CHART'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
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
    const [searchQuery, setSearchQuery] = useState('');
    const [isGeneratingChart, setIsGeneratingChart] = useState(false);

    // UI STATES for audio processing and notifications
    const [isProcessingAudio, setIsProcessingAudio] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success'); 

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

    // FAILSAFE TIMEOUT EFFECT
    useEffect(() => {
        let timeoutId;
        if (isProcessingAudio) {
            timeoutId = setTimeout(() => {
                setIsProcessingAudio(false);
                setToastType('error');
                setToastMessage('Transcription took too long or failed. Please check your connection and try again.');
                setTimeout(() => setToastMessage(''), 6000);
            }, 120000); // 2 minutes
        }
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [isProcessingAudio]);

    // REAL-TIME SUBSCRIPTION EFFECT
    useEffect(() => {
        if (!user) return;
        const notesSubscription = supabase
            .channel('custom-notes-channel')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notes', filter: `user_id=eq.${user.id}` }, (payload) => {
                console.log('Real-time new note detected:', payload);
                loadNotes();
            })
            .subscribe();
        return () => {
            supabase.removeChannel(notesSubscription);
        };
    }, [user]);

    // AUTOSAVE EFFECT
    useEffect(() => {
        if (!currentNote) return;
        const debounceTimer = setTimeout(() => {
            handleSaveNote(true);
        }, 1500);
        return () => clearTimeout(debounceTimer);
    }, [currentNote]);

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
            const { error } = await supabase.from('notes').update({ status: status }).eq('id', noteId);
            if (error) throw error;
            setNotes(prevNotes => prevNotes.map(note => note.id === noteId ? { ...note, status: status } : note));
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
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('http://localhost:8000/api/process-transcript', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
                body: formData,
            });

            const data = await response.json();

            if (data.status === "success" && data.structured_note) {
                const aiData = data.structured_note;

                if (currentNote) {
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
                    const today = new Date();
                    const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

                    const { data: newDbNote, error } = await supabase
                        .from('notes')
                        .insert([{
                            user_id: user.id,
                            patient_name: 'New Audio Patient',
                            date: dateString,
                            note_type: 'SOAP',
                            status: 'draft',
                            generated_by: 'audio_upload',
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
        try {
            setIsCreating(true);
            if (!user) return;

            const today = new Date();
            const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

            const { data, error } = await supabase
                .from('notes')
                .insert([{
                    user_id: user.id,
                    patient_name: '',
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

        if (!currentNote.patientName?.trim() && !isAutoSave) {
            alert('Please enter a patient name before saving');
            return;
        }

        try {
            setIsSaving(true);
            const { data, error } = await supabase
                .from('notes')
                .update({
                    patient_name: currentNote.patientName || '',
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
            const { error } = await supabase.from('notes').delete().eq('id', noteId);
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

            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('http://localhost:8000/api/chart-from-note', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-body relative transition-colors duration-200">
            {toastMessage && (
                <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-lg shadow-xl flex items-center gap-3 animate-fade-in-down text-white ${toastType === 'success' ? 'bg-gray-900' : 'bg-red-600'}`}>
                    <span className="text-xl">{toastType === 'success' ? '✨' : '⚠️'}</span>
                    <p className="font-medium">{toastMessage}</p>
                    <button onClick={() => setToastMessage('')} className="ml-4 text-white opacity-70 hover:opacity-100">
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>
            )}

            <div className="p-8 max-w-7xl mx-auto">
                {currentNote ? (
                    <NoteEditor 
                        note={currentNote} 
                        onChange={setCurrentNote} 
                        onBack={() => setCurrentNote(null)} 
                        onSave={() => handleSaveNote(false)} 
                        onFinalize={() => handleStatusChange(currentNote.id, 'finalized')} 
                        onUnlock={() => handleStatusChange(currentNote.id, 'draft')} 
                        onGenerateChart={handleGenerateChart} 
                        isSaving={isSaving} 
                        isGeneratingChart={isGeneratingChart} 
                    />
                ) : (
                    <div className="grid grid-cols-12 gap-6">
                        <section className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-800 rounded-xl p-1 shadow-sm border border-slate-100 dark:border-slate-700">
                            <div className="px-6 py-5 flex justify-between items-center border-b border-slate-100 dark:border-slate-700">
                                <h3 className="text-base font-bold font-headline text-slate-900 dark:text-white tracking-tight">Recent Clinical Notes</h3>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="Search patients..." 
                                        className="text-sm px-3 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border-none rounded-lg focus:ring-1 focus:ring-primary" 
                                        value={searchQuery} 
                                        onChange={(e) => setSearchQuery(e.target.value)} 
                                    />
                                    <button onClick={createNewNote} disabled={isCreating} className="px-4 py-1.5 text-xs font-bold text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors">
                                        {isCreating ? '...' : '+ New'}
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
                                        {notes.filter(n => (!searchQuery.trim() || (n.patient_name || '').toLowerCase().includes(searchQuery.trim().toLowerCase()))).map(note => (
                                            <tr key={note.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer" onClick={() => setCurrentNote(note)}>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{formatPrettyDate(note.date)}</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">{note.note_type}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{note.patient_name || 'Unnamed'}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${note.status === 'draft' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'}`}>
                                                        {note.status || 'Draft'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }} className="text-slate-400 dark:text-slate-500 hover:text-error dark:hover:text-red-400 transition-colors p-2">
                                                        <span className="material-symbols-outlined text-lg">delete</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <aside className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3">
                                    <span className="px-2 py-1 bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-400 text-[10px] font-bold rounded uppercase tracking-wider">AI Powered</span>
                                </div>
                                <h3 className="text-base font-bold font-headline text-slate-900 dark:text-white mb-2">Transcribe Visit</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-label leading-relaxed">Upload audio from patient encounter for automated clinical note generation.</p>
                                
                                {isProcessingAudio ? (
                                    <div className="border-2 border-dashed border-primary/30 dark:border-primary/50 bg-primary/5 dark:bg-primary/10 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary dark:border-blue-400 mb-4"></div>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">AI is analyzing audio...</span>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                                        {/* IMPORTANT: We are passing the handler here so audio works! */}
                                        <AudioInputHandler onAudioSubmit={handleAudioSubmit} />
                                    </div>
                                )}
                            </div>
                        </aside>
                    </div>
                )}
            </div>
        </div>
    );
}