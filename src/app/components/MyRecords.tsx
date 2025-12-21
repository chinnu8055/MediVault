import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FolderOpen, Upload, FileText, AlertCircle, History, Calendar } from 'lucide-react';

interface Record {
  id: string;
  name: string;
  date: string;
  category: string;
}

interface UserUpload {
  id: string;
  name: string;
  date: string;
  category: string;
  uploadedBy: string;
}

export default function MyRecords() {
  const navigate = useNavigate();
  const [showUpload, setShowUpload] = useState(false);
  const [viewSection, setViewSection] = useState<'main' | 'reports' | 'userUploads'>('main');
  const [reportFilter, setReportFilter] = useState<string>('all');
  const [uploadDocumentDate, setUploadDocumentDate] = useState<string>('');

  // Mock reports data (lab reports, radiology, etc.)
  const records: Record[] = [
    { id: '1', name: 'Blood Test Report', date: '2024-12-14', category: 'General' },
    { id: '2', name: 'X-Ray Scan', date: '2024-12-10', category: 'Orthopedic' },
    { id: '3', name: 'ECG Report', date: '2024-12-01', category: 'Cardiology' },
    { id: '4', name: 'Complete Blood Count', date: '2024-11-28', category: 'General' },
    { id: '5', name: 'Lipid Profile', date: '2024-11-15', category: 'Cardiology' },
  ];

  // User-uploaded documents (separate from doctor-added)
  const userUploads: UserUpload[] = [
    { id: 'u1', name: 'Previous Dental X-Ray', date: '2023-08-15', category: 'Dental', uploadedBy: 'patient' },
    { id: 'u2', name: 'Old Blood Report', date: '2023-06-20', category: 'General', uploadedBy: 'patient' },
  ];

  // Sort reports by date (most recent first)
  const sortedReports = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Filter reports by category
  const filteredReports = reportFilter === 'all' 
    ? sortedReports 
    : sortedReports.filter(r => r.category.toLowerCase() === reportFilter);
  
  // Get unique categories from reports
  const reportCategories = Array.from(new Set(records.map(r => r.category)));

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
          {viewSection !== 'main' && (
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
              {filteredReports.map(report => (
                <div key={report.id} className="bg-white rounded-xl p-4 shadow-sm">
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
                <div key={upload.id} className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-400">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-gray-800">{upload.name}</p>
                        <span className="px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700">
                          Uploaded by Patient
                        </span>
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
                    {records.length} {records.length === 1 ? 'report' : 'reports'}
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
                <select className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
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
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-300 transition-colors cursor-pointer">
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
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-500 text-white hover:bg-blue-600"
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