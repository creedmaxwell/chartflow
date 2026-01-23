import { useState } from 'react';
import  supabase  from '../lib/supabase'

// Simple patient selector for now
function PatientSelector({ selectedPatient, onSelect }) {
  const mockPatients = [
    { id: 1, name: "John Smith", dob: "1985-03-15" },
    { id: 2, name: "Sarah Johnson", dob: "1992-07-22" },
    { id: 3, name: "Mike Williams", dob: "1978-11-08" }
  ];

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Patient
      </label>
      <select 
        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        value={selectedPatient?.id || ''}
        onChange={(e) => {
          const patient = mockPatients.find(p => p.id === parseInt(e.target.value));
          onSelect(patient);
        }}
      >
        <option value="">Choose a patient...</option>
        {mockPatients.map(patient => (
          <option key={patient.id} value={patient.id}>
            {patient.name} - DOB: {patient.dob}
          </option>
        ))}
      </select>
    </div>
  );
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
        <h3 className="font-semibold text-blue-900">Patient: {patient.name}</h3>
        <p className="text-sm text-blue-700">DOB: {patient.dob}</p>
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
function SavedNotes({ notes, onDelete }) {
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
      {notes.map((note, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h4 className="font-semibold text-gray-900">{note.patient.name}</h4>
              <p className="text-sm text-gray-600">{note.date}</p>
            </div>
            <button
              onClick={() => onDelete(index)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Delete
            </button>
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
  const [currentNote, setCurrentNote] = useState({
    chiefComplaint: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });
  const [savedNotes, setSavedNotes] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSaveNote = async () => {
    if (!selectedPatient) {
      alert('Please select a patient');
      return;
    }

    if (!currentNote.chiefComplaint.trim()) {
      alert('Please add at least a chief complaint');
      return;
    }

    const noteToSave = {
      ...currentNote,
      patient: selectedPatient,
      date: new Date().toLocaleDateString()
    };

    const { data, error } = await supabase
      .from('notes')
      .insert([
        { 
          appointmend_id: 'some id',
          subjective: { text: currentNote.subjective }, 
          objective: { text: currentNote.objective }, 
          assessment: { text: currentNote.assessment }, 
          plan: { text: currentNote.plan },
          note_type: 'SOAP',
          status: 'draft',
          generated_by: 'manual',
        },
      ])
      .select();
      
    if (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note: ' + error.message);
      return;
    }

    console.log('Saved note:', data);

    setSavedNotes([noteToSave, ...savedNotes]);
    
    // Reset form
    setCurrentNote({
      chiefComplaint: '',
      subjective: '',
      objective: '',
      assessment: '',
      plan: ''
    });
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleDeleteNote = (index) => {
    setSavedNotes(savedNotes.filter((_, i) => i !== index));
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
          {/* Left Column - Create Note */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Create New Note</h2>
            
            <PatientSelector 
              selectedPatient={selectedPatient}
              onSelect={setSelectedPatient}
            />
            
            <NoteEditor 
              patient={selectedPatient}
              note={currentNote}
              onChange={setCurrentNote}
            />

            {selectedPatient && (
              <div className="mt-6">
                <button
                  onClick={handleSaveNote}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  Save Note
                </button>
              </div>
            )}

            {showSuccess && (
              <div className="mt-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                Note saved successfully!
              </div>
            )}
          </div>

          {/* Right Column - Saved Notes */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <SavedNotes notes={savedNotes} onDelete={handleDeleteNote} />
          </div>
        </div>
      </div>
    </div>
  );
}