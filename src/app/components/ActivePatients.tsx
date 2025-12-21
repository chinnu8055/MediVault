import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Users, CheckCircle, Clock, X } from 'lucide-react';

interface PatientAccess {
  id: string;
  patientName: string;
  patientId: string;
  accessCode: string;
  expiresAt: Date;
}

export default function ActivePatients() {
  const navigate = useNavigate();

  const [activePatients, setActivePatients] = useState<PatientAccess[]>([
    {
      id: '1',
      patientName: 'John Doe',
      patientId: 'P123456',
      accessCode: 'ABC-123-XYZ',
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
    },
    {
      id: '2',
      patientName: 'Jane Smith',
      patientId: 'P789012',
      accessCode: 'DEF-456-UVW',
      expiresAt: new Date(Date.now() + 20 * 60 * 60 * 1000) // 20 hours from now
    }
  ]);

  const getTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      return `${Math.floor(hours / 24)} days left`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    } else {
      return `${minutes}m left`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button 
            onClick={() => navigate('/doctor-dashboard')}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg text-gray-800">Active Patients</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 pt-6 space-y-6">
        {/* Summary Card */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-400 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8" />
            <div>
              <h2 className="text-2xl">{activePatients.length}</h2>
              <p className="text-sm text-blue-50">Current Accessible Patients</p>
            </div>
          </div>
        </div>

        {/* Active Patients List */}
        <div>
          <h3 className="text-gray-700 mb-3">Patients with Active Access</h3>
          <div className="space-y-3">
            {activePatients.length > 0 ? (
              activePatients.map(patient => (
                <div
                  key={patient.id}
                  onClick={() => navigate(`/view-patient-records/${patient.patientId}`)}
                  className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                        <User className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-gray-800">{patient.patientName}</p>
                        <p className="text-xs text-gray-500">{patient.patientId}</p>
                      </div>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>

                  <div className="flex items-center gap-2 text-sm mb-3">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{getTimeRemaining(patient.expiresAt)}</span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePatients(activePatients.filter(p => p.id !== patient.id));
                      }}
                      className="flex-1 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm hover:bg-red-100 flex items-center justify-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Close Access
                    </button>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 px-3 py-2 rounded-lg bg-blue-50 text-blue-600 text-sm hover:bg-blue-100"
                    >
                      Request Extension
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl p-5 shadow-sm">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No active patients</p>
                <p className="text-sm text-gray-400 mt-1">Enter an access code to view records</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
