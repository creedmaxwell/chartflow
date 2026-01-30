import { useEffect, useState } from 'react';
import supabase from '../lib/supabase'

// Simple patient selector for now
function PatientSelector({ selectedPatient, onSelect }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  // get patients from supabase
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .order('last_name');
        if (error) throw error;
        setPatients(data);
      } catch (error) {
        console.error('Error fetching patients:', error);
        alert('Failed to load patients');
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Patient
      </label>
      <select 
        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        value={selectedPatient?.id || ''}
        onChange={(e) => {
          const patient = patients.find(p => p.id == e.target.value);
          onSelect(patient);
        }}
        disabled={loading}
      >
        <option value="">{loading ? 'Loading patients...' : 'Choose a patient...'}</option>
        {patients.map(patient => (
          <option key={patient.id} value={patient.id}>
            {patient.first_name} {patient.last_name} - DOB: {patient.date_of_birth}
          </option>
        ))}
      </select>
    </div>
  );
}

function AppointmentSelector({ selectedAppointment, selectedPatient, onSelect }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  // fetch appointments by patient
  useEffect(() => {
    if (!selectedPatient) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('patient_id', selectedPatient.id)
          .order('appointment_date');
        if (error) throw error;
        setAppointments(data);
      } catch (error) {
        console.error('Error fetching appointments:', error);
        alert('Failed to load appointments');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [selectedPatient]);

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Appointment
      </label>
      <select 
        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        value={selectedAppointment?.id || ''}
        onChange={(e) => {
          const appointment = appointments.find(p => p.id == e.target.value);
          onSelect(appointment);
        }}
        disabled={loading || !selectedPatient}
      >
        <option value="">{loading ? 'Loading appointments...' : 'Choose an appointment...'}</option>
        {appointments.map(appointment => (
          <option key={appointment.id} value={appointment.id}>
            {appointment.appointment_date} - Type: {appointment.appointment_type}
          </option>
        ))}
      </select>
    </div>
  )
}

// The main note editor component
function NoteEditor({ patient, note, onChange }) {
  if (!patient) {
    return (
      <div className="text-center py-12 text-gray-500">
        Select a patient to create a note
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-900">Patient: {patient.first_name} {patient.last_name}</h3>
        <p className="text-sm text-blue-700">DOB: {patient.date_of_birth}</p>
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
              <h4 className="font-semibold text-gray-900">{note.patient.first_name} {note.patient.last_name}</h4>
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
            <p><span className="font-medium">S:</span> {note.subjective}</p>
            <p><span className="font-medium">O:</span> {note.objective}</p>
            <p><span className="font-medium">A:</span> {note.assessment}</p>
            <p><span className="font-medium">P:</span> {note.plan}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Main App Component
export default function DentalNotesApp() {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [editingNote, setEditingNote] = useState(null);

  const [currentNote, setCurrentNote] = useState({
    chiefComplaint: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });
  const [savedNotes, setSavedNotes] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // fetch notes when patient changes
  useEffect(() => {
    if (!selectedPatient) {
      setSavedNotes([]);
      return;
    }

    const fetchNotes = async () => {
      try {
        setLoadingNotes(true);
        const { data, error } = await supabase
          .from('notes')
          .select(`
            *,
            appointments (
              *
            )
          `)
          .eq('appointment_id', 'in', `(select id from appointments where patient_id = '${selectedPatient.id}')`)
          .order('created_at', { ascending: false });
        
        // Alternative simpler query if above doesn't work:
        // First get all appointments for this patient
        const { data: appointments } = await supabase
          .from('appointments')
          .select('id')
          .eq('patient_id', selectedPatient.id);
        
        const appointmentIds = appointments?.map(a => a.id) || [];
        
        if (appointmentIds.length === 0) {
          setSavedNotes([]);
          setLoadingNotes(false);
          return;
        }

        const { data: notesData, error: notesError } = await supabase
          .from('notes')
          .select('*')
          .in('appointment_id', appointmentIds)
          .order('created_at', { ascending: false });

        if (notesError) throw notesError;

        const transformedNotes = notesData.map(note => ({
          ...note,
          patient: selectedPatient,
          chiefComplaint: note.chief_complaint || '',
          subjective: note.subjective?.text || '',
          objective: note.objective?.text || '',
          assessment: note.assessment?.text || '',
          plan: note.plan?.text || '',
          date: new Date(note.created_at).toLocaleDateString()
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
  }, [selectedPatient]);

  const handleSaveNote = async () => {
    if (!selectedPatient) {
      alert('Please select a patient');
      return;
    }

    if (!selectedAppointment) {
      alert('Please select an appointment');
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
            chief_complaint: currentNote.chiefComplaint,
            subjective: { text: currentNote.subjective },
            objective: { text: currentNote.objective },
            assessment: { text: currentNote.assessment },
            plan: { text: currentNote.plan },
          })
          .eq('id', editingNote.id)
          .select();

        if (error) throw error;

        console.log('Updated note:', data);

        // Update in local state
        setSavedNotes(savedNotes.map(note => 
          note.id === editingNote.id 
            ? {
                ...note,
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
            appointment_id: selectedAppointment.id,
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

        // Add to local state
        const newNote = {
          ...data[0],
          patient: selectedPatient,
          chiefComplaint: currentNote.chiefComplaint,
          subjective: currentNote.subjective,
          objective: currentNote.objective,
          assessment: currentNote.assessment,
          plan: currentNote.plan,
          date: new Date().toLocaleDateString()
        };

        setSavedNotes([newNote, ...savedNotes]);
      }

      // Reset form
      setCurrentNote({
        chiefComplaint: '',
        subjective: '',
        objective: '',
        assessment: '',
        plan: ''
      });
      setSelectedAppointment(null);

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
        chiefComplaint: note.chiefComplaint || note.chief_complaint || '',
        subjective: note.subjective?.text || note.subjective || '',
        objective: note.objective?.text || note.objective || '',
        assessment: note.assessment?.text || note.assessment || '',
        plan: note.plan?.text || note.plan || ''
      });

      // Fetch and set the appointment
      if (note.appointment_id) {
        const { data: appointmentData, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', note.appointment_id)
          .single();

        if (!error && appointmentData) {
          setSelectedAppointment(appointmentData);
        }
      }

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
      chiefComplaint: '',
      subjective: '',
      objective: '',
      assessment: '',
      plan: ''
    });
    setSelectedAppointment(null);
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

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

            {/* Hide dropdowns when editing */}
            {!editingNote && (
              <>
                <PatientSelector
                  selectedPatient={selectedPatient}
                  onSelect={setSelectedPatient}
                />

                {selectedPatient && (
                  <AppointmentSelector
                    selectedAppointment={selectedAppointment}
                    selectedPatient={selectedPatient}
                    onSelect={setSelectedAppointment}
                  />
                )}
              </>
            )}

            {/* Show patient info when editing */}
            {editingNote && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Editing note for:</p>
                <p className="text-lg font-semibold text-blue-900">
                  {selectedPatient?.first_name} {selectedPatient?.last_name}
                </p>
              </div>
            )}

            <NoteEditor
              patient={selectedPatient}
              note={currentNote}
              onChange={setCurrentNote}
            />

            {selectedPatient && (
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
            )}

            {showSuccess && (
              <div className="mt-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                Note {editingNote ? 'updated' : 'saved'} successfully!
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