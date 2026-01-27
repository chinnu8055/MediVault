import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, createContext, useContext } from 'react';
import { Toaster } from 'sonner';
import LandingPage from './components/LandingPage';
import UnifiedAuth from './components/UnifiedAuth';
import ProtectedRoute from './components/ProtectedRoute';
import PatientDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import LaboratoryDashboard from './components/LaboratoryDashboard';
import MyRecords from './components/MyRecords';
import DoctorVisits from './components/DoctorVisits';
import ShareAccess from './components/ShareAccess';
import Medications from './components/Medications';
import ViewPatientRecords from './components/ViewPatientRecords';
import Notifications from './components/Notifications';
import UploadOldDocuments from './components/UploadOldDocuments';
import VisitHistory from './components/VisitHistory';
import ActivePatients from './components/ActivePatients';
import SupabaseSetup from './components/SupabaseSetup';
import PatientVisitLookup from './components/PatientVisitLookup';

interface User {
  id: string;
  name: string;
  type: 'patient' | 'doctor' | 'lab';
  unique_id?: string;
}

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

const AppContext = createContext<AppContextType>({ user: null, setUser: () => {} });

export const useApp = () => useContext(AppContext);

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  return (
    <AppContext.Provider value={{ user, setUser }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<UnifiedAuth />} />
          <Route path="/patient-dashboard" element={<ProtectedRoute element={<PatientDashboard />} />} />
          <Route path="/my-records" element={<ProtectedRoute element={<MyRecords />} />} />
          <Route path="/doctor-visits" element={<ProtectedRoute element={<DoctorVisits />} />} />
          <Route path="/share-access" element={<ProtectedRoute element={<ShareAccess />} />} />
          <Route path="/medications" element={<ProtectedRoute element={<Medications />} />} />
          <Route path="/doctor-dashboard" element={<ProtectedRoute element={<DoctorDashboard />} />} />
          <Route path="/active-patients" element={<ProtectedRoute element={<ActivePatients />} />} />
          <Route path="/view-patient-records" element={<ProtectedRoute element={<ViewPatientRecords />} />} />
          <Route path="/lab-dashboard" element={<ProtectedRoute element={<LaboratoryDashboard />} />} />
          <Route path="/notifications" element={<ProtectedRoute element={<Notifications />} />} />
          <Route path="/upload-old-documents" element={<ProtectedRoute element={<UploadOldDocuments />} />} />
          <Route path="/visit-history" element={<ProtectedRoute element={<VisitHistory />} />} />
          <Route path="/patient-visit-lookup" element={<ProtectedRoute element={<PatientVisitLookup />} />} />
          <Route path="/supabase-setup" element={<SupabaseSetup />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </AppContext.Provider>
  );
}