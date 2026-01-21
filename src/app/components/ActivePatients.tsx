import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Users, CheckCircle, Clock, X, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface PatientAccess {
  id: string;
  patientName: string;
  patientId: string;
  accessCode: string;
  expiresAt: Date;
}

export default function ActivePatients() {
  const navigate = useNavigate();
  const [activePatients, setActivePatients] = useState<PatientAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const CACHE_KEY = 'activePatients_cache';

  // Fetch active patients on mount
  useEffect(() => {
    fetchActivePatients();
  }, []);

  const fetchActivePatients = async (forceRefresh = false) => {
    try {
      // Check cache first
      if (!forceRefresh) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, cacheExpiresAt } = JSON.parse(cached);
          const now = Date.now();
          
          // If cache hasn't expired yet, use it
          if (now < cacheExpiresAt) {
            const patients = data.map((p: any) => ({
              ...p,
              expiresAt: new Date(p.expiresAt)
            }));
            setActivePatients(patients);
            setLoading(false);
            return;
          }
        }
      }

      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const doctorId = sessionData.session?.user?.id;
      
      if (!doctorId) {
        setLoading(false);
        return;
      }

      // Much more efficient: Get all patients at once, then check access in parallel
      const { data: allPatients } = await supabase
        .from('user_profiles')
        .select('id, unique_id, name')
        .eq('role', 'patient');

      if (!allPatients || allPatients.length === 0) {
        setActivePatients([]);
        setLoading(false);
        return;
      }

      // Fetch access data for all patients in parallel
      const accessChecks = allPatients.map(patient =>
        supabase.functions.invoke('server', {
          headers: { 'X-Function-Path': '/access/share/active' },
          body: { patient_id: patient.id }
        }).then(({ data }) => ({ patient, data }))
      );

      const results = await Promise.all(accessChecks);

      console.log('Access check results:', results.map(r => ({
        patient: r.patient.name,
        hasActiveAccess: !!r.data?.active_access,
        activeAccessCount: r.data?.active_access?.length || 0,
        doctorIds: r.data?.active_access?.map((a: any) => a.claimed_by) || []
      })));

      const patientsWithAccess: PatientAccess[] = results
        .filter(({ data }) => {
          if (!data?.active_access || !Array.isArray(data.active_access)) return false;
          return data.active_access.some((access: any) => access.claimed_by === doctorId);
        })
        .map(({ patient, data }) => {
          const doctorAccess = data.active_access.find((access: any) => access.claimed_by === doctorId);
          return {
            id: doctorAccess.id,
            patientName: patient.name,
            patientId: patient.unique_id,
            accessCode: doctorAccess.code,
            expiresAt: new Date(doctorAccess.expires_at)
          };
        });

      console.log('Patients with access:', patientsWithAccess.length, patientsWithAccess);
      console.log('Current doctor ID:', doctorId);

      setActivePatients(patientsWithAccess);
      
      // Cache expires when the shortest access expires
      // Find the earliest expiration time
      const earliestExpiry = patientsWithAccess.length > 0
        ? Math.min(...patientsWithAccess.map(p => p.expiresAt.getTime()))
        : Date.now() + (60 * 60 * 1000); // Default 1 hour if no patients
      
      // Store in cache with expiration based on access codes
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: patientsWithAccess,
        cacheExpiresAt: earliestExpiry
      }));
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch active patients:', err);
      setLoading(false);
    }
  };

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

  const handleCloseAccess = async (patient: PatientAccess) => {
    if (!confirm(`Are you sure you want to close access to ${patient.patientName}'s records?`)) {
      return;
    }

    try {
      console.log('Closing access for code:', patient.accessCode);
      
      const { data, error } = await supabase.functions.invoke('server', {
        headers: { 'X-Function-Path': '/access/share/revoke' },
        body: { code: patient.accessCode }
      });

      console.log('Revoke response:', { data, error });
      console.log('Full error:', error);
      console.log('Error status:', error?.status);

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Remove from UI
      setActivePatients(activePatients.filter(p => p.id !== patient.id));
      
      // Clear caches so doctor dashboard updates
      localStorage.removeItem('activePatients_cache');
      localStorage.removeItem('activePatientCount_cache');
      
      toast.success('Access closed successfully');
    } catch (err: any) {
      console.error('Failed to close access:', err);
      toast.error(err?.message || 'Failed to close access');
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
          <button
            onClick={() => fetchActivePatients(true)}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
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
            {loading ? (
              <div className="bg-white rounded-2xl p-5 shadow-md text-center text-gray-600">
                Loading active patients...
              </div>
            ) : activePatients.length > 0 ? (
              activePatients.map(patient => (
                <div
                  key={patient.id}
                  onClick={() => navigate('/view-patient-records', { state: { patientId: patient.patientId } })}
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
                        handleCloseAccess(patient);
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
