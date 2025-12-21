import { useNavigate, useLocation } from 'react-router-dom';
import { User, Stethoscope, FlaskConical } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOAuthCallback, setIsOAuthCallback] = useState(false);
  
  // Handle OAuth callback redirect
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPage.tsx:11',message:'LandingPage mount - checking for OAuth callback',data:{pathname:location.pathname,urlHash:window.location.hash,urlSearch:window.location.search,pendingRole:localStorage.getItem('pendingRole')},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    
    // Check if this is an OAuth callback (has hash params or pendingRole in localStorage)
    const pendingRole = localStorage.getItem('pendingRole');
    const hasAuthHash = window.location.hash.includes('access_token') || window.location.hash.includes('code');
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPage.tsx:17',message:'OAuth callback detection',data:{pendingRole,hasAuthHash,willRedirect:!!pendingRole},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    
    if (pendingRole && (hasAuthHash || window.location.search.includes('code'))) {
      // This is an OAuth callback - hide content and redirect immediately
      setIsOAuthCallback(true);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPage.tsx:22',message:'OAuth callback detected, waiting for session',data:{pendingRole},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'H'})}).catch(()=>{});
      // #endregion
      
      // Wait for Supabase to process the OAuth tokens and establish session
      const checkSessionAndRedirect = async () => {
        // Give Supabase time to process the tokens
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: { session } } = await supabase.auth.getSession();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPage.tsx:29',message:'Session check after OAuth callback',data:{hasSession:!!session,hasUser:!!session?.user,userId:session?.user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'H'})}).catch(()=>{});
        // #endregion
        
        // Redirect to /auth with the role
        navigate('/auth', { state: { role: pendingRole }, replace: true });
      };
      
      checkSessionAndRedirect();
    } else {
      // Check for existing session
      supabase.auth.getSession().then(({ data: { session } }) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPage.tsx:40',message:'LandingPage session check',data:{hasSession:!!session,hasUser:!!session?.user,userId:session?.user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
      });
    }
  }, [location, navigate]);
  // #endregion

  // Don't render content during OAuth callback to prevent flash
  if (isOAuthCallback) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-gray-600">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-teal-100 to-blue-100 mb-4">
            <Stethoscope className="w-10 h-10 text-teal-600" />
          </div>
          <h1 className="text-3xl text-gray-800">HealthCare Portal</h1>
          <p className="text-gray-600">Secure, patient-first healthcare platform</p>
        </div>

        {/* Login Options */}
        <div className="space-y-4">
          <button
            onClick={() => navigate('/auth', { state: { role: 'patient' } })}
            className="w-full bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all flex items-center gap-4 group"
          >
            <div className="w-14 h-14 rounded-xl bg-teal-50 flex items-center justify-center group-hover:bg-teal-100 transition-colors">
              <User className="w-7 h-7 text-teal-600" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-gray-800">Login as Patient</h3>
              <p className="text-sm text-gray-500">Access your health records</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/auth', { state: { role: 'doctor' } })}
            className="w-full bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all flex items-center gap-4 group"
          >
            <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <Stethoscope className="w-7 h-7 text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-gray-800">Login as Doctor</h3>
              <p className="text-sm text-gray-500">View patient records</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/auth', { state: { role: 'lab' } })}
            className="w-full bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all flex items-center gap-4 group"
          >
            <div className="w-14 h-14 rounded-xl bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
              <FlaskConical className="w-7 h-7 text-purple-600" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-gray-800">Login as Laboratory</h3>
              <p className="text-sm text-gray-500">Upload test reports</p>
            </div>
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-8">
          Your data is secure and encrypted
        </p>
      </div>
    </div>
  );
}