import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, User, Calendar, FileText, Download, ChevronRight, Pill } from 'lucide-react';

interface Visit {
  visitId: string;
  visitDate: Date;
  category: string;
  diagnosis: string;
  prescriptions: string[];
}

interface Patient {
  id: string;
  name: string;
  lastVisit: Date;
  visits: Visit[];
}

export default function VisitHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  // Mock visit history data with categories
  const patients: Patient[] = [
    {
      id: 'P123456',
      name: 'John Doe',
      lastVisit: new Date('2024-12-16T10:00:00'),
      visits: [
        {
          visitId: 'V1',
          visitDate: new Date('2024-12-16T10:00:00'),
          category: 'General',
          diagnosis: 'Routine checkup - All vitals normal',
          prescriptions: ['Multivitamin - Once daily for 30 days', 'Vitamin D3 - Once weekly']
        },
        {
          visitId: 'V2',
          visitDate: new Date('2024-12-01T14:30:00'),
          category: 'General',
          diagnosis: 'Seasonal allergies',
          prescriptions: ['Cetirizine 10mg - Once daily for 7 days', 'Nasal spray - Twice daily']
        }
      ]
    },
    {
      id: 'P789012',
      name: 'Jane Smith',
      lastVisit: new Date('2024-12-15T15:30:00'),
      visits: [
        {
          visitId: 'V3',
          visitDate: new Date('2024-12-15T15:30:00'),
          category: 'Cardiology',
          diagnosis: 'Follow-up consultation - Blood pressure monitoring',
          prescriptions: ['Amlodipine 5mg - Once daily', 'Continue low-salt diet']
        }
      ]
    },
    {
      id: 'P345678',
      name: 'Robert Johnson',
      lastVisit: new Date('2024-12-14T09:00:00'),
      visits: [
        {
          visitId: 'V4',
          visitDate: new Date('2024-12-14T09:00:00'),
          category: 'General',
          diagnosis: 'Mild fever and headache',
          prescriptions: ['Paracetamol 500mg - Thrice daily for 3 days', 'Rest and hydration']
        }
      ]
    }
  ].sort((a, b) => b.lastVisit.getTime() - a.lastVisit.getTime());

  // Check if we came from search with a patient ID
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const patientId = params.get('patientId');
    if (patientId) {
      const patient = patients.find(p => p.id === patientId);
      if (patient) {
        setSelectedPatient(patient);
      }
    }
  }, [location]);

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

  const handleGenerateReport = () => {
    if (dateRange.from && dateRange.to) {
      // Generate report logic here
      alert(`Generating report from ${dateRange.from} to ${dateRange.to}`);
      setShowReportModal(false);
      setDateRange({ from: '', to: '' });
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isYesterday = (date: Date) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.toDateString() === yesterday.toDateString();
  };

  const getVisitDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <button 
            onClick={() => selectedPatient ? setSelectedPatient(null) : navigate('/doctor-dashboard')} 
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg text-gray-800">
              {selectedPatient ? selectedPatient.name : 'Visit History'}
            </h1>
          </div>
          {!selectedPatient && (
            <button 
              onClick={() => setShowReportModal(true)}
              className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm hover:bg-blue-600 flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              Generate Report
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto p-4 pt-6 space-y-6">
        {!selectedPatient ? (
          <>
            {/* Quick Tracking */}
            <div className="grid grid-cols-2 gap-3">
              <button className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-gray-800">{patients.filter(p => isToday(p.lastVisit)).length}</p>
                    <p className="text-xs text-gray-500">Today</p>
                  </div>
                </div>
              </button>
              <button className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-gray-800">{patients.filter(p => isYesterday(p.lastVisit)).length}</p>
                    <p className="text-xs text-gray-500">Yesterday</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Patient List */}
            <div>
              <h3 className="text-gray-700 mb-3">Previous Patients</h3>
              <div className="space-y-3">
                {patients.map(patient => (
                  <button
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <p className="text-gray-800">{patient.name}</p>
                          <p className="text-xs text-gray-500">
                            Last visit: {getVisitDateLabel(patient.lastVisit)}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Patient Detail View */
          <div className="space-y-4">
            {/* Patient Info */}
            <div className="bg-white rounded-2xl p-5 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl text-gray-800">{selectedPatient.name}</h2>
                  <p className="text-sm text-gray-500">{selectedPatient.id}</p>
                </div>
              </div>
            </div>

            {/* Visit History */}
            <div>
              <h3 className="text-gray-700 mb-3">All Visits ({selectedPatient.visits.length})</h3>
              <div className="space-y-3">
                {selectedPatient.visits.map(visit => (
                  <div key={visit.visitId} className="bg-white rounded-xl p-5 shadow-sm">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <p className="text-sm text-gray-500">
                            {visit.visitDate.toLocaleDateString('en-US', { 
                              weekday: 'short',
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </p>
                          <span className={`px-3 py-1 rounded-lg text-xs ${getCategoryColor(visit.category)}`}>
                            {visit.category}
                          </span>
                        </div>
                        <p className="text-gray-800 mt-1">{visit.diagnosis}</p>
                      </div>
                    </div>

                    {/* Prescriptions */}
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Pill className="w-4 h-4 text-blue-600" />
                        <p className="text-sm text-gray-600">Prescriptions</p>
                      </div>
                      <ul className="space-y-1 ml-6">
                        {visit.prescriptions.map((prescription, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-blue-400 mt-1">•</span>
                            <span>{prescription}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Generate Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6">
            <h2 className="text-xl text-gray-800 mb-4">Generate Visit Report</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">From Date</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">To Date</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500">
                This will generate a PDF report containing all patient visits, diagnoses, and prescriptions within the selected date range.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setDateRange({ from: '', to: '' });
                  }}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateReport}
                  disabled={!dateRange.from || !dateRange.to}
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Download Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}