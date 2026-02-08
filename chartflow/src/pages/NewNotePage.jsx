import { useEffect, useState } from 'react';
import supabase from '../lib/supabase'

function CustomDateSelector({ value, onChange }) {
  // Parse the ISO date string (YYYY-MM-DD) or get today's date
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
    // Format as YYYY-MM-DD for PostgreSQL date type
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
    <div className="p-6 max-w-md mx-auto">
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

      {month && day && year && (
        <p className="mt-4 text-gray-700 font-medium">
          Selected: {months[month - 1]} {day}, {year}
        </p>
      )}
    </div>
  );
}

// The main note editor component
function NoteEditor({ note, onChange }) {
  return (
    <div className="space-y-6">
    <div>
      <label className='block text-sm font-medium text-gray-700 mb-2'>
        Patient Name
      </label>
      <input
          type="text"
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., John Doe"
          value={note.patientName}
          onChange={(e) => onChange({ ...note, patientName: e.target.value })}
        />
    </div>
    <div>
      <label className='block text-sm font-medium text-gray-700 mb-2'>
        Date
      </label>
      <CustomDateSelector value={note.date} onChange={(date) => onChange({ ...note, date })}/>
    </div>
      {/* Chief Complaint */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Chief Complaint
        </label>
        <input
          type="text"
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., Pain in lower right molar"
          value={note.chiefComplaint}
          onChange={(e) => onChange({ ...note, chiefComplaint: e.target.value })}
        />
      </div>

      {/* Subjective */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Subjective (S)
        </label>
        <textarea
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
          placeholder="Patient's description of symptoms, history..."
          value={note.subjective}
          onChange={(e) => onChange({ ...note, subjective: e.target.value })}
        />
      </div>

      {/* Objective */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Objective (O)
        </label>
        <textarea
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
          placeholder="Clinical findings, exam results..."
          value={note.objective}
          onChange={(e) => onChange({ ...note, objective: e.target.value })}
        />
      </div>

      {/* Assessment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Assessment (A)
        </label>
        <textarea
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
          placeholder="Diagnosis, interpretation..."
          value={note.assessment}
          onChange={(e) => onChange({ ...note, assessment: e.target.value })}
        />
      </div>

      {/* Plan */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Plan (P)
        </label>
        <textarea
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
          placeholder="Treatment plan, next steps..."
          value={note.plan}
          onChange={(e) => onChange({ ...note, plan: e.target.value })}
        />
      </div>
    </div>
  );
}

// Preview of saved notes
function SavedNotes({ notes, onEdit, onDelete }) {
  if (notes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No saved notes yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Saved Notes</h3>
      {notes.map((note) => (
        <div key={note.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h4 className="font-semibold text-gray-900">{note.patientName}</h4>
              <p className="text-sm text-gray-600">{note.date}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(note)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(note.id)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Chief Complaint:</span> {note.chiefComplaint}</p>
            <p><span className="font-medium">S:</span> {typeof note.subjective === 'object' ? note.subjective?.text : note.subjective}</p>
            <p><span className="font-medium">O:</span> {typeof note.objective === 'object' ? note.objective?.text : note.objective}</p>
            <p><span className="font-medium">A:</span> {typeof note.assessment === 'object' ? note.assessment?.text : note.assessment}</p>
            <p><span className="font-medium">P:</span> {typeof note.plan === 'object' ? note.plan?.text : note.plan}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Main App Component
export default function DentalNotesApp() {
  const [editingNote, setEditingNote] = useState(null);
  const [user, setUser] = useState(null);

  const [currentNote, setCurrentNote] = useState({
    patientName: '',
    date: '',
    chiefComplaint: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });
  const [savedNotes, setSavedNotes] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Get authenticated user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // fetch notes
  useEffect(() => {
    const fetchNotes = async () => {
      if (!user) return;

      try {
        setLoadingNotes(true);
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', {ascending: false});

        if (error) throw error;

        const transformedNotes = data.map(note => ({
          ...note,
          patientName: note.patient_name,
          chiefComplaint: note.chief_complaint || '',
          subjective: note.subjective?.text || note.subjective || '',
          objective: note.objective?.text || note.objective || '',
          assessment: note.assessment?.text || note.assessment || '',
          plan: note.plan?.text || note.plan || ''
        }));

        setSavedNotes(transformedNotes);
      } catch (error) {
        console.error('Error fetching notes:', error);
        alert('Failed to load notes');
      } finally {
        setLoadingNotes(false);
      }
    };
    fetchNotes();
  }, [user]);

  const handleSaveNote = async () => {
    if (!user) {
      alert('Please log in to save notes');
      return;
    }

    if (!currentNote.patientName.trim()) {
      alert('Please name a patient');
      return;
    }

    if (!currentNote.date.trim()) {
      alert('Please select a date');
      return;
    }

    if (!currentNote.chiefComplaint.trim()) {
      alert('Please add at least a chief complaint');
      return;
    }

    try {
      if (editingNote) {
        // UPDATE existing note
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
          })
          .eq('id', editingNote.id)
          .eq('user_id', user.id)
          .select();

        if (error) throw error;

        console.log('Updated note:', data);

        // Update in local state
        setSavedNotes(savedNotes.map(note =>
          note.id === editingNote.id
            ? {
              ...note,
              ...data[0],
              patientName: currentNote.patientName,
              date: currentNote.date,
              chiefComplaint: currentNote.chiefComplaint,
              subjective: currentNote.subjective,
              objective: currentNote.objective,
              assessment: currentNote.assessment,
              plan: currentNote.plan,
            }
            : note
        ));

        // Reset editing state
        setEditingNote(null);
      } else {
        // CREATE new note
        const { data, error } = await supabase
          .from('notes')
          .insert([{
            user_id: user.id,
            patient_name: currentNote.patientName,
            date: currentNote.date,
            chief_complaint: currentNote.chiefComplaint,
            subjective: { text: currentNote.subjective },
            objective: { text: currentNote.objective },
            assessment: { text: currentNote.assessment },
            plan: { text: currentNote.plan },
            note_type: 'SOAP',
            status: 'draft',
            generated_by: 'manual',
          }])
          .select();

        if (error) throw error;

        console.log('Saved note:', data);

        // Add to local state with proper transformation
        const newNote = {
          ...data[0],
          patientName: data[0].patient_name,
          chiefComplaint: data[0].chief_complaint,
          subjective: data[0].subjective?.text || data[0].subjective || '',
          objective: data[0].objective?.text || data[0].objective || '',
          assessment: data[0].assessment?.text || data[0].assessment || '',
          plan: data[0].plan?.text || data[0].plan || ''
        };

        setSavedNotes([newNote, ...savedNotes]);
      }

      // Reset form
      const today = new Date();
      const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      setCurrentNote({
        patientName: '',
        date: dateString,
        chiefComplaint: '',
        subjective: '',
        objective: '',
        assessment: '',
        plan: ''
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note: ' + error.message);
    }
  };

  const handleEditNote = async (note) => {
    try {
      // Load note data into form
      setCurrentNote({
        patientName: note.patientName || note.patient_name || '',
        date: note.date || '',
        chiefComplaint: note.chiefComplaint || note.chief_complaint || '',
        subjective: note.subjective?.text || note.subjective || '',
        objective: note.objective?.text || note.objective || '',
        assessment: note.assessment?.text || note.assessment || '',
        plan: note.plan?.text || note.plan || ''
      });

      // Set editing state
      setEditingNote(note);

    } catch (error) {
      console.error('Error loading note for editing:', error);
      alert('Failed to load note');
    }
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setCurrentNote({
      patientName: '',
      date: '',
      chiefComplaint: '',
      subjective: '',
      objective: '',
      assessment: '',
      plan: ''
    });
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (error) throw error;

      console.log('Deleted note');

      setSavedNotes(savedNotes.filter((note) => note.id !== noteId));
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Error deleting note: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Dental Notes</h1>
          <p className="text-gray-600 mt-1">Create and manage patient notes</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Create/Edit Note */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              {editingNote ? 'Edit Note' : 'Create New Note'}
            </h2>

            {!user ? (
              <div className="text-center py-8 text-gray-500">
                Please log in to create notes
              </div>
            ) : (
              <div>
                <NoteEditor
                  note={currentNote}
                  onChange={setCurrentNote}
                />

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={handleSaveNote}
                    className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium transition-colors"
                  >
                    {editingNote ? 'Update Note' : 'Save Note'}
                  </button>

                  {editingNote && (
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {showSuccess && (
                  <div className="mt-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                    Note {editingNote ? 'updated' : 'saved'} successfully!
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Saved Notes */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            {loadingNotes ? (
              <div className="text-center py-8 text-gray-500">Loading notes...</div>
            ) : (
              <SavedNotes notes={savedNotes} onEdit={handleEditNote} onDelete={handleDeleteNote} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}