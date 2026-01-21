import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, FlaskConical, Upload, CheckCircle, FileText } from 'lucide-react';
import { useApp } from '../App';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface UploadedReport {
  id: string;
  patientId: string;
  category: string;
  fileName: string;
  filePath: string;
  reportDate?: string | null;
  uploadedAt: string;
}

export default function LaboratoryDashboard() {
  const navigate = useNavigate();
  const { user, setUser } = useApp();
  const [showUpload, setShowUpload] = useState(false);
  const [upload, setUpload] = useState({
    patientId: '',
    category: '',
    reportDate: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<UploadedReport[]>([]);

  useEffect(() => {
    fetchUploads();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/');
  };

  const fetchUploads = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        setUploads([]);
        return;
      }

      const { data, error } = await supabase
        .from('lab_reports')
        .select('id, patient_unique_id, category, file_name, file_path, report_date, uploaded_at')
        .eq('uploaded_by', userId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mapped: UploadedReport[] = data.map(r => ({
          id: r.id,
          patientId: r.patient_unique_id,
          category: r.category || 'General',
          fileName: r.file_name,
          filePath: r.file_path,
          reportDate: r.report_date,
          uploadedAt: r.uploaded_at
        }));
        setUploads(mapped);
      }
    } catch (err: any) {
      console.error('Failed to load lab reports:', err);
      toast.error(err?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!upload.patientId || !upload.category || !selectedFile) {
      toast.error('Patient ID, category, and file are required');
      return;
    }

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        throw new Error('Please sign in');
      }

      // Validate patient exists
      const { data: patientProfile, error: patientError } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('unique_id', upload.patientId.trim())
        .maybeSingle();

      if (patientError || !patientProfile?.user_id) {
        throw new Error('Patient not found');
      }

      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueName = `${crypto.randomUUID()}-${sanitizedName}`;
      const path = `lab-reports/${upload.patientId}/${uniqueName}`;

      const { error: storageError } = await supabase.storage
        .from('patient-uploads')
        .upload(path, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (storageError) throw storageError;

      const { data: inserted, error: dbError } = await supabase
        .from('lab_reports')
        .insert({
          patient_unique_id: upload.patientId.trim(),
          patient_user_id: patientProfile.user_id,
          uploaded_by: userId,
          uploaded_by_name: user?.name || null,
          file_name: selectedFile.name,
          file_path: path,
          category: upload.category,
          report_date: upload.reportDate || null,
        })
        .select('id, patient_unique_id, category, file_name, file_path, report_date, uploaded_at')
        .maybeSingle();

      if (dbError) throw dbError;

      if (inserted) {
        const newReport: UploadedReport = {
          id: inserted.id,
          patientId: inserted.patient_unique_id,
          category: inserted.category || 'General',
          fileName: inserted.file_name,
          filePath: inserted.file_path,
          reportDate: inserted.report_date,
          uploadedAt: inserted.uploaded_at
        };
        setUploads(prev => [newReport, ...prev]);
      }

      toast.success('Report uploaded and shared with patient');
      setUpload({ patientId: '', category: '', reportDate: '' });
      setSelectedFile(null);
      setShowUpload(false);
    } catch (err: any) {
      console.error('Failed to upload report:', err);
      toast.error(err?.message || 'Failed to upload report');
    } finally {
      setUploading(false);
    }
  };

  const handleViewReport = async (report: UploadedReport) => {
    try {
      const { data, error } = await supabase.storage
        .from('patient-uploads')
        .createSignedUrl(report.filePath, 3600);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err: any) {
      console.error('Failed to open report:', err);
      toast.error('Failed to open report');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-lg text-gray-800">{user?.name || 'Laboratory'}</h1>
              <p className="text-xs text-gray-500">Lab ID: {user?.unique_id || 'N/A'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-full">
            <LogOut className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto p-4 pt-6 space-y-6">
        {/* Stats Card */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-400 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="w-8 h-8" />
            <div>
              <h2 className="text-2xl">{uploads.length}</h2>
              <p className="text-sm text-purple-50">Total Reports Uploaded</p>
            </div>
          </div>
        </div>

        {/* Upload Button */}
        <button
          onClick={() => setShowUpload(true)}
          className="w-full bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all flex items-center gap-4"
        >
          <div className="w-14 h-14 rounded-xl bg-purple-50 flex items-center justify-center">
            <Upload className="w-7 h-7 text-purple-600" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-gray-800">Upload Diagnostic Report</p>
            <p className="text-sm text-gray-500">Upload patient test results</p>
          </div>
        </button>

        {/* Recent Uploads */}
        <div>
          <h3 className="text-gray-700 mb-3">Recent Uploads</h3>
          <div className="space-y-3">
            {loading && (
              <div className="text-center py-6 text-sm text-gray-500">Loading reports...</div>
            )}
            {!loading && uploads.map(report => (
              <div
                key={report.id}
                className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition cursor-pointer"
                onClick={() => handleViewReport(report)}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-800">{report.fileName}</p>
                    <p className="text-xs text-gray-500 mt-1">Patient ID: {report.patientId}</p>
                    {report.reportDate && (
                      <p className="text-xs text-gray-500">Report Date: {new Date(report.reportDate).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs">
                    {report.category}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(report.uploadedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {!loading && uploads.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl p-5 shadow-sm">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No reports uploaded yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl text-gray-800 mb-4">Upload Diagnostic Report</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Patient ID *</label>
                <input
                  type="text"
                  placeholder="P123456"
                  value={upload.patientId}
                  onChange={(e) => setUpload({...upload, patientId: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Category *</label>
                <select
                  value={upload.category}
                  onChange={(e) => setUpload({...upload, category: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                <label className="text-sm text-gray-600 mb-1 block">Report Date (optional)</label>
                <input
                  type="date"
                  value={upload.reportDate}
                  onChange={(e) => setUpload({...upload, reportDate: e.target.value})}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Upload File (PDF/Image) *</label>
                <input
                  type="file"
                  id="lab-file-upload"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label
                  htmlFor="lab-file-upload"
                  className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-purple-300 transition-colors cursor-pointer block"
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG up to 10MB</p>
                </label>
              </div>

              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs text-blue-900">
                  ⓘ Uploaded reports will be automatically added to the patient's records in the selected category
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowUpload(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!upload.patientId || !upload.category || !selectedFile || uploading}
                  className="flex-1 px-4 py-3 rounded-xl bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
