import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FolderOpen, Upload, FileText, AlertCircle, History, Calendar, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface Record {
  id: string;
  name: string;
  date: string;
  category: string;
  file_path?: string;
}

interface UserUpload {
  id: string;
  name: string;
  date: string;
  category: string;
  uploadedBy: string;
  file_path?: string;
}

export default function MyRecords() {
  const navigate = useNavigate();
  const [showUpload, setShowUpload] = useState(false);
  const [viewSection, setViewSection] = useState<'main' | 'reports' | 'userUploads'>('main');
  const [reportFilter, setReportFilter] = useState<string>('all');
  const [uploadDocumentDate, setUploadDocumentDate] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [labReports, setLabReports] = useState<Record[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Fetch user uploads on mount
  useEffect(() => {
    if (viewSection === 'userUploads') {
      fetchUserUploads();
    }
  }, [viewSection]);

  // Fetch lab reports on mount
  useEffect(() => {
    fetchLabReports();
  }, []);

  const fetchLabReports = async () => {
    setLoadingReports(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('unique_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError || !profile?.unique_id) return;

      const { data, error } = await supabase
        .from('lab_reports')
        .select('id, file_name, file_path, category, report_date, uploaded_at')
        .eq('patient_unique_id', profile.unique_id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formatted: Record[] = data.map(report => ({
          id: report.id,
          name: report.file_name,
          date: report.report_date || report.uploaded_at?.split('T')[0],
          category: report.category || 'General',
          file_path: report.file_path,
        }));
        setLabReports(formatted);
      }
    } catch (err: any) {
      console.error('Failed to fetch lab reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchUserUploads = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('user_uploads')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formatted: UserUpload[] = data.map(upload => ({
          id: upload.id,
          name: upload.file_name,
          date: upload.report_date || upload.uploaded_at.split('T')[0],
          category: upload.category || 'General',
          uploadedBy: 'patient',
          file_path: upload.file_path
        }));
        setUserUploads(formatted);
      }
    } catch (err: any) {
      console.error('Failed to fetch uploads:', err);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadCategory || !uploadDocumentDate) return;

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        toast.error('Please sign in to upload');
        return;
      }

      // Upload to storage
      const uniqueName = `${crypto.randomUUID()}-${selectedFile.name}`;
      const path = `${userId}/${uniqueName}`;

      const { error: uploadError } = await supabase.storage
        .from('patient-uploads')
        .upload(path, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('user_uploads')
        .insert({
          user_id: userId,
          file_name: selectedFile.name,
          file_path: path,
          mime_type: selectedFile.type,
          size_bytes: selectedFile.size,
          category: uploadCategory,
          report_date: uploadDocumentDate,
        });

      if (dbError) throw dbError;

      toast.success('File uploaded successfully');
      setShowUpload(false);
      setUploadDocumentDate('');
      setSelectedFile(null);
      setUploadCategory('');

      // Refresh the list
      fetchUserUploads();
    } catch (err: any) {
      console.error('Upload failed:', err);
      toast.error(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleViewFile = async (upload: UserUpload) => {
    if (!upload.file_path) {
      toast.error('File path not found');
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('patient-uploads')
        .createSignedUrl(upload.file_path, 3600); // 1 hour expiry

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err: any) {
      console.error('Failed to view file:', err);
      toast.error('Failed to open file');
    }
  };

  const handleDeleteFile = async (upload: UserUpload) => {
    if (!upload.file_path) {
      toast.error('File path not found');
      return;
    }

    try {
      setDeletingId(upload.id);

      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        throw new Error('Not signed in');
      }

      const { error: storageError } = await supabase.storage
        .from('patient-uploads')
        .remove([upload.file_path]);

      if (storageError) {
        throw storageError;
      }

      const { error: dbError } = await supabase
        .from('user_uploads')
        .delete()
        .eq('id', upload.id)
        .eq('user_id', userId);

      if (dbError) {
        throw dbError;
      }

      setUserUploads(prev => prev.filter(u => u.id !== upload.id));
      toast.success('File deleted');
    } catch (err: any) {
      console.error('Failed to delete file:', err);
      toast.error(err?.message || 'Failed to delete file');
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewReport = async (report: Record) => {
    if (!report.file_path) {
      toast.error('File not available');
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('patient-uploads')
        .createSignedUrl(report.file_path, 3600);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err: any) {
      console.error('Failed to view report:', err);
      toast.error('Failed to open report');
    }
  };

  // User-uploaded documents (fetched from database)
  const [userUploads, setUserUploads] = useState<UserUpload[]>([]);

  // Sort reports by date (most recent first)
  const sortedReports = [...labReports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Filter reports by category
  const filteredReports = reportFilter === 'all' 
    ? sortedReports 
    : sortedReports.filter(r => r.category.toLowerCase() === reportFilter);
  
  // Get unique categories from reports
  const reportCategories = Array.from(new Set(labReports.map(r => r.category)));

  // Sort user uploads by date (most recent first)
  const sortedUserUploads = [...userUploads].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button 
            onClick={() => {
              if (viewSection !== 'main') {
                setViewSection('main');
                setReportFilter('all');
              } else {
                navigate('/patient-dashboard');
              }
            }}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg text-gray-800">
              {viewSection === 'reports' ? 'Reports' : viewSection === 'userUploads' ? 'Uploaded by You' : 'My Records'}
            </h1>
          </div>
          {viewSection === 'userUploads' && (
            <button 
              onClick={() => setShowUpload(true)}
              className="px-3 py-2 rounded-xl bg-blue-50 text-blue-600 text-sm hover:bg-blue-100 flex items-center gap-1"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 pt-6">
        {viewSection === 'reports' ? (
          /* Reports View with Filter */
          <div className="space-y-4">
            {/* Filter Dropdown */}
            <div>
              <label className="text-sm text-gray-600 mb-2 block">Filter by Category</label>
              <select
                value={reportFilter}
                onChange={(e) => setReportFilter(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Reports</option>
                {reportCategories.map(cat => (
                  <option key={cat.toLowerCase()} value={cat.toLowerCase()}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Reports List */}
            <div className="space-y-3">
              {loadingReports ? (
                <div className="text-center py-12 text-gray-500">Loading reports...</div>
              ) : (
                <>
                  {filteredReports.map(report => (
                    <div
                      key={report.id}
                      className="bg-white rounded-xl p-4 shadow-sm border border-transparent hover:border-blue-200 cursor-pointer transition"
                      onClick={() => handleViewReport(report)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-800">{report.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-gray-500">{new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs">
                              {report.category}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">Tap to view report</p>
                          
                          {/* AI Summary Card */}
                          <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                            <div className="flex items-start gap-2 mb-2">
                              <div className="w-5 h-5 rounded bg-purple-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs text-purple-600">AI</span>
                              </div>
                              <p className="text-xs text-purple-900">Summary</p>
                            </div>
                            <p className="text-xs text-purple-800 leading-relaxed">
                              Blood glucose: <span className="bg-red-100 text-red-700 px-1 rounded">145 mg/dL (High)</span> - Monitoring needed. Cholesterol levels normal.
                            </p>
                            <div className="mt-2 pt-2 border-t border-purple-200 flex items-start gap-1">
                              <AlertCircle className="w-3 h-3 text-purple-600 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-purple-600 italic">
                                AI is not a medical professional. Consult your doctor for advice.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredReports.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500">No reports in this category</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : viewSection === 'userUploads' ? (
          /* User Uploads View */
          <div className="space-y-3">
            {sortedUserUploads.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500">No documents uploaded yet</p>
                <p className="text-sm text-gray-400 mt-1">Upload your medical documents here</p>
              </div>
            ) : (
              sortedUserUploads.map(upload => (
                <div
                  key={upload.id}
                  onClick={() => handleViewFile(upload)}
                  className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-400 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-gray-800">{upload.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700">
                            Uploaded by Patient
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFile(upload);
                            }}
                            disabled={deletingId === upload.id}
                            className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            {deletingId === upload.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-500">{new Date(upload.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs">
                          {upload.category}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Main View - Three Sections */
          <div className="space-y-4">
            {/* Reports */}
            <button
              onClick={() => setViewSection('reports')}
              className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="text-gray-800">Reports</p>
                  <p className="text-xs text-gray-500">
                    {labReports.length} {labReports.length === 1 ? 'report' : 'reports'}
                  </p>
                </div>
              </div>
            </button>

            {/* User Uploads */}
            <button
              onClick={() => setViewSection('userUploads')}
              className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-amber-600" />
                </div>
                <div className="text-left">
                  <p className="text-gray-800">Uploaded by You</p>
                  <p className="text-xs text-gray-500">
                    {userUploads.length} {userUploads.length === 1 ? 'document' : 'documents'}
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl text-gray-800 mb-4">Upload Document</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Category *</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
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
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="When was this report taken?"
                />
                <p className="text-xs text-gray-500 mt-1">Enter the actual date of the report or visit</p>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Upload File (PDF/Image) *</label>
                <input
                  type="file"
                  id="file-upload"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-300 transition-colors cursor-pointer block"
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG up to 10MB</p>
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowUpload(false);
                    setUploadDocumentDate('');
                    setSelectedFile(null);
                    setUploadCategory('');
                  }}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!selectedFile || !uploadCategory || !uploadDocumentDate || uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}