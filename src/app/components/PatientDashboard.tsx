import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Calendar, Share2, Pill, LogOut, User, Bell, Upload } from 'lucide-react';
import { useApp } from '../App';
import { supabase } from '../../lib/supabase';

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { user, setUser } = useApp();
  const [recentActivities, setRecentActivities] = useState<Array<{
    id: string;
    type: 'visit' | 'upload';
    message: string;
    date: Date;
  }>>([]);

  // Initialize user profile on mount so patient ID persists after refresh
  useEffect(() => {
    if (!user) {
      const initializeUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) return;

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('unique_id, name, role')
          .eq('user_id', userId)
          .maybeSingle();

        if (profile) {
          setUser({
            id: profile.unique_id,
            name: profile.name,
            type: profile.role,
            unique_id: profile.unique_id
          });
        }
      };

      initializeUser();
    }
  }, [user, setUser]);

  // Fetch recent activities
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) return;

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('unique_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (!profile?.unique_id) return;

        const activities: Array<{ id: string; type: 'visit' | 'upload'; message: string; date: Date }> = [];

        // Fetch doctor visits
        const { data: visits } = await supabase
          .from('doctor_visits')
          .select('id, doctor_name, category, created_at')
          .eq('patient_unique_id', profile.unique_id)
          .order('created_at', { ascending: false })
          .limit(3);

        if (visits) {
          visits.forEach(v => {
            activities.push({
              id: `visit-${v.id}`,
              type: 'visit',
              message: `Doctor Visit - ${v.category || 'General'}`,
              date: new Date(v.created_at)
            });
          });
        }

        // Fetch user uploads
        const { data: uploads } = await supabase
          .from('user_uploads')
          .select('id, file_name, uploaded_at')
          .eq('user_id', userId)
          .order('uploaded_at', { ascending: false })
          .limit(3);

        if (uploads) {
          uploads.forEach(u => {
            activities.push({
              id: `upload-${u.id}`,
              type: 'upload',
              message: `${u.file_name} Uploaded`,
              date: new Date(u.uploaded_at)
            });
          });
        }

        // Sort by date and take latest 3
        const sorted = activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 3);
        setRecentActivities(sorted);
      } catch (err) {
        console.error('Failed to fetch recent activities:', err);
      }
    };

    fetchActivities();
  }, []);

  const handleLogout = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PatientDashboard.tsx:12',message:'Logout initiated',data:{hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    await supabase.auth.signOut();
    setUser(null);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PatientDashboard.tsx:15',message:'Logout completed, navigating to landing',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
              <User className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h1 className="text-lg text-gray-800">{user?.name || 'Patient'}</h1>
              <p className="text-xs text-gray-500">Patient ID: {user?.unique_id || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/notifications')} 
              className="p-2 hover:bg-gray-100 rounded-full relative"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-full">
              <LogOut className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto p-4 pt-6 space-y-6">
        {/* Quick Actions */}
        <div>
          <h3 className="text-gray-700 mb-3">Quick Access</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/my-records')}
              className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-sm text-gray-800 text-center">My Records</p>
            </button>

            <button
              onClick={() => navigate('/doctor-visits')}
              className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm text-gray-800 text-center">Doctor Visits</p>
            </button>

            <button
              onClick={() => navigate('/share-access')}
              className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mx-auto mb-3">
                <Share2 className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-sm text-gray-800 text-center">Share Access</p>
            </button>

            <button
              onClick={() => navigate('/medications')}
              className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center mx-auto mb-3">
                <Pill className="w-6 h-6 text-orange-600" />
              </div>
              <p className="text-sm text-gray-800 text-center">Medications</p>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h3 className="text-gray-700 mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {recentActivities.length === 0 ? (
              <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                <p className="text-sm text-gray-500">No recent activity</p>
              </div>
            ) : (
              recentActivities.map(activity => (
                <div key={activity.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full ${activity.type === 'visit' ? 'bg-green-50' : 'bg-blue-50'} flex items-center justify-center flex-shrink-0`}>
                      {activity.type === 'visit' ? (
                        <Calendar className="w-5 h-5 text-green-600" />
                      ) : (
                        <Upload className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">{activity.message}</p>
                      <p className="text-xs text-gray-500">
                        {(() => {
                          const now = new Date();
                          const diff = now.getTime() - activity.date.getTime();
                          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                          const hours = Math.floor(diff / (1000 * 60 * 60));
                          if (hours < 1) return 'Just now';
                          if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
                          if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
                          return activity.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}