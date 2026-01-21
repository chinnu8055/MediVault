import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Users, KeyRound, CheckCircle, History, Search, Clock, X } from 'lucide-react';
import { useApp } from '../App';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface PatientAccess {
  id: string;
  patientName: string;
  patientId: string;
  accessCode: string;
  expiresAt: Date;
}

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { user, setUser } = useApp();
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [searchPatientId, setSearchPatientId] = useState('');

  const [activePatients, setActivePatients] = useState<PatientAccess[]>([]);
  const [activePatientCount, setActivePatientCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(true);
  const COUNT_CACHE_KEY = 'activePatientCount_cache'; // retained for backward compatibility; no longer used for reads

  // Initialize user from session if not already set
  useEffect(() => {
    if (!user) {
      const initializeUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('unique_id, name, role')
            .eq('user_id', session.user.id)
            .maybeSingle();
          
          if (profile) {
            setUser({
              id: profile.unique_id,
              name: profile.name,
              type: profile.role,
              unique_id: profile.unique_id
            });
          }
        }
      };
      initializeUser();
    }
  }, [user, setUser]);

  // Fetch active patient count
  useEffect(() => {
    fetchActivePatientCount();
    
    // Refresh count periodically to catch any changes (e.g., when patient revokes)
    const interval = setInterval(() => {
      fetchActivePatientCount();
    }, 30000); // 30 seconds
    
    // Also refresh when user comes back to the tab
    const handleFocus = () => {
      fetchActivePatientCount();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  const fetchActivePatientCount = async () => {
    try {
      setLoadingCount(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const doctorId = sessionData.session?.user?.id;
      
      if (!doctorId) {
        setLoadingCount(false);
        return;
      }

      const { data: allPatients } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('role', 'patient');

      if (!allPatients || allPatients.length === 0) {
        setActivePatientCount(0);
        setLoadingCount(false);
        return;
      }

      // Check access for all patients in parallel
      const accessChecks = allPatients.map(patient =>
        supabase.functions.invoke('server', {
          headers: { 'X-Function-Path': '/access/share/active' },
          body: { patient_id: patient.id }
        })
      );

      const results = await Promise.all(accessChecks);
      
      const count = results.filter(({ data }) => {
        if (!data?.active_access || !Array.isArray(data.active_access)) return false;
        const doctorAccess = data.active_access.find((access: any) => access.claimed_by === doctorId);
        return Boolean(doctorAccess);
      }).length;

      setActivePatientCount(count);

      setLoadingCount(false);
    } catch (err) {
      console.error('Failed to fetch active patient count:', err);
      setLoadingCount(false);
    }
  };

  const handleLogout = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'DoctorDashboard.tsx:39', message: 'Logout initiated', data: { hasUser: !!user }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run4', hypothesisId: 'G' }) }).catch(() => { });
    // #endregion
    await supabase.auth.signOut();
    setUser(null);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'DoctorDashboard.tsx:42', message: 'Logout completed, navigating to landing', data: {}, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run4', hypothesisId: 'G' }) }).catch(() => { });
    // #endregion
    navigate('/');
  };

  const handleAccessCode = async () => {
    const code = accessCode.trim();
    if (!code) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast.error('Please sign in again');
        return;
      }

      const { data, error } = await supabase.functions.invoke('server', {
        headers: {
          'X-Function-Path': '/access/share/claim'
        },
        body: {
          code,
          doctor_id: sessionData.session?.user?.id,
          doctor_name: user?.name || sessionData.session?.user?.email || 'Doctor',
          doctor_specialization: 'General Physician'
        }
      });

      if (error) {
        console.error('Claim code error', error);
        toast.error(error.message || 'Failed to claim access code');
        return;
      }

      // Check if the claim was successful
      if (!data || data.error) {
        toast.error(data?.error || 'Invalid access code');
        return;
      }

      console.log('Full response data from server:', data);

      // If patient_unique_id is empty, try to fetch it from the database using the patient_id
      let patientUniqueId = data?.patient_unique_id || '';
      let patientName = data?.patient_name || 'Patient';
      
      // If we didn't get the patient unique_id from the server, fetch it directly
      if (!patientUniqueId && data?.patient_id) {
        try {
          console.log('Fetching patient unique_id from database with patient_id:', data.patient_id);
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('unique_id, name')
            .eq('id', data.patient_id)
            .maybeSingle();
          
          if (profileError) {
            console.error('Failed to fetch patient profile:', profileError);
          } else if (profile) {
            patientUniqueId = profile.unique_id || '';
            patientName = profile.name || patientName;
            console.log('Successfully fetched patient data:', { patientUniqueId, patientName });
          } else {
            console.log('No patient profile found');
          }
        } catch (err) {
          console.error('Exception fetching patient unique_id:', err);
        }
      }

      const expiresAt = data?.expires_at ? new Date(data.expires_at) : new Date(Date.now() + 60 * 60 * 1000);

      console.log('Claim code result:', { patientName, patientId: patientUniqueId, expiresAt, responseData: data });

      const newPatient: PatientAccess = {
        id: Date.now().toString(),
        patientName,
        patientId: patientUniqueId,
        accessCode: code,
        expiresAt
      };

      setActivePatients([...activePatients, newPatient]);
      setAccessCode('');
      setShowAccessModal(false);
      toast.success('Access granted');

      // Navigate directly to patient records after successful claim
      console.log('Checking navigation condition:', { patientId: patientUniqueId, condition: patientUniqueId && patientUniqueId !== 'Unknown' && patientUniqueId !== '' });
      if (patientUniqueId && patientUniqueId !== 'Unknown' && patientUniqueId !== '') {
        console.log('Navigating to patient records with patientId:', patientUniqueId);
        // Refresh the count
        fetchActivePatientCount();
        navigate('/view-patient-records', { state: { patientId: patientUniqueId } });
      } else {
        console.log('Not navigating - patientId is:', patientUniqueId);
        toast.error('Could not retrieve patient information. Please try again.');
      }
    } catch (err: any) {
      console.error('Claim code error', err);
      // Surface clear error messages from function
      const message = err?.message || 'Invalid or expired code';
      toast.error(message);
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg text-gray-800">{user?.name || 'Doctor'}</h1>
              <p className="text-xs text-gray-500">Doctor ID: {user?.unique_id || 'N/A'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-full">
            <LogOut className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto p-4 pt-6 space-y-6">
        {/* Stats Card - Now Clickable */}
        <button
          onClick={() => navigate('/active-patients')}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8" />
            <div>
              <h2 className="text-2xl">{loadingCount ? '...' : activePatientCount}</h2>
              <p className="text-sm text-blue-50">Current Accessible Patients</p>
            </div>
          </div>
          <p className="text-xs text-blue-100 mt-3">
            Tap to view all accessible patients
          </p>
        </button>

        {/* Access Patient Button */}
        <button
          onClick={() => setShowAccessModal(true)}
          className="w-full bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all flex items-center gap-4"
        >
          <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center">
            <KeyRound className="w-7 h-7 text-blue-600" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-gray-800">Enter Access Code</p>
            <p className="text-sm text-gray-500">Get patient record access</p>
          </div>
        </button>

        {/* Search Patient by ID Button */}
        <button
          onClick={() => setShowSearchModal(true)}
          className="w-full bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all flex items-center gap-4"
        >
          <div className="w-14 h-14 rounded-xl bg-purple-50 flex items-center justify-center">
            <Search className="w-7 h-7 text-purple-600" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-gray-800">Search Patient by ID</p>
            <p className="text-sm text-gray-500">View patient visit history</p>
          </div>
        </button>

        {/* Visit History Button */}
        <button
          onClick={() => navigate('/visit-history')}
          className="w-full bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all flex items-center gap-4"
        >
          <div className="w-14 h-14 rounded-xl bg-green-50 flex items-center justify-center">
            <History className="w-7 h-7 text-green-600" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-gray-800">Visit History</p>
            <p className="text-sm text-gray-500">View previous consultations</p>
          </div>
        </button>
      </div>

      {/* Access Code Modal */}
      {showAccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6">
            <h2 className="text-xl text-gray-800 mb-4">Enter Patient Access Code</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Access Code (OTP)</label>
                <input
                  type="text"
                  placeholder="ABC-123-XYZ"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center tracking-wider"
                />
              </div>
              <p className="text-xs text-gray-500 text-center">
                Patient must provide this code for you to access their records
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAccessModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAccessCode}
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-500 text-white hover:bg-blue-600"
                >
                  Access Records
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Patient Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6">
            <h2 className="text-xl text-gray-800 mb-4">Search Patient by ID</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Patient ID</label>
                <input
                  type="text"
                  placeholder="P123456"
                  value={searchPatientId}
                  onChange={(e) => setSearchPatientId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center tracking-wider"
                />
              </div>
              <p className="text-xs text-gray-500 text-center">
                View all previous visits with this patient
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (searchPatientId.trim()) {
                      navigate(`/visit-history?patientId=${searchPatientId}`);
                      setSearchPatientId('');
                      setShowSearchModal(false);
                    }
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-500 text-white hover:bg-blue-600"
                >
                  View Visits
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}