import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, Calendar, Pill } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '../../lib/supabase';

interface Visit {
  visitId: string;
  visitDate: Date;
  category: string;
  diagnosis: string;
  prescriptions: string[];
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  bloodGlucose?: number;
  weightKg?: number;
  heightCm?: number;
  patientId?: string;
  patientName?: string;
}

function getCategoryColor(category: string) {
  switch (category?.toLowerCase()) {
    case 'emergency':
      return 'bg-red-100 text-red-700';
    case 'follow-up':
      return 'bg-blue-100 text-blue-700';
    case 'routine':
      return 'bg-green-100 text-green-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export default function VisitHistory() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [visits, setVisits] = useState<Visit[]>([]);

  useEffect(() => {
    fetchTodaysVisits();
  }, []);

  const fetchTodaysVisits = async () => {
    setLoading(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const doctorId = sessionData.session?.user?.id;
      if (!doctorId) {
        toast.error('Please sign in');
        return;
      }

      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const { data: visitsData, error } = await supabase
        .from('doctor_visits')
        .select('*')
        .eq('doctor_id', doctorId)
        .gte('visit_date', start)
        .lt('visit_date', end)
        .order('visit_date', { ascending: false });

      if (error) throw error;

      if (!visitsData || visitsData.length === 0) {
        setVisits([]);
        return;
      }

      const uniqueIds = Array.from(new Set(visitsData.map(v => v.patient_unique_id).filter(Boolean)));
      let names: Record<string, string> = {};

      if (uniqueIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('user_profiles')
          .select('unique_id, name')
          .in('unique_id', uniqueIds);
        if (profileError) throw profileError;

        names = (profiles || []).reduce((acc: Record<string, string>, p: any) => {
          acc[p.unique_id] = p.name;
          return acc;
        }, {});
      }

      const mapped: Visit[] = visitsData.map(v => ({
        visitId: v.id,
        visitDate: new Date(v.visit_date || v.created_at),
        category: v.category || 'General',
        diagnosis: v.diagnosis || '',
        prescriptions: v.prescription || [],
        bloodPressureSystolic: v.blood_pressure_systolic,
        bloodPressureDiastolic: v.blood_pressure_diastolic,
        bloodGlucose: v.blood_glucose,
        weightKg: v.weight_kg,
        heightCm: v.height_cm,
        patientId: v.patient_unique_id,
        patientName: v.patient_unique_id ? names[v.patient_unique_id] : undefined
      }));

      setVisits(mapped);
    } catch (err) {
      console.error('Failed to fetch visits', err);
      toast.error('Failed to fetch visits');
    } finally {
      setLoading(false);
    }
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
            <h1 className="text-lg text-gray-800">Today's Visits</h1>
            <p className="text-xs text-gray-500">All patients you saw today</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 pt-6 space-y-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 mt-3">Loading visits...</p>
          </div>
        ) : visits.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
            <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No visits recorded today</p>
            <p className="text-xs text-gray-400 mt-1">New visits will appear here once logged</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visits.map(visit => (
              <div key={visit.visitId} className="bg-white rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
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
                        <p className="text-gray-800 mt-1">{visit.patientName || visit.patientId}</p>
                        {visit.patientId && (
                          <p className="text-xs text-gray-500">ID: {visit.patientId}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-xs ${getCategoryColor(visit.category)}`}>
                        {visit.category}
                      </span>
                    </div>
                    <p className="text-gray-800 mt-1">{visit.diagnosis || 'No diagnosis recorded'}</p>
                  </div>
                </div>

                {(visit.bloodPressureSystolic || visit.bloodPressureDiastolic || visit.bloodGlucose || visit.weightKg || visit.heightCm) && (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-700 bg-green-50 border border-green-100 rounded-lg p-3">
                    {visit.bloodPressureSystolic && visit.bloodPressureDiastolic && (
                      <div>
                        <p className="text-gray-500">Blood Pressure</p>
                        <p className="text-green-700 font-medium">{visit.bloodPressureSystolic}/{visit.bloodPressureDiastolic} mmHg</p>
                      </div>
                    )}
                    {visit.bloodGlucose && (
                      <div>
                        <p className="text-gray-500">Blood Glucose</p>
                        <p className="text-green-700 font-medium">{visit.bloodGlucose} mg/dL</p>
                      </div>
                    )}
                    {visit.weightKg && (
                      <div>
                        <p className="text-gray-500">Weight</p>
                        <p className="text-green-700 font-medium">{visit.weightKg} kg</p>
                      </div>
                    )}
                    {visit.heightCm && (
                      <div>
                        <p className="text-gray-500">Height</p>
                        <p className="text-green-700 font-medium">{visit.heightCm} cm</p>
                      </div>
                    )}
                  </div>
                )}

                {visit.prescriptions.length > 0 && (
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
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}