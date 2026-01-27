import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Pill, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface Visit {
  id: string;
  date: string;
  category: string;
  diagnosis: string;
  prescription: string[];
  patientId: string;
  patientName?: string;
  bpSys?: number;
  bpDia?: number;
  glucose?: number;
  weight?: number;
  height?: number;
}

export default function PatientVisitLookup() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialPatientId = (location.state as any)?.patientId as string | undefined;
  const [patientIdInput, setPatientIdInput] = useState(initialPatientId || '');
  const [visits, setVisits] = useState<Visit[]>([]);
  const [patientName, setPatientName] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchVisits = async (patientId: string) => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const doctorId = sessionData.session?.user?.id;
      if (!doctorId) {
        toast.error('Please sign in');
        return;
      }

      // Fetch patient profile for name
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('name')
        .eq('unique_id', patientId)
        .maybeSingle();

      if (profileError || !profile) {
        toast.error('Patient not found');
        setVisits([]);
        setPatientName('');
        return;
      }

      // Fetch visits for this doctor and patient
      const { data, error } = await supabase
        .from('doctor_visits')
        .select('*')
        .eq('patient_unique_id', patientId)
        .eq('doctor_id', doctorId)
        .order('visit_date', { ascending: false });

      if (error) {
        toast.error('Failed to load visits');
        return;
      }

      const formatted: Visit[] = (data || []).map(v => ({
        id: v.id,
        date: v.visit_date || v.created_at,
        category: v.category || 'General',
        diagnosis: v.diagnosis || '',
        prescription: v.prescription || [],
        patientId,
        patientName: profile.name,
        bpSys: v.blood_pressure_systolic,
        bpDia: v.blood_pressure_diastolic,
        glucose: v.blood_glucose,
        weight: v.weight_kg,
        height: v.height_cm
      }));

      setPatientName(profile.name);
      setVisits(formatted);
    } catch (err) {
      console.error('Failed to fetch visits', err);
      toast.error('Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialPatientId) {
      fetchVisits(initialPatientId);
    }
  }, [initialPatientId]);

  const handleSearch = () => {
    const trimmed = patientIdInput.trim();
    if (!trimmed) return;
    fetchVisits(trimmed);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/doctor-dashboard')}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg text-gray-800">Patient Visit Lookup</h1>
            <p className="text-xs text-gray-500">View visits for a specific patient</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 pt-6 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <label className="text-sm text-gray-700">Patient ID</label>
          <input
            type="text"
            value={patientIdInput}
            onChange={(e) => setPatientIdInput(e.target.value)}
            placeholder="Enter patient ID"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            className="w-full px-4 py-3 rounded-xl bg-blue-500 text-white hover:bg-blue-600"
          >
            Search
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 bg-white rounded-2xl shadow-sm">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 mt-3">Loading visits...</p>
          </div>
        ) : visits.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl shadow-sm">
            <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No visits found</p>
            <p className="text-xs text-gray-400">Search by patient ID to view visit history</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg text-gray-800">{patientName}</p>
                  <p className="text-sm text-gray-500">{visits[0]?.patientId}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">Showing {visits.length} visit{visits.length === 1 ? '' : 's'}</p>
            </div>

            {visits.map(v => (
              <div key={v.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-500">
                      {new Date(v.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-gray-800 mt-1">{v.diagnosis || 'No diagnosis recorded'}</p>
                  </div>
                  <span className="px-3 py-1 rounded-lg text-xs bg-green-50 text-green-700">{v.category}</span>
                </div>

                {(v.bpSys || v.bpDia || v.glucose || v.weight || v.height) && (
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-700 bg-green-50 border border-green-100 rounded-lg p-3 mb-3">
                    {v.bpSys && v.bpDia && (
                      <div>
                        <p className="text-gray-500">Blood Pressure</p>
                        <p className="text-green-700 font-medium">{v.bpSys}/{v.bpDia} mmHg</p>
                      </div>
                    )}
                    {v.glucose && (
                      <div>
                        <p className="text-gray-500">Blood Glucose</p>
                        <p className="text-green-700 font-medium">{v.glucose} mg/dL</p>
                      </div>
                    )}
                    {v.weight && (
                      <div>
                        <p className="text-gray-500">Weight</p>
                        <p className="text-green-700 font-medium">{v.weight} kg</p>
                      </div>
                    )}
                    {v.height && (
                      <div>
                        <p className="text-gray-500">Height</p>
                        <p className="text-green-700 font-medium">{v.height} cm</p>
                      </div>
                    )}
                  </div>
                )}

                {v.prescription.length > 0 && (
                  <div className="pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Pill className="w-4 h-4 text-blue-600" />
                      <p className="text-sm text-gray-600">Prescriptions</p>
                    </div>
                    <ul className="space-y-1 ml-6">
                      {v.prescription.map((p, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-blue-400 mt-1">•</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
