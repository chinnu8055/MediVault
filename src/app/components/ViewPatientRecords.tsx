import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, FileText, Plus, User, AlertCircle, Calendar, Upload, ListFilter, X, Stethoscope, Trash2 } from 'lucide-react';
import { useApp } from '../App';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface Medicine {
  name: string;
  dosage: string;
  time: string[];
  duration: string;
  instructions?: string;
}

interface DoctorVisit {
  id: string;
  date: string;
  doctor: string;
  category: string;
  diagnosis: string;
  prescription: string[];
  type: 'visit';
  doctor_id?: string;
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
  file_path?: string;
}

type PatientRecord = DoctorVisit | LabReport | UserUpload;

export default function ViewPatientRecords() {
  const navigate = useNavigate();
  const location = useLocation();
  const patientId = location.state?.patientId;
  const { user } = useApp();
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PatientRecord | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [currentDoctorId, setCurrentDoctorId] = useState<string | null>(null);
  
  // Filter states
  const [typeFilter, setTypeFilter] = useState<'all' | 'report' | 'visit' | 'userUpload'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [visitData, setVisitData] = useState({
    category: '',
    diagnosis: '',
    medicines: [{ name: '', dosage: '', time: [] as string[], duration: '', instructions: '' }] as Medicine[]
  });
  const [visitDate, setVisitDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [deletingVisitId, setDeletingVisitId] = useState<string | null>(null);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);

  const [patientInfo, setPatientInfo] = useState({
    name: 'Patient',
    id: patientId || '',
    age: undefined as number | undefined,
    gender: undefined as string | undefined,
  });

  // Redirect if patientId is not provided
  useEffect(() => {
    if (!patientId) {
      navigate('/doctor-dashboard');
    }
  }, [patientId, navigate]);

  // Records from backend
  const [labReports] = useState<LabReport[]>([]);
  const [doctorVisits, setDoctorVisits] = useState<DoctorVisit[]>([]);
  const [userUploads, setUserUploads] = useState<UserUpload[]>([]);

  // Fetch patient profile (name/id) by unique_id from Supabase
  useEffect(() => {
    const loadProfile = async () => {
      if (!patientId) return;
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('name, unique_id, age, gender')
          .eq('unique_id', patientId)
          .maybeSingle();
        if (!error && data) {
          setPatientInfo({
            name: data.name || 'Patient',
            id: data.unique_id || patientId,
            age: data.age ?? undefined,
            gender: data.gender ?? undefined,
          });
        }
      } catch (err) {
        console.error('Failed to load patient profile', err);
      }
    };
    loadProfile();
  }, [patientId]);

  // Check if current doctor has access to this patient's records
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const doctorId = sessionData.session?.user?.id; // This is the Supabase auth user ID
        
        setCurrentDoctorId(doctorId || null);
        
        if (!doctorId || !patientId) {
          console.log('Missing doctorId or patientId', { doctorId, patientId });
          setAccessDenied(true);
          setHasAccess(false);
          return;
        }

        // Get patient profile to find their database ID
        const { data: patientData, error: patientError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('unique_id', patientId)
          .maybeSingle();

        if (patientError || !patientData?.id) {
          console.error('Patient not found', patientError);
          setAccessDenied(true);
          setHasAccess(false);
          return;
        }

        console.log('Checking access for', { patientId, patientDatabaseId: patientData.id, doctorId });

        // Check if doctor has active access to this patient by fetching patient's active access list
        const { data, error } = await supabase.functions.invoke('server', {
          headers: {
            'X-Function-Path': '/access/share/active'
          },
          body: {
            patient_id: patientData.id
          }
        });

        if (error) {
          console.error('Access verification error', error);
          setAccessDenied(true);
          setHasAccess(false);
          return;
        }

        console.log('Active access list', { data });

        // Check if current doctor is in the active access list by checking claimed_by field
        if (data?.active_access && Array.isArray(data.active_access)) {
          console.log('Active access array:', data.active_access.map((access: any) => ({ claimed_by: access.claimed_by, doctor_name: access.doctor_name })));
          const doctorAccess = data.active_access.find((access: any) => access.claimed_by === doctorId);
          console.log('Doctor access found:', { doctorAccess, doctorId, allClaimedBys: data.active_access.map((a: any) => a.claimed_by) });
          if (doctorAccess) {
            setHasAccess(true);
          } else {
            console.log('Doctor not in active access list');
            // Clear cache when access is denied
            localStorage.removeItem('activePatients_cache');
            localStorage.removeItem('activePatientCount_cache');
            setAccessDenied(true);
            setHasAccess(false);
          }
        } else {
          console.log('No active access records');
          // Clear cache when access is denied
          localStorage.removeItem('activePatients_cache');
          localStorage.removeItem('activePatientCount_cache');
          setAccessDenied(true);
          setHasAccess(false);
        }
      } catch (err) {
        console.error('Failed to verify access', err);
        // Clear cache on error to be safe
        localStorage.removeItem('activePatients_cache');
        localStorage.removeItem('activePatientCount_cache');
        setAccessDenied(true);
        setHasAccess(false);
      }
    };

    checkAccess();
  }, [patientId]);

  // Fetch patient's uploaded files after access is verified
  useEffect(() => {
    const fetchPatientUploads = async () => {
      if (!hasAccess || !patientId) return;

      try {
        console.log('Fetching uploads for patient:', patientId);
        
        // Get patient's auth user_id from their unique_id
        const { data: patientData, error: patientError } = await supabase
          .from('user_profiles')
          .select('user_id')
          .eq('unique_id', patientId)
          .maybeSingle();

        console.log('Patient data:', patientData, 'Error:', patientError);

        if (patientError || !patientData?.user_id) {
          console.error('Failed to get patient user_id', patientError);
          return;
        }

        // Fetch patient's uploads
        const { data, error } = await supabase
          .from('user_uploads')
          .select('*')
          .eq('user_id', patientData.user_id)
          .order('uploaded_at', { ascending: false });

        console.log('User uploads data:', data, 'Error:', error);

        if (error) throw error;

        if (data) {
          const formatted: UserUpload[] = data.map(upload => ({
            id: upload.id,
            name: upload.file_name,
            date: upload.report_date || upload.uploaded_at.split('T')[0],
            category: upload.category || 'General',
            uploadedBy: 'patient',
            type: 'userUpload' as const,
            file_path: upload.file_path
          }));
          console.log('Formatted uploads:', formatted);
          setUserUploads(formatted);
        }
      } catch (err: any) {
        console.error('Failed to fetch patient uploads:', err);
      }
    };

    fetchPatientUploads();
  }, [hasAccess, patientId]);

  // Fetch doctor visits after access is verified
  useEffect(() => {
    const fetchVisits = async () => {
      if (!hasAccess || !patientId) return;

      try {
        const { data, error } = await supabase
          .from('doctor_visits')
          .select('*')
          .eq('patient_unique_id', patientId)
          .order('visit_date', { ascending: false });

        if (error) throw error;

        if (data) {
          const formatted: DoctorVisit[] = data.map(v => ({
            id: v.id,
            date: v.visit_date || v.created_at,
            doctor: v.doctor_name || 'Doctor',
            category: v.category || 'General',
            diagnosis: v.diagnosis || '',
            prescription: v.prescription || [],
            type: 'visit',
            doctor_id: v.doctor_id
          }));
          setDoctorVisits(formatted);
        }
      } catch (err) {
        console.error('Failed to fetch doctor visits:', err);
      }
    };

    fetchVisits();
  }, [hasAccess, patientId]);

  const handleViewFile = async (upload: UserUpload) => {
    if (!upload.file_path) {
      toast.error('File path not found');
      return;
    }

    try {
      // Try multiple path variants in case the stored path has bucket prefix or encoding differences
      const variants = [
        upload.file_path,
        decodeURIComponent(upload.file_path || ''),
        upload.file_path.startsWith('patient-uploads/')
          ? upload.file_path.replace(/^patient-uploads\//, '')
          : `patient-uploads/${upload.file_path}`
      ];

      let opened = false;
      let lastError: any = null;

      for (const pathVariant of variants) {
        try {
          const { data, error } = await supabase.storage
            .from('patient-uploads')
            .createSignedUrl(pathVariant, 3600);

          if (error) {
            lastError = error;
            continue;
          }

          if (data?.signedUrl) {
            window.open(data.signedUrl, '_blank');
            opened = true;
            break;
          }
        } catch (innerErr) {
          lastError = innerErr;
        }
      }

      if (!opened) {
        throw lastError || new Error('File not found');
      }
    } catch (err: any) {
      console.error('Failed to view file:', err);
      const message = err?.message?.includes('Object not found')
        ? 'File not found. Ask the patient to re-upload.'
        : err?.message || 'Failed to open file';
      toast.error(message);
    }
  };

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
      medicines: [...visitData.medicines, { name: '', dosage: '', time: [], duration: '', instructions: '' }] 
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

  const handleEditVisit = (visit: DoctorVisit) => {
    // Parse prescription back to medicines format
    const medicines: Medicine[] = visit.prescription.map(p => {
      const parts = p.split(' - ');
      const name = parts[0] || '';
      const dosage = parts[1] || '';
      const durationMatch = parts[2]?.match(/(\d+)\s*days/);
      const duration = durationMatch ? durationMatch[1] : '';
      const timeMatch = parts[2]?.match(/\(([^)]+)\)/);
      const time = timeMatch ? timeMatch[1].split(', ').map(t => t.trim()) : [];
      const instructionsMatch = parts[3];
      const instructions = instructionsMatch || '';
      return { name, dosage, time, duration, instructions };
    });

    setEditingVisitId(visit.id);
    setVisitDate(visit.date);
    setVisitData({
      category: visit.category,
      diagnosis: visit.diagnosis,
      medicines: medicines.length > 0 ? medicines : [{ name: '', dosage: '', time: [], duration: '', instructions: '' }]
    });
    setShowVisitModal(true);
  };

  const handleDeleteVisit = async (visitId: string) => {
    try {
      setDeletingVisitId(visitId);

      const { data: sessionData } = await supabase.auth.getSession();
      const doctorId = sessionData.session?.user?.id;
      if (!doctorId) {
        throw new Error('Not signed in');
      }

      const { error } = await supabase
        .from('doctor_visits')
        .delete()
        .eq('id', visitId)
        .eq('doctor_id', doctorId);

      if (error) throw error;

      setDoctorVisits(prev => prev.filter(v => v.id !== visitId));
      toast.success('Visit deleted');
      setSelectedRecord(null);
    } catch (err: any) {
      console.error('Failed to delete visit:', err);
      toast.error(err?.message || 'Failed to delete visit');
    } finally {
      setDeletingVisitId(null);
    }
  };

  const handleSubmitVisit = async () => {
    if (!patientId) {
      toast.error('Patient not found');
      return;
    }

    if (!(visitData.category && visitData.diagnosis && visitDate)) {
      toast.error('Fill category, diagnosis, and date');
      return;
    }

    const hasValidMedicine = visitData.medicines.some(m => m.name.trim() && m.dosage && m.time.length > 0 && m.duration);
    if (!hasValidMedicine) {
      toast.error('Add at least one medicine with details');
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const doctorId = sessionData.session?.user?.id;
      if (!doctorId) {
        throw new Error('Not signed in');
      }

      const { data: doctorProfile } = await supabase
        .from('user_profiles')
        .select('name')
        .eq('user_id', doctorId)
        .maybeSingle();

      const doctorName = doctorProfile?.name || 'Doctor';
      const prescription = visitData.medicines.map(m => {
        let prescStr = `${m.name} - ${m.dosage} - ${m.duration} days (${m.time.join(', ')})`;
        if (m.instructions && m.instructions.trim()) {
          prescStr += ` - ${m.instructions}`;
        }
        return prescStr;
      });

      if (editingVisitId) {
        // Update existing visit
        const { data, error } = await supabase
          .from('doctor_visits')
          .update({
            category: visitData.category,
            diagnosis: visitData.diagnosis,
            prescription,
            visit_date: visitDate
          })
          .eq('id', editingVisitId)
          .eq('doctor_id', doctorId)
          .select()
          .maybeSingle();

        if (error) throw error;

        const updatedVisit: DoctorVisit = {
          id: data?.id || editingVisitId,
          date: data?.visit_date || visitDate,
          doctor: data?.doctor_name || doctorName,
          category: data?.category || visitData.category,
          diagnosis: data?.diagnosis || visitData.diagnosis,
          prescription: data?.prescription || prescription,
          type: 'visit',
          doctor_id: doctorId
        };

        setDoctorVisits(prev => prev.map(v => v.id === editingVisitId ? updatedVisit : v));
        setSelectedRecord(updatedVisit);
        toast.success('Visit updated');
      } else {
        // Create new visit
        const { data, error } = await supabase
          .from('doctor_visits')
          .insert({
            patient_unique_id: patientId,
            doctor_id: doctorId,
            doctor_name: doctorName,
            category: visitData.category,
            diagnosis: visitData.diagnosis,
            prescription,
            visit_date: visitDate
          })
          .select()
          .maybeSingle();

        if (error) throw error;

        const newVisit: DoctorVisit = {
          id: data?.id || crypto.randomUUID(),
          date: data?.visit_date || visitDate,
          doctor: data?.doctor_name || doctorName,
          category: data?.category || visitData.category,
          diagnosis: data?.diagnosis || visitData.diagnosis,
          prescription: data?.prescription || prescription,
          type: 'visit',
          doctor_id: doctorId
        };

        setDoctorVisits(prev => [newVisit, ...prev]);
        toast.success('Visit added');
      }

      setShowVisitModal(false);
      setEditingVisitId(null);
      setVisitData({ category: '', diagnosis: '', medicines: [{ name: '', dosage: '', time: [], duration: '', instructions: '' }] });
      setVisitDate(new Date().toISOString().split('T')[0]);
    } catch (err: any) {
      console.error('Failed to save visit:', err);
      toast.error(err?.message || 'Failed to save visit');
    }
  };

  const activeFilterCount = (typeFilter !== 'all' ? 1 : 0) + (categoryFilter !== 'all' ? 1 : 0);

  // Show loading state while checking access
  if (hasAccess === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-gray-600">Verifying access...</div>
      </div>
    );
  }

  // Show access denied message if doctor doesn't have access
  if (accessDenied || !hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You no longer have access to this patient's records. The patient may have revoked your access or the access period has expired.
          </p>
          <button
            onClick={() => navigate('/doctor-dashboard')}
            className="px-6 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
          >
            Go Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

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
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-lg text-sm ${getCategoryColor(selectedRecord.category)}`}>
                          {selectedRecord.category}
                        </span>
                        {currentDoctorId && selectedRecord.doctor_id === currentDoctorId && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditVisit(selectedRecord)}
                              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                              <Plus className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteVisit(selectedRecord.id)}
                              disabled={deletingVisitId === selectedRecord.id}
                              className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                              {deletingVisitId === selectedRecord.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        )}
                      </div>
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
                  <p className="text-gray-800">{patientInfo.age !== undefined ? `${patientInfo.age} years` : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Gender</p>
                  <p className="text-gray-800">{patientInfo.gender || '—'}</p>
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
                      onClick={() => {
                        if (record.type === 'userUpload') {
                          handleViewFile(record);
                        } else {
                          setSelectedRecord(record);
                        }
                      }}
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
            <h2 className="text-xl text-gray-800 mb-4">{editingVisitId ? 'Edit Visit' : 'Add Visit'}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Visit Date *</label>
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

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

                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Additional Instructions</label>
                        <textarea
                          placeholder="e.g., Take after meals, Avoid alcohol"
                          value={med.instructions || ''}
                          onChange={(e) => updateMedicine(idx, 'instructions', e.target.value)}
                          rows={2}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowVisitModal(false);
                    setEditingVisitId(null);
                    setVisitData({ category: '', diagnosis: '', medicines: [{ name: '', dosage: '', time: [], duration: '', instructions: '' }] });
                    setVisitDate(new Date().toISOString().split('T')[0]);
                  }}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitVisit}
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-500 text-white hover:bg-blue-600"
                >
                  {editingVisitId ? 'Update Visit' : 'Add Visit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}