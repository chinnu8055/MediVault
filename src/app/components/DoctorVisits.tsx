import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';

interface Visit {
  id: string;
  date: string;
  doctor: string;
  category: string;
  diagnosis: string;
  prescription: string[];
  seen_by_patient?: boolean;
}

export default function DoctorVisits() {
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadDocumentDate, setUploadDocumentDate] = useState<string>('');
  const [newVisitsCount, setNewVisitsCount] = useState<number>(0);

  const [visits, setVisits] = useState<Visit[]>([]);

  useEffect(() => {
    const fetchVisits = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user?.id;
        if (!userId) return;

        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('unique_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (profileError || !profile?.unique_id) return;

        const { data, error } = await supabase
          .from('doctor_visits')
          .select('*')
          .eq('patient_unique_id', profile.unique_id)
          .order('visit_date', { ascending: false });

        if (error) return;

        if (data) {
          const formatted: Visit[] = data.map(v => ({
            id: v.id,
            date: v.visit_date || v.created_at,
            doctor: v.doctor_name || 'Doctor',
            category: v.category || 'General',
            diagnosis: v.diagnosis || '',
            prescription: v.prescription || [],
            seen_by_patient: v.seen_by_patient
          }));

          const unseen = formatted.filter(v => !v.seen_by_patient);
          setNewVisitsCount(unseen.length);
          setVisits(formatted);

          // Mark unseen as seen
          if (unseen.length > 0) {
            await supabase
              .from('doctor_visits')
              .update({ seen_by_patient: true })
              .in('id', unseen.map(v => v.id));
          }
        }
      } catch (err) {
        console.error('Failed to fetch doctor visits for patient:', err);
      }
    };

    fetchVisits();
  }, []);

  // Get unique categories
  const categories = Array.from(new Set(visits.map(v => v.category)));

  // Sort visits by date (most recent first)
  const sortedVisits = [...visits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Filter visits by category
  const filteredVisits = categoryFilter === 'all'
    ? sortedVisits
    : sortedVisits.filter(v => v.category.toLowerCase() === categoryFilter);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button 
            onClick={() => navigate('/patient-dashboard')}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg text-gray-800">Doctor Visits</h1>
          </div>
          {/* Upload button disabled for patients */}
          {false && (
            <button 
              onClick={() => setShowUpload(true)}
              className="px-3 py-2 rounded-xl bg-green-50 text-green-600 text-sm hover:bg-green-100 flex items-center gap-1"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 pt-6 space-y-4">
        {/* Category Filter */}
        <div>
          <label className="text-sm text-gray-600 mb-2 block">Filter by Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.toLowerCase()} value={cat.toLowerCase()}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Visits List */}
        <div className="space-y-3">
          {filteredVisits.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">No visits in this category</p>
            </div>
          ) : (
            filteredVisits.map(visit => (
              <div key={visit.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-gray-800">{new Date(visit.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        <p className="text-sm text-gray-500">{visit.doctor}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-xs ${getCategoryColor(visit.category)}`}>
                        {visit.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{visit.diagnosis}</p>
                    {visit.prescription && visit.prescription.length > 0 && (
                      <div className="bg-blue-50 rounded-lg p-3 mt-3">
                        <p className="text-xs text-blue-900 mb-2">Prescription</p>
                        <ul className="space-y-1">
                          {visit.prescription.map((med, idx) => (
                            <li key={idx} className="text-xs text-blue-800 flex items-start gap-2">
                              <span className="text-blue-400 mt-0.5">•</span>
                              <span>{med}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Upload Modal disabled for patients */}
      {false && showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl text-gray-800 mb-4">Upload Document</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Category *</label>
                <select className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Select Category</option>
                  <option>Dental</option>
                  <option>Gynecology</option>
                  <option>Cardiology</option>
                  <option>Orthopedic</option>
                  <option>General</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Date of Report/Visit *</label>
                <input
                  type="date"
                  value={uploadDocumentDate}
                  onChange={(e) => setUploadDocumentDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="When was this report taken?"
                />
                <p className="text-xs text-gray-500 mt-1">Enter the actual date of the report or visit</p>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Upload File (PDF/Image) *</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-green-300 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG up to 10MB</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowUpload(false);
                    setUploadDocumentDate('');
                  }}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowUpload(false);
                    setUploadDocumentDate('');
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-green-500 text-white hover:bg-green-600"
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}