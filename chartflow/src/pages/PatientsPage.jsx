import { useState, useEffect } from 'react';
import supabase from '../lib/supabase';

function AddPatientModal({ isOpen, onClose, onSuccess, editingPatient }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    phone: '',
    email: '',
    medical_history: {
      allergies: [],
      conditions: [],
      medications: []
    },
    insurance_info: {
      provider: '',
      policy_number: '',
      group_number: ''
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingPatient) {
      setFormData({
        first_name: editingPatient.first_name || '',
        last_name: editingPatient.last_name || '',
        date_of_birth: editingPatient.date_of_birth || '',
        phone: editingPatient.phone || '',
        email: editingPatient.email || '',
        medical_history: editingPatient.medical_history || {
          allergies: [],
          conditions: [],
          medications: []
        },
        insurance_info: editingPatient.insurance_info || {
          provider: '',
          policy_number: '',
          group_number: ''
        }
      });
    }
  }, [editingPatient]);

  const handleSubmit = async () => {
    if (!formData.first_name || !formData.last_name || !formData.date_of_birth) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();

      if (editingPatient) {
        const { data, error } = await supabase
          .from('patients')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            date_of_birth: formData.date_of_birth,
            phone: formData.phone,
            email: formData.email,
            medical_history: formData.medical_history,
            insurance_info: formData.insurance_info
          })
          .eq('id', editingPatient.id)
          .select()
          .single();

        if (error) throw error;
        onSuccess(data);
      } else {
        const { data, error } = await supabase
          .from('patients')
          .insert([{
            user_id: user.user.id,
            first_name: formData.first_name,
            last_name: formData.last_name,
            date_of_birth: formData.date_of_birth,
            phone: formData.phone,
            email: formData.email,
            medical_history: formData.medical_history,
            insurance_info: formData.insurance_info
          }])
          .select()
          .single();

        if (error) throw error;
        onSuccess(data);
      }

      onClose();
      setFormData({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        phone: '',
        email: '',
        medical_history: { allergies: [], conditions: [], medications: [] },
        insurance_info: { provider: '', policy_number: '', group_number: '' }
      });

    } catch (error) {
      console.error('Error saving patient:', error);
      alert('Failed to save patient: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 my-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {editingPatient ? 'Edit Patient' : 'Add New Patient'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                required
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth *
            </label>
            <input
              type="date"
              required
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData.date_of_birth}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="patient@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-3">Insurance Information</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Insurance Provider
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Blue Cross Blue Shield"
                  value={formData.insurance_info.provider}
                  onChange={(e) => setFormData({
                    ...formData,
                    insurance_info: { ...formData.insurance_info, provider: e.target.value }
                  })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Policy Number
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.insurance_info.policy_number}
                    onChange={(e) => setFormData({
                      ...formData,
                      insurance_info: { ...formData.insurance_info, policy_number: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group Number
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.insurance_info.group_number}
                    onChange={(e) => setFormData({
                      ...formData,
                      insurance_info: { ...formData.insurance_info, group_number: e.target.value }
                    })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-6 border-t mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? 'Saving...' : editingPatient ? 'Update Patient' : 'Add Patient'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PatientCard({ patient, onEdit, onDelete, onViewDetails }) {
  const calculateAge = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-xl font-semibold text-blue-600">
              {patient.first_name[0]}{patient.last_name[0]}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {patient.first_name} {patient.last_name}
            </h3>
            <p className="text-sm text-gray-600">
              {calculateAge(patient.date_of_birth)} years old
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {patient.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>📞</span>
            <span>{patient.phone}</span>
          </div>
        )}
        {patient.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>✉️</span>
            <span>{patient.email}</span>
          </div>
        )}
        {patient.insurance_info?.provider && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>🏥</span>
            <span>{patient.insurance_info.provider}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-3 border-t">
        <button
          onClick={() => onViewDetails(patient)}
          className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          View Details
        </button>
        <button
          onClick={() => onEdit(patient)}
          className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(patient.id)}
          className="px-3 py-2 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function PatientDetailsModal({ patient, isOpen, onClose }) {
  if (!isOpen || !patient) return null;

  const calculateAge = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-semibold text-blue-600">
                {patient.first_name[0]}{patient.last_name[0]}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {patient.first_name} {patient.last_name}
              </h2>
              <p className="text-gray-600">
                {calculateAge(patient.date_of_birth)} years old • DOB: {patient.date_of_birth}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">📞 Phone:</span>
                <span className="font-medium">{patient.phone || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">✉️ Email:</span>
                <span className="font-medium">{patient.email || 'Not provided'}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Insurance Information</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Provider:</span>
                <span className="font-medium">{patient.insurance_info?.provider || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Policy #:</span>
                <span className="font-medium">{patient.insurance_info?.policy_number || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Group #:</span>
                <span className="font-medium">{patient.insurance_info?.group_number || 'Not provided'}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Medical History</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-600 text-sm">
                {patient.medical_history && Object.keys(patient.medical_history).length > 0
                  ? 'Medical history available in patient records'
                  : 'No medical history recorded'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [detailsPatient, setDetailsPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('last_name');

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
      alert('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPatient = (newPatient) => {
    setPatients([newPatient, ...patients]);
  };

  const handleUpdatePatient = (updatedPatient) => {
    setPatients(patients.map(p => p.id === updatedPatient.id ? updatedPatient : p));
    setEditingPatient(null);
  };

  const handleDeletePatient = async (patientId) => {
    if (!confirm('Are you sure you want to delete this patient? This will also delete all associated appointments and notes.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);

      if (error) throw error;

      setPatients(patients.filter(p => p.id !== patientId));
    } catch (error) {
      console.error('Error deleting patient:', error);
      alert('Failed to delete patient: ' + error.message);
    }
  };

  const handleEdit = (patient) => {
    setEditingPatient(patient);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPatient(null);
  };

  const filteredPatients = patients.filter(patient =>
    `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading patients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Patients</h1>
              <p className="text-gray-600 mt-1">Manage your patient records</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              + Add Patient
            </button>
          </div>

          <div className="mt-4">
            <input
              type="text"
              placeholder="Search patients by name, email, or phone..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="mt-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Total Patients</p>
              <p className="text-3xl font-bold text-blue-900">{patients.length}</p>
            </div>
          </div>
        </div>

        {filteredPatients.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? 'No patients found' : 'No patients yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms' 
                : 'Add your first patient to get started'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Patient
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatients.map(patient => (
              <PatientCard
                key={patient.id}
                patient={patient}
                onEdit={handleEdit}
                onDelete={handleDeletePatient}
                onViewDetails={setDetailsPatient}
              />
            ))}
          </div>
        )}

        <AddPatientModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSuccess={editingPatient ? handleUpdatePatient : handleAddPatient}
          editingPatient={editingPatient}
        />

        <PatientDetailsModal
          patient={detailsPatient}
          isOpen={!!detailsPatient}
          onClose={() => setDetailsPatient(null)}
        />
      </div>
    </div>
  );
}