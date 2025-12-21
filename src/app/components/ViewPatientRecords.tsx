import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Plus, User, AlertCircle, Calendar, Upload, ListFilter, X, Stethoscope } from 'lucide-react';
import { useApp } from '../App';

interface Medicine {
  name: string;
  dosage: string;
  time: string[];
  duration: string;
}

interface DoctorVisit {
  id: string;
  date: string;
  doctor: string;
  category: string;
  diagnosis: string;
  prescription: string[];
  type: 'visit';
}

interface LabReport {
  id: string;
  name: string;
  date: string;
  category: string;
  type: 'report';
}

interface UserUpload {
  id: string;
  name: string;
  date: string;
  category: string;
  uploadedBy: string;
  type: 'userUpload';
}

type PatientRecord = DoctorVisit | LabReport | UserUpload;

export default function ViewPatientRecords() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const { user } = useApp();
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PatientRecord | null>(null);
  
  // Filter states
  const [typeFilter, setTypeFilter] = useState<'all' | 'report' | 'visit' | 'userUpload'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [visitData, setVisitData] = useState({
    category: '',
    diagnosis: '',
    medicines: [{ name: '', dosage: '', time: [] as string[], duration: '' }] as Medicine[]
  });

  const patientInfo = {
    name: 'John Doe',
    id: patientId || 'P123456',
    age: 35,
    gender: 'Male'
  };

  // Mock data with dates
  const labReports: LabReport[] = [
    { id: '1', name: 'Blood Test Report', date: '2024-12-14', category: 'General', type: 'report' },
    { id: '2', name: 'ECG Report', date: '2024-12-01', category: 'Cardiology', type: 'report' },
    { id: '3', name: 'X-Ray Scan', date: '2024-11-28', category: 'Orthopedic', type: 'report' },
    { id: '4', name: 'Dental X-Ray', date: '2024-11-15', category: 'Dental', type: 'report' }
  ];

  const doctorVisits: DoctorVisit[] = [
    {
      id: '1',
      date: '2024-12-11',
      doctor: 'Dr. Sarah Johnson',
      category: 'General',
      diagnosis: 'Seasonal allergies',
      prescription: ['Cetirizine 10mg - Once daily'],
      type: 'visit'
    },
    {
      id: '2',
      date: '2024-12-05',
      doctor: 'Dr. Michael Chen',
      category: 'Cardiology',
      diagnosis: 'Routine checkup',
      prescription: ['Continue regular exercise'],
      type: 'visit'
    },
    {
      id: '3',
      date: '2024-11-20',
      doctor: 'Dr. Sarah Johnson',
      category: 'General',
      diagnosis: 'Follow-up consultation',
      prescription: ['Continue current medication'],
      type: 'visit'
    }
  ];

  const userUploads: UserUpload[] = [
    { id: 'u1', name: 'Previous Dental X-Ray', date: '2023-08-15', category: 'Dental', uploadedBy: 'patient', type: 'userUpload' },
    { id: 'u2', name: 'Old Blood Report', date: '2023-06-20', category: 'General', uploadedBy: 'patient', type: 'userUpload' },
  ];

  // Combine all records and sort by date
  const allRecords: PatientRecord[] = [...labReports, ...doctorVisits, ...userUploads];
  
  // Apply filters
  const filteredRecords = allRecords
    .filter(record => {
      if (typeFilter !== 'all' && record.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && record.category.toLowerCase() !== categoryFilter) return false;
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Get unique categories from all records
  const allCategories = Array.from(new Set(allRecords.map(r => r.category)));

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'dental': return 'bg-blue-50 text-blue-600';
      case 'cardiology': return 'bg-red-50 text-red-600';
      case 'gynecology': return 'bg-pink-50 text-pink-600';
      case 'orthopedic': return 'bg-orange-50 text-orange-600';
      case 'general': return 'bg-green-50 text-green-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'report':
        return <span className="px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs">Report</span>;
      case 'visit':
        return <span className="px-2 py-1 rounded-md bg-green-100 text-green-700 text-xs">Visit</span>;
      case 'userUpload':
        return <span className="px-2 py-1 rounded-md bg-amber-100 text-amber-700 text-xs">Patient Upload</span>;
      default:
        return null;
    }
  };

  const addMedicine = () => {
    setVisitData({ 
      ...visitData, 
      medicines: [...visitData.medicines, { name: '', dosage: '', time: [], duration: '' }] 
    });
  };

  const updateMedicine = (index: number, field: keyof Medicine, value: any) => {
    const newMeds = [...visitData.medicines];
    newMeds[index] = { ...newMeds[index], [field]: value };
    setVisitData({ ...visitData, medicines: newMeds });
  };

  const toggleTimeOfDay = (index: number, timeOfDay: string) => {
    const newMeds = [...visitData.medicines];
    const times = newMeds[index].time;
    if (times.includes(timeOfDay)) {
      newMeds[index].time = times.filter(t => t !== timeOfDay);
    } else {
      newMeds[index].time = [...times, timeOfDay];
    }
    setVisitData({ ...visitData, medicines: newMeds });
  };

  const handleSubmitVisit = () => {
    if (visitData.category && visitData.diagnosis && 
        visitData.medicines.some(m => m.name.trim() && m.dosage && m.time.length > 0 && m.duration)) {
      // Submit prescription logic
      alert('Visit added successfully');
      setShowVisitModal(false);
      setVisitData({ category: '', diagnosis: '', medicines: [{ name: '', dosage: '', time: [], duration: '' }] });
    }
  };

  const activeFilterCount = (typeFilter !== 'all' ? 1 : 0) + (categoryFilter !== 'all' ? 1 : 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button 
            onClick={() => {
              if (selectedRecord) {
                setSelectedRecord(null);
              } else {
                navigate('/doctor-dashboard');
              }
            }}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg text-gray-800">
              {selectedRecord ? 'Record Details' : 'Patient Records'}
            </h1>
          </div>
          {!selectedRecord && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowFilterModal(true)}
                className="p-2 hover:bg-gray-100 rounded-full relative"
              >
                <ListFilter className="w-5 h-5 text-gray-600" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setShowVisitModal(true)}
                className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm hover:bg-blue-600 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Visit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 pt-6 space-y-6">
        {selectedRecord ? (
          /* Detail View */
          <div className="bg-white rounded-2xl p-6 shadow-md">
            {selectedRecord.type === 'report' && (
              <>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-xl text-gray-800">{selectedRecord.name}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(selectedRecord.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-sm ${getCategoryColor(selectedRecord.category)}`}>
                        {selectedRecord.category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Summary */}
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                  <div className="flex items-start gap-2 mb-3">
                    <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs text-purple-600">AI</span>
                    </div>
                    <p className="text-sm text-purple-900">Summary</p>
                  </div>
                  <p className="text-sm text-purple-800 leading-relaxed">
                    Blood glucose: <span className="bg-red-100 text-red-700 px-1 rounded">145 mg/dL (High)</span> - Monitoring needed. Cholesterol levels normal.
                  </p>
                  <div className="mt-3 pt-3 border-t border-purple-200 flex items-start gap-1">
                    <AlertCircle className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-purple-600 italic">
                      AI is not a medical professional. Consult your doctor for advice.
                    </p>
                  </div>
                </div>
              </>
            )}

            {selectedRecord.type === 'visit' && (
              <>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-xl text-gray-800">Doctor Visit</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(selectedRecord.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">{selectedRecord.doctor}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-sm ${getCategoryColor(selectedRecord.category)}`}>
                        {selectedRecord.category}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Diagnosis</p>
                    <p className="text-gray-800">{selectedRecord.diagnosis}</p>
                  </div>

                  {selectedRecord.prescription.length > 0 && (
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-sm text-blue-900 mb-2">Prescription</p>
                      <ul className="space-y-2">
                        {selectedRecord.prescription.map((med, idx) => (
                          <li key={idx} className="text-sm text-blue-800 flex items-start gap-2">
                            <span className="text-blue-400 mt-1">•</span>
                            <span>{med}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            )}

            {selectedRecord.type === 'userUpload' && (
              <>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-xl text-gray-800">{selectedRecord.name}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(selectedRecord.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                        <span className="inline-block mt-2 px-2 py-1 rounded text-xs bg-amber-50 text-amber-700">
                          Uploaded by Patient
                        </span>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-sm ${getCategoryColor(selectedRecord.category)}`}>
                        {selectedRecord.category}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-sm text-amber-900">
                    This document was uploaded by the patient and has not been verified by a healthcare provider.
                  </p>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Patient Info Card */}
            <div className="bg-white rounded-2xl p-5 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl text-gray-800">{patientInfo.name}</h2>
                  <p className="text-sm text-gray-500">{patientInfo.id}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500">Age</p>
                  <p className="text-gray-800">{patientInfo.age} years</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Gender</p>
                  <p className="text-gray-800">{patientInfo.gender}</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900">
                  You have full access to all patient data during this session
                </p>
              </div>
            </div>

            {/* Unified Records List */}
            <div>
              <h3 className="text-gray-700 mb-3">
                All Records 
                {activeFilterCount > 0 && (
                  <span className="text-sm text-gray-500 ml-2">
                    ({filteredRecords.length} filtered)
                  </span>
                )}
              </h3>
              <div className="space-y-3">
                {filteredRecords.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">No records found</p>
                    <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                  </div>
                ) : (
                  filteredRecords.map(record => (
                    <div
                      key={`${record.type}-${record.id}`}
                      onClick={() => setSelectedRecord(record)}
                      className={`bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                        record.type === 'userUpload' ? 'border-l-4 border-amber-400' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          record.type === 'report' ? 'bg-blue-50' :
                          record.type === 'visit' ? 'bg-green-50' :
                          'bg-amber-50'
                        }`}>
                          {record.type === 'visit' ? (
                            <Stethoscope className={`w-5 h-5 ${
                              record.type === 'visit' ? 'text-green-600' : ''
                            }`} />
                          ) : (
                            <FileText className={`w-5 h-5 ${
                              record.type === 'report' ? 'text-blue-600' :
                              record.type === 'userUpload' ? 'text-amber-600' :
                              'text-gray-600'
                            }`} />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-gray-800">
                                {record.type === 'visit' ? 'Doctor Visit' : record.name}
                              </p>
                              {record.type === 'visit' && (
                                <p className="text-sm text-gray-600 mt-1">{record.doctor}</p>
                              )}
                            </div>
                            {getTypeBadge(record.type)}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs text-gray-500">
                              {new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            <span className={`px-2 py-0.5 rounded-md text-xs ${getCategoryColor(record.category)}`}>
                              {record.category}
                            </span>
                            {record.type === 'userUpload' && (
                              <span className="px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700">
                                Patient Upload
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl text-gray-800">Filters</h2>
              <button 
                onClick={() => setShowFilterModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Type Filter */}
              <div>
                <label className="text-sm text-gray-700 mb-3 block">Filter by Type</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      checked={typeFilter === 'all'}
                      onChange={() => setTypeFilter('all')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-gray-800">All</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      checked={typeFilter === 'report'}
                      onChange={() => setTypeFilter('report')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-gray-800">Reports only</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      checked={typeFilter === 'visit'}
                      onChange={() => setTypeFilter('visit')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-gray-800">Doctor Visits only</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      checked={typeFilter === 'userUpload'}
                      onChange={() => setTypeFilter('userUpload')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-gray-800">Patient Uploads only</span>
                  </label>
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="text-sm text-gray-700 mb-3 block">Filter by Category</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      checked={categoryFilter === 'all'}
                      onChange={() => setCategoryFilter('all')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-gray-800">All categories</span>
                  </label>
                  {allCategories.map(cat => (
                    <label key={cat} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="category"
                        checked={categoryFilter === cat.toLowerCase()}
                        onChange={() => setCategoryFilter(cat.toLowerCase())}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-gray-800">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setTypeFilter('all');
                    setCategoryFilter('all');
                  }}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-500 text-white hover:bg-blue-600"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Visit Modal */}
      {showVisitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl text-gray-800 mb-4">Add Visit</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Category *</label>
                <select
                  value={visitData.category}
                  onChange={(e) => setVisitData({...visitData, category: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  <option value="Dental">Dental</option>
                  <option value="Gynecology">Gynecology</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Orthopedic">Orthopedic</option>
                  <option value="General">General</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Diagnosis *</label>
                <textarea
                  value={visitData.diagnosis}
                  onChange={(e) => setVisitData({...visitData, diagnosis: e.target.value})}
                  placeholder="Enter diagnosis"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-600">Medicines</label>
                  <button
                    onClick={addMedicine}
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Medicine
                  </button>
                </div>
                <div className="space-y-4">
                  {visitData.medicines.map((med, idx) => (
                    <div key={idx} className="p-4 border border-gray-200 rounded-xl space-y-3">
                      <input
                        type="text"
                        placeholder="Medicine name *"
                        value={med.name}
                        onChange={(e) => updateMedicine(idx, 'name', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Dosage (tablets) *</label>
                          <input
                            type="text"
                            placeholder="e.g., 1"
                            value={med.dosage}
                            onChange={(e) => updateMedicine(idx, 'dosage', e.target.value)}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Duration (days) *</label>
                          <input
                            type="text"
                            placeholder="e.g., 7"
                            value={med.duration}
                            onChange={(e) => updateMedicine(idx, 'duration', e.target.value)}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 mb-2 block">Time of Day *</label>
                        <div className="flex gap-2">
                          {['Morning', 'Afternoon', 'Night'].map(time => (
                            <button
                              key={time}
                              type="button"
                              onClick={() => toggleTimeOfDay(idx, time)}
                              className={`flex-1 px-3 py-2 rounded-lg text-xs transition-colors ${
                                med.time.includes(time)
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowVisitModal(false);
                    setVisitData({ category: '', diagnosis: '', medicines: [{ name: '', dosage: '', time: [], duration: '' }] });
                  }}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitVisit}
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-500 text-white hover:bg-blue-600"
                >
                  Add Visit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}