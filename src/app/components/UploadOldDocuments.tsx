import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, CheckCircle, X } from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  category: string;
  type: string;
  size: string;
  date: Date;
}

export default function UploadOldDocuments() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const categories = [
    'Dental',
    'Gynecology', 
    'Cardiology',
    'Orthopedic',
    'General',
    'Other'
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile && selectedCategory) {
      const newFile: UploadedFile = {
        id: Date.now().toString(),
        name: selectedFile.name,
        category: selectedCategory,
        type: selectedFile.type.includes('pdf') ? 'PDF' : 'Image',
        size: (selectedFile.size / 1024 / 1024).toFixed(2) + ' MB',
        date: new Date()
      };
      
      setUploadedFiles([newFile, ...uploadedFiles]);
      setSelectedFile(null);
      setSelectedCategory('');
      
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles(uploadedFiles.filter(f => f.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/patient-dashboard')} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg text-gray-800">Upload Old Documents</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto p-4 pt-6 space-y-6">
        {/* Upload Section */}
        <div className="bg-white rounded-2xl p-5 shadow-md space-y-4">
          <h3 className="text-gray-800">Upload Document</h3>
          
          <div>
            <label className="text-sm text-gray-600 mb-2 block">Select Category *</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Choose a category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-2 block">Select File (PDF/Image) *</label>
            <input
              id="file-upload"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className="block border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-amber-300 transition-colors cursor-pointer"
            >
              {selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-8 h-8 text-amber-600" />
                  <p className="text-sm text-gray-800">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG up to 10MB</p>
                </>
              )}
            </label>
          </div>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || !selectedCategory}
            className="w-full bg-amber-500 text-white py-3 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Upload Document
          </button>
        </div>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div>
            <h3 className="text-gray-700 mb-3">Recently Uploaded</h3>
            <div className="space-y-3">
              {uploadedFiles.map(file => (
                <div key={file.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 truncate">{file.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs">
                          {file.category}
                        </span>
                        <span className="text-xs text-gray-500">{file.type}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">{file.size}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {file.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-2 hover:bg-gray-100 rounded-full flex-shrink-0"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {uploadedFiles.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">No documents uploaded yet</p>
            <p className="text-sm text-gray-400 mt-1">Upload your old medical documents here</p>
          </div>
        )}
      </div>
    </div>
  );
}
