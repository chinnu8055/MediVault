import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Upload, FileText } from 'lucide-react';

interface Visit {
  id: string;
  date: string;
  doctor: string;
  category: string;
  diagnosis: string;
  prescription: string[];
}

export default function DoctorVisits() {
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadDocumentDate, setUploadDocumentDate] = useState<string>('');

  const visits: Visit[] = [
    {
      id: '1',
      date: '2024-12-11',
      doctor: 'Dr. Sarah Johnson',
      category: 'General',
      diagnosis: 'Seasonal allergies and mild fever',
      prescription: ['Cetirizine 10mg - Once daily', 'Paracetamol 500mg - Thrice daily']
    },
    {
      id: '2',
      date: '2024-11-28',
      doctor: 'Dr. Michael Chen',
      category: 'Cardiology',
      diagnosis: 'Routine heart checkup - All normal',
      prescription: ['Continue regular exercise', 'Maintain healthy diet']
    },
    {
      id: '3',
      date: '2024-11-15',
      doctor: 'Dr. Emily Roberts',
      category: 'Dental',
      diagnosis: 'Dental cleaning and checkup',
      prescription: ['Regular brushing twice daily']
    },
    {
      id: '4',
      date: '2024-10-20',
      doctor: 'Dr. Sarah Johnson',
      category: 'General',
      diagnosis: 'Annual physical examination',
      prescription: ['All vitals normal', 'Continue current lifestyle']
    }
  ];

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
          <button 
            onClick={() => setShowUpload(true)}
            className="px-3 py-2 rounded-xl bg-green-50 text-green-600 text-sm hover:bg-green-100 flex items-center gap-1"
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
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

      {/* Upload Modal */}
      {showUpload && (
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