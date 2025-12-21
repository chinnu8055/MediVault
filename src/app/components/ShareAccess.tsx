import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Clock, CheckCircle, XCircle, AlertCircle, User, ShieldCheck } from 'lucide-react';

interface Access {
  id: string;
  code: string;
  duration: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'active' | 'expired';
}

interface ActiveDoctorAccess {
  id: string;
  doctorName: string;
  specialization: string;
  accessStartTime: Date;
  accessExpiryTime: Date;
  code: string;
}

export default function ShareAccess() {
  const navigate = useNavigate();
  const [showGenerate, setShowGenerate] = useState(false);
  const [duration, setDuration] = useState('1hour');

  const [accessCodes, setAccessCodes] = useState<Access[]>([
    {
      id: '1',
      code: 'ABC-123-XYZ',
      duration: '1 hour',
      createdAt: new Date('2024-12-16T10:00:00'),
      expiresAt: new Date('2024-12-16T11:00:00'),
      status: 'active'
    },
    {
      id: '2',
      code: 'DEF-456-UVW',
      duration: '1 day',
      createdAt: new Date('2024-12-15T09:00:00'),
      expiresAt: new Date('2024-12-16T09:00:00'),
      status: 'expired'
    }
  ]);

  // Mock active doctor access data
  const [activeDoctorAccess, setActiveDoctorAccess] = useState<ActiveDoctorAccess[]>([
    {
      id: '1',
      doctorName: 'Dr. Sarah Johnson',
      specialization: 'Cardiologist',
      accessStartTime: new Date('2024-12-16T10:00:00'),
      accessExpiryTime: new Date('2024-12-16T11:00:00'),
      code: 'ABC-123-XYZ'
    }
  ]);

  const handleGenerateCode = () => {
    if (duration) {
      const code = `${Math.random().toString(36).substr(2, 3).toUpperCase()}-${Math.random().toString(36).substr(2, 3)}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
      const now = new Date();
      const expiresAt = new Date(now);
      
      if (duration === '1hour') expiresAt.setHours(now.getHours() + 1);
      else if (duration === '1day') expiresAt.setDate(now.getDate() + 1);
      else if (duration === '1week') expiresAt.setDate(now.getDate() + 7);

      setAccessCodes([{
        id: Date.now().toString(),
        code,
        duration: duration === '1hour' ? '1 hour' : duration === '1day' ? '1 day' : '1 week',
        createdAt: now,
        expiresAt,
        status: 'active'
      }, ...accessCodes]);

      setShowGenerate(false);
      setDuration('1hour');
    }
  };

  const getTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
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

  const handleRevokeAccess = (accessId: string) => {
    if (confirm('Are you sure you want to revoke this doctor\'s access?')) {
      setActiveDoctorAccess(activeDoctorAccess.filter(a => a.id !== accessId));
      // Also update the access code status
      setAccessCodes(accessCodes.map(code => {
        const matchingAccess = activeDoctorAccess.find(a => a.id === accessId);
        if (matchingAccess && code.code === matchingAccess.code) {
          return { ...code, status: 'expired' as const };
        }
        return code;
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/patient-dashboard')} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg text-gray-800">Share Access</h1>
          </div>
          <button 
            onClick={() => setShowGenerate(true)}
            className="px-4 py-2 rounded-xl bg-purple-500 text-white text-sm hover:bg-purple-600"
          >
            Generate Code
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 pt-6 space-y-6">
        {/* Info Banner */}
        <div className="bg-purple-50 rounded-xl p-4 flex items-start gap-3 border border-purple-100">
          <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-purple-900">
            Access codes grant full access to all your medical data during the selected duration
          </p>
        </div>

        {/* Active Doctor Access - PRIMARY SECTION */}
        <div>
          <h3 className="text-gray-800 mb-3">Active Doctor Access</h3>
          <div className="space-y-3">
            {activeDoctorAccess.length === 0 ? (
              <div className="bg-white rounded-xl p-6 shadow-sm text-center">
                <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No active doctor access</p>
                <p className="text-xs text-gray-400 mt-1">Generate a code to share access with your doctor</p>
              </div>
            ) : (
              activeDoctorAccess.map(access => (
                <div key={access.id} className="bg-white rounded-xl p-5 shadow-md border-l-4 border-green-500">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-800">{access.doctorName}</p>
                      <p className="text-sm text-gray-500">{access.specialization}</p>
                    </div>
                    <span className="px-2 py-1 rounded-lg bg-green-50 text-green-700 text-xs flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Active
                    </span>
                  </div>

                  <div className="space-y-2 mb-4 bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Access Expires</span>
                      <span className="text-gray-800">{access.accessExpiryTime.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{getTimeRemaining(access.accessExpiryTime)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRevokeAccess(access.id)}
                    className="w-full px-4 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors text-sm"
                  >
                    End Access Now
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Access Codes */}
        <div>
          <h3 className="text-gray-700 mb-3">Active Access Codes</h3>
          <div className="space-y-3">
            {accessCodes.filter(a => a.status === 'active').length === 0 ? (
              <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                <p className="text-sm text-gray-500">No active access codes</p>
              </div>
            ) : (
              accessCodes.filter(a => a.status === 'active').map(access => (
                <div key={access.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xl text-gray-800 tracking-wider">{access.code}</p>
                        <p className="text-xs text-gray-500">Access Code</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{getTimeRemaining(access.expiresAt)}</span>
                    <span className="px-2 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs">
                      {access.duration}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Expired Codes - LESS PROMINENT */}
        {accessCodes.filter(a => a.status === 'expired').length > 0 && (
          <details className="bg-gray-50 rounded-xl p-4">
            <summary className="text-sm text-gray-600 cursor-pointer">
              Expired Access Codes ({accessCodes.filter(a => a.status === 'expired').length})
            </summary>
            <div className="space-y-2 mt-3">
              {accessCodes.filter(a => a.status === 'expired').map(access => (
                <div key={access.id} className="bg-white rounded-xl p-3 opacity-60">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center">
                      <XCircle className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-800 tracking-wider">{access.code}</p>
                      <p className="text-xs text-gray-500">Expired</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Generate Modal */}
      {showGenerate && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl text-gray-800 mb-4">Generate Access Code</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 mb-2 block">Access Duration</label>
                <div className="space-y-2">
                  {[
                    { value: '1hour', label: '1 Hour' },
                    { value: '1day', label: '1 Day' },
                    { value: '1week', label: '1 Week' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setDuration(opt.value)}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-colors text-left ${
                        duration === opt.value
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 text-gray-700 hover:border-purple-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowGenerate(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateCode}
                  disabled={!duration}
                  className="flex-1 px-4 py-3 rounded-xl bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}