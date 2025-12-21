import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, FlaskConical, Upload, CheckCircle, FileText } from 'lucide-react';
import { useApp } from '../App';
import { supabase } from '../../lib/supabase';

interface UploadedReport {
  id: string;
  patientId: string;
  category: string;
  fileName: string;
  uploadedAt: Date;
}

export default function LaboratoryDashboard() {
  const navigate = useNavigate();
  const { user, setUser } = useApp();
  const [showUpload, setShowUpload] = useState(false);
  const [upload, setUpload] = useState({
    patientId: '',
    category: '',
    fileName: ''
  });

  const [uploads, setUploads] = useState<UploadedReport[]>([
    {
      id: '1',
      patientId: 'P123456',
      category: 'General',
      fileName: 'Blood Test Report.pdf',
      uploadedAt: new Date('2024-12-16T10:30:00')
    },
    {
      id: '2',
      patientId: 'P789012',
      category: 'Cardiology',
      fileName: 'ECG Report.pdf',
      uploadedAt: new Date('2024-12-15T14:20:00')
    }
  ]);

  const handleLogout = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LaboratoryDashboard.tsx:41',message:'Logout initiated',data:{hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    await supabase.auth.signOut();
    setUser(null);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LaboratoryDashboard.tsx:44',message:'Logout completed, navigating to landing',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    navigate('/');
  };

  const handleUpload = () => {
    if (upload.patientId && upload.category && upload.fileName) {
      const newUpload: UploadedReport = {
        id: Date.now().toString(),
        patientId: upload.patientId,
        category: upload.category,
        fileName: upload.fileName,
        uploadedAt: new Date()
      };
      setUploads([newUpload, ...uploads]);
      setUpload({ patientId: '', category: '', fileName: '' });
      setShowUpload(false);
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
              <p className="text-xs text-gray-500">Diagnostic Center</p>
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
            {uploads.map(report => (
              <div key={report.id} className="bg-white rounded-2xl p-5 shadow-md">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-800">{report.fileName}</p>
                    <p className="text-xs text-gray-500 mt-1">Patient ID: {report.patientId}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs">
                    {report.category}
                  </span>
                  <span className="text-xs text-gray-500">
                    {report.uploadedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {uploads.length === 0 && (
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
                <label className="text-sm text-gray-600 mb-1 block">Upload File (PDF/Image) *</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-purple-300 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG up to 10MB</p>
                  <input
                    type="text"
                    placeholder="File name (for demo)"
                    value={upload.fileName}
                    onChange={(e) => setUpload({...upload, fileName: e.target.value})}
                    className="w-full mt-3 px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                </div>
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
                  disabled={!upload.patientId || !upload.category || !upload.fileName}
                  className="flex-1 px-4 py-3 rounded-xl bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Upload Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
