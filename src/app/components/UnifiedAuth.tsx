import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, User, Stethoscope, FlaskConical } from 'lucide-react';
import { useApp } from '../App';
import { supabase, generateUniqueId } from '../../lib/supabase';
import { toast } from 'sonner';

type UserType = 'patient' | 'doctor' | 'lab';
type Step = 'mobile' | 'otp' | 'register';

export default function UnifiedAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useApp();
  const [step, setStep] = useState<Step>('mobile');
  const [selectedRole, setSelectedRole] = useState<UserType | null>(null);
  const [mobileNumber, setMobileNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [otp, setOtp] = useState('');
  const [userExists, setUserExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userDetails, setUserDetails] = useState({
    name: '',
    age: '',
    gender: '',
    govId: '' // For doctor/lab
  });
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Demo mode - set to false when you have real Twilio credentials
  const DEMO_MODE = false;
  const DEMO_OTP = '123456';

  // Check for existing session on mount
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UnifiedAuth.tsx:34',message:'UnifiedAuth mount - checking redirect flow',data:{pathname:location.pathname,hasStateRole:!!location.state?.role,stateRole:location.state?.role,pendingRole:localStorage.getItem('pendingRole'),urlHash:window.location.hash,urlSearch:window.location.search},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    
    // Get role from landing page state OR from localStorage (for OAuth callback)
    const passedRole = (location.state?.role || localStorage.getItem('pendingRole')) as UserType;
    const hasOAuthHash = window.location.hash.includes('access_token') || window.location.hash.includes('code');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UnifiedAuth.tsx:40',message:'Role check result',data:{passedRole,fromState:!!location.state?.role,fromStorage:!!localStorage.getItem('pendingRole'),isValidRole:passedRole && ['patient', 'doctor', 'lab'].includes(passedRole),hasOAuthHash},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    if (passedRole && ['patient', 'doctor', 'lab'].includes(passedRole)) {
      setSelectedRole(passedRole);
      // Clear pendingRole from localStorage once we've used it
      if (localStorage.getItem('pendingRole')) {
        localStorage.removeItem('pendingRole');
      }
      
      // If this is an OAuth callback, wait for session to be established
      if (hasOAuthHash) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UnifiedAuth.tsx:50',message:'OAuth callback detected, waiting for session',data:{passedRole},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'H'})}).catch(()=>{});
        // #endregion
        // Wait for Supabase to process OAuth tokens and establish session
        const waitForSession = async () => {
          // Poll for session with timeout
          let attempts = 0;
          const maxAttempts = 10;
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 200));
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UnifiedAuth.tsx:57',message:'Session established after OAuth',data:{hasSession:!!session,userId:session?.user?.id,attempts},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'H'})}).catch(()=>{});
              // #endregion
              await checkSessionWithRole(passedRole);
              return;
            }
            attempts++;
          }
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UnifiedAuth.tsx:65',message:'Session not established after OAuth timeout',data:{attempts},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'H'})}).catch(()=>{});
          // #endregion
        };
        waitForSession();
      } else {
        // Check session immediately (not OAuth callback)
        checkSessionWithRole(passedRole).then(() => {
          // If no redirect happened, stop checking
          setIsCheckingSession(false);
        });
      }
    } else {
      setIsCheckingSession(false);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UnifiedAuth.tsx:70',message:'Redirecting to landing page - no role found',data:{pendingRoleInStorage:localStorage.getItem('pendingRole')},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'B,C'})}).catch(()=>{});
      // #endregion
      // If no role passed, redirect back to landing page
      navigate('/');
    }
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UnifiedAuth.tsx:60',message:'checkSession result',data:{hasSession:!!session,hasUser:!!session?.user,userId:session?.user?.id,currentSelectedRole:selectedRole},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    if (session?.user) {
      // User is already logged in, fetch their profile
      await fetchUserProfile(session.user.id, selectedRole);
    }
  };

  const checkSessionWithRole = async (role: UserType) => {
    const { data: { session } } = await supabase.auth.getSession();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UnifiedAuth.tsx:72',message:'checkSessionWithRole result',data:{hasSession:!!session,hasUser:!!session?.user,userId:session?.user?.id,role},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    if (session?.user && role) {
      // User is already logged in, fetch their profile
      await fetchUserProfile(session.user.id, role);
    } else {
      setIsCheckingSession(false);
    }
  };

  const fetchUserProfile = async (userId: string, roleOverride?: UserType) => {
    const roleToUse = roleOverride || selectedRole;
    setIsCheckingSession(true);
    try {
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId);

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UnifiedAuth.tsx:75',message:'fetchUserProfile result',data:{hasProfiles:!!profiles,profileCount:profiles?.length,error:error?.message,userId,selectedRole,roleToUse},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      if (error) {
        throw error;
      }

      const profile = profiles && profiles.length > 0 ? profiles[0] : null;

      if (profile) {
        setUser({
          id: profile.unique_id,
          name: profile.name,
          type: profile.role
        });
        navigateToDashboard(profile.role);
        return; // Don't set checking to false, we're redirecting
      } else if (roleToUse) {
        setIsCheckingSession(false);
        // User has session but no profile - show registration form
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UnifiedAuth.tsx:95',message:'No profile found, showing registration',data:{roleToUse},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        setStep('register');
        // Pre-fill name from OAuth if available
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.full_name || user?.user_metadata?.name) {
          setUserDetails({
            ...userDetails,
            name: user.user_metadata.full_name || user.user_metadata.name || ''
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setIsCheckingSession(false);
    }
  };

  const handleRoleSelection = (role: UserType) => {
    setSelectedRole(role);
    setStep('mobile');
  };

  const handleGoogleLogin = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UnifiedAuth.tsx:164',message:'handleGoogleLogin called',data:{selectedRole,DEMO_MODE,hasSelectedRole:!!selectedRole},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'I'})}).catch(()=>{});
    // #endregion
    if (!selectedRole) {
      toast.error('Please select a role first');
      return;
    }
    
    setLoading(true);
    try {
      // Check if user already has an active session
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UnifiedAuth.tsx:175',message:'Checking for existing session before OAuth',data:{hasExistingSession:!!existingSession,userId:existingSession?.user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'I'})}).catch(()=>{});
      // #endregion
      
      if (existingSession?.user) {
        // User already has a session - check profile and redirect
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UnifiedAuth.tsx:180',message:'Existing session found, checking profile',data:{userId:existingSession.user.id,selectedRole},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'I'})}).catch(()=>{});
        // #endregion
        await fetchUserProfile(existingSession.user.id, selectedRole);
        setLoading(false);
        return;
      }
      
      // For demo mode, show a message about Google OAuth setup
      if (DEMO_MODE) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UnifiedAuth.tsx:189',message:'DEMO_MODE is true - blocking OAuth',data:{DEMO_MODE},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        toast.error('Google OAuth requires Supabase configuration. Use phone OTP with demo mode instead!', {
          duration: 4000
        });
        setLoading(false);
        return;
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UnifiedAuth.tsx:203',message:'Initiating Google OAuth',data:{selectedRole,redirectTo:window.location.origin,currentUrl:window.location.href},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'I'})}).catch(()=>{});
      // #endregion
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            prompt: 'select_account', // Force account selection screen
            access_type: 'offline',
          }
        }
      });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UnifiedAuth.tsx:147',message:'signInWithOAuth response',data:{hasError:!!error,errorMessage:error?.message,errorCode:error?.status,hasData:!!data,dataUrl:data?.url,willRedirect:!!data?.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
      // #endregion

      if (error) {
        console.error('Google OAuth error:', error);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UnifiedAuth.tsx:152',message:'OAuth error occurred',data:{errorMessage:error.message,errorStatus:error.status,errorStack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        throw error;
      }
      
      // Store the role in localStorage so we can retrieve it after OAuth redirect
      localStorage.setItem('pendingRole', selectedRole);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UnifiedAuth.tsx:160',message:'Stored pendingRole, checking redirect',data:{pendingRole:selectedRole,dataUrl:data?.url,shouldRedirect:!!data?.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      
      // Check if we got a URL to redirect to
      if (data?.url) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UnifiedAuth.tsx:232',message:'Redirecting to OAuth URL',data:{redirectUrl:data.url,currentUrl:window.location.href},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'I'})}).catch(()=>{});
        // #endregion
        // Redirect to Google OAuth - modify URL to force account selection
        const oauthUrl = new URL(data.url);
        // Add prompt=select_account to force account selection screen (even if already logged in)
        oauthUrl.searchParams.set('prompt', 'select_account');
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UnifiedAuth.tsx:238',message:'About to redirect with modified URL',data:{originalUrl:data.url,modifiedUrl:oauthUrl.toString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'I'})}).catch(()=>{});
        // #endregion
        // Use window.location.replace to prevent back button issues
        window.location.replace(oauthUrl.toString());
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UnifiedAuth.tsx:170',message:'No redirect URL received from OAuth',data:{hasData:!!data,dataKeys:data ? Object.keys(data) : []},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        throw new Error('No redirect URL received from OAuth provider');
      }
      
      // The redirect will happen automatically
      // When user returns, we'll check if they have a profile or need to register
    } catch (error: any) {
      console.error('Google login error:', error);
      setLoading(false);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cd329395-d87c-4886-8fdf-9624597e57f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UnifiedAuth.tsx:178',message:'Error caught in handleGoogleLogin',data:{errorMessage:error?.message,errorType:error?.constructor?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      
      if (error.message?.includes('redirect')) {
        toast.error('Google OAuth not configured. Use phone login instead!', {
          duration: 4000
        });
      } else {
        toast.error(error.message || 'Failed to login with Google');
      }
    }
    // Don't set loading to false here if OAuth succeeds, as the page will redirect
  };

  const handleMobileSubmit = async () => {
    if (!mobileNumber || !selectedRole) return;
    
    setLoading(true);
    try {
      if (DEMO_MODE) {
        // Demo mode - skip actual OTP sending
        // Check if user profile exists
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('phone', `${countryCode}${mobileNumber}`);

        setUserExists(profiles && profiles.length > 0);
        setStep('otp');
        toast.success(`Demo Mode: Use OTP ${DEMO_OTP} to continue`);
      } else {
        // Production mode - send actual OTP
        const { data, error } = await supabase.auth.signInWithOtp({
          phone: `${countryCode}${mobileNumber}`,
          options: {
            channel: 'sms',
          }
        });

        if (error) throw error;

        // Check if user profile exists
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('phone', `${countryCode}${mobileNumber}`);

        setUserExists(profiles && profiles.length > 0);
        setStep('otp');
        toast.success('OTP sent to your phone');
      }
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerification = async () => {
    if (!otp || !mobileNumber) return;

    setLoading(true);
    try {
      if (DEMO_MODE) {
        // Demo mode - check if OTP matches
        if (otp !== DEMO_OTP) {
          toast.error(`Invalid OTP. Use ${DEMO_OTP} for demo mode`);
          setLoading(false);
          return;
        }

        // Create a mock session - for demo purposes, we'll simulate registration flow
        // Check if user has a profile
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('phone', `${countryCode}${mobileNumber}`);

        if (profiles && profiles.length > 0) {
          const profile = profiles[0];
          // Existing user - login
          setUser({
            id: profile.unique_id,
            name: profile.name,
            type: profile.role
          });
          navigateToDashboard(profile.role);
          toast.success('Login successful!');
        } else {
          // New user - go to registration
          setStep('register');
        }
      } else {
        // Production mode - verify actual OTP
        const { data, error } = await supabase.auth.verifyOtp({
          phone: `${countryCode}${mobileNumber}`,
          token: otp,
          type: 'sms'
        });

        if (error) throw error;

        if (data.user) {
          // Check if user has a profile
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .single();

          if (profile) {
            // Existing user - login
            setUser({
              id: profile.unique_id,
              name: profile.name,
              type: profile.role
            });
            navigateToDashboard(profile.role);
            toast.success('Login successful!');
          } else {
            // New user - go to registration
            setStep('register');
          }
        }
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      toast.error(error.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistration = async () => {
    if (!selectedRole) return;

    // Validate fields
    if (selectedRole === 'patient') {
      if (!userDetails.name || !userDetails.age || !userDetails.gender) {
        toast.error('Please fill in all fields');
        return;
      }
    } else {
      if (!userDetails.name || !userDetails.govId) {
        toast.error('Please fill in all fields');
        return;
      }
    }

    setLoading(true);
    try {
      if (DEMO_MODE) {
        // Demo mode - create profile without auth user
        // Generate unique ID
        const uniqueId = generateUniqueId(selectedRole);

        // Generate a valid UUID for demo mode
        const demoUserId = crypto.randomUUID();
        
        const profileData: any = {
          user_id: demoUserId,
          unique_id: uniqueId,
          name: userDetails.name,
          role: selectedRole,
          phone: `${countryCode}${mobileNumber}`,
        };

        if (selectedRole === 'patient') {
          profileData.age = parseInt(userDetails.age);
          profileData.gender = userDetails.gender;
        } else {
          profileData.gov_id = userDetails.govId;
        }

        const { data: profile, error } = await supabase
          .from('user_profiles')
          .insert([profileData])
          .select()
          .single();

        if (error) throw error;

        // Set user in context
        setUser({
          id: uniqueId,
          name: userDetails.name,
          type: selectedRole
        });

        toast.success('Registration successful!');
        navigateToDashboard(selectedRole);
      } else {
        // Production mode - require auth user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('No authenticated user found');
        }

        // Generate unique ID
        const uniqueId = generateUniqueId(selectedRole);

        // Create user profile
        const profileData: any = {
          user_id: user.id,
          unique_id: uniqueId,
          name: userDetails.name,
          role: selectedRole,
          phone: `${countryCode}${mobileNumber}`,
        };

        if (selectedRole === 'patient') {
          profileData.age = parseInt(userDetails.age);
          profileData.gender = userDetails.gender;
        } else {
          profileData.gov_id = userDetails.govId;
        }

        const { data: profile, error } = await supabase
          .from('user_profiles')
          .insert([profileData])
          .select()
          .single();

        if (error) throw error;

        // Set user in context
        setUser({
          id: uniqueId,
          name: userDetails.name,
          type: selectedRole
        });

        toast.success('Registration successful!');
        navigateToDashboard(selectedRole);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Check if it's an RLS policy error
      if (error.code === '42501') {
        toast.error('Database setup required. Redirecting to setup page...', {
          duration: 3000,
        });
        setTimeout(() => {
          navigate('/supabase-setup');
        }, 3000);
      } else {
        toast.error(error.message || 'Failed to register');
      }
    } finally {
      setLoading(false);
    }
  };

  const navigateToDashboard = (role?: UserType) => {
    if (role === 'patient') {
      navigate('/patient-dashboard');
    } else if (role === 'doctor') {
      navigate('/doctor-dashboard');
    } else {
      navigate('/lab-dashboard');
    }
  };

  const handleBack = () => {
    if (step === 'mobile') {
      navigate('/');
    } else if (step === 'otp' || step === 'register') {
      setStep('mobile');
      setOtp('');
    } else {
      navigate('/');
    }
  };

  const getRoleIcon = (role: UserType) => {
    switch (role) {
      case 'patient':
        return <User className="w-7 h-7 text-teal-600" />;
      case 'doctor':
        return <Stethoscope className="w-7 h-7 text-blue-600" />;
      case 'lab':
        return <FlaskConical className="w-7 h-7 text-purple-600" />;
    }
  };

  const getRoleBgColor = (role: UserType) => {
    switch (role) {
      case 'patient':
        return 'bg-teal-50';
      case 'doctor':
        return 'bg-blue-50';
      case 'lab':
        return 'bg-purple-50';
    }
  };

  const getRoleColor = (role: UserType) => {
    switch (role) {
      case 'patient':
        return 'teal';
      case 'doctor':
        return 'blue';
      case 'lab':
        return 'purple';
    }
  };

  // Show loading state while checking session/profile
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg text-gray-800">
              {step === 'mobile' && 'Enter Mobile Number'}
              {step === 'otp' && 'Verify OTP'}
              {step === 'register' && 'Complete Registration'}
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto p-4 pt-8">
        <div className="bg-white rounded-2xl shadow-md p-6 space-y-6">
          {step === 'mobile' && selectedRole && (
            <>
              <div className="flex flex-col items-center space-y-3">
                <div className={`w-16 h-16 rounded-full ${getRoleBgColor(selectedRole)} flex items-center justify-center`}>
                  {getRoleIcon(selectedRole)}
                </div>
                <h2 className="text-xl text-gray-800">
                  {selectedRole === 'patient' ? 'Patient Login' : selectedRole === 'doctor' ? 'Doctor Login' : 'Laboratory Login'}
                </h2>
                <p className="text-sm text-gray-500 text-center">
                  {selectedRole === 'patient' 
                    ? 'Enter your ABHA ID or mobile number' 
                    : 'Enter your mobile number or government ID'}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Mobile Number</label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="px-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    >
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+61">🇦🇺 +61</option>
                    </select>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      value={mobileNumber}
                      onChange={(e) => {
                        // Only allow digits
                        const value = e.target.value.replace(/\D/g, '');
                        setMobileNumber(value);
                      }}
                      maxLength={10}
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Enter 10-digit mobile number</p>
                </div>
                <button
                  onClick={handleMobileSubmit}
                  disabled={loading || mobileNumber.length !== 10}
                  className={`w-full bg-${getRoleColor(selectedRole)}-500 text-white py-3 rounded-xl hover:bg-${getRoleColor(selectedRole)}-600 transition-colors disabled:opacity-50`}
                  style={{
                    backgroundColor: selectedRole === 'patient' ? '#14b8a6' : selectedRole === 'doctor' ? '#3b82f6' : '#a855f7'
                  }}
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">or continue with</span>
                  </div>
                </div>

                {/* Google Sign-in Button */}
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full bg-white border-2 border-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </div>
            </>
          )}

          {step === 'otp' && selectedRole && (
            <>
              <div className="flex flex-col items-center space-y-3">
                <div className={`w-16 h-16 rounded-full ${getRoleBgColor(selectedRole)} flex items-center justify-center`}>
                  {getRoleIcon(selectedRole)}
                </div>
                <h2 className="text-xl text-gray-800">Verify OTP</h2>
                {userExists ? (
                  <p className="text-sm text-blue-700 bg-blue-50 px-4 py-2 rounded-lg text-center">
                    Account already exists. Please verify OTP to continue.
                  </p>
                ) : (
                  <p className="text-sm text-green-700 bg-green-50 px-4 py-2 rounded-lg text-center">
                    No account found. Create a new account to continue.
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Enter OTP</label>
                  <input
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-center text-2xl tracking-wider"
                  />
                </div>
                <button
                  onClick={handleOTPVerification}
                  className="w-full text-white py-3 rounded-xl transition-colors"
                  style={{
                    backgroundColor: selectedRole === 'patient' ? '#14b8a6' : selectedRole === 'doctor' ? '#3b82f6' : '#a855f7'
                  }}
                >
                  Verify & Continue
                </button>
                <button
                  onClick={() => setStep('mobile')}
                  className="w-full text-sm text-gray-600 hover:underline"
                >
                  Resend OTP
                </button>
              </div>
            </>
          )}

          {step === 'register' && selectedRole && (
            <>
              <div className="flex flex-col items-center space-y-3">
                <div className={`w-16 h-16 rounded-full ${getRoleBgColor(selectedRole)} flex items-center justify-center`}>
                  {getRoleIcon(selectedRole)}
                </div>
                <h2 className="text-xl text-gray-800">Welcome!</h2>
                <p className="text-sm text-green-700 bg-green-50 px-4 py-2 rounded-lg text-center">
                  No account found. Create a new account to continue.
                </p>
              </div>

              <div className="space-y-4">
                {selectedRole === 'patient' ? (
                  <>
                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">Full Name *</label>
                      <input
                        type="text"
                        placeholder="Enter your full name"
                        value={userDetails.name}
                        onChange={(e) => setUserDetails({...userDetails, name: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">Age *</label>
                      <input
                        type="number"
                        placeholder="Enter your age"
                        value={userDetails.age}
                        onChange={(e) => setUserDetails({...userDetails, age: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">Gender *</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['Male', 'Female', 'Other'].map((gender) => (
                          <button
                            key={gender}
                            onClick={() => setUserDetails({...userDetails, gender})}
                            className={`px-4 py-3 rounded-xl border-2 transition-colors ${
                              userDetails.gender === gender
                                ? 'border-teal-500 bg-teal-50 text-teal-700'
                                : 'border-gray-200 text-gray-700 hover:border-teal-200'
                            }`}
                          >
                            {gender}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">Full Name *</label>
                      <input
                        type="text"
                        placeholder="Enter your full name"
                        value={userDetails.name}
                        onChange={(e) => setUserDetails({...userDetails, name: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">
                        {selectedRole === 'doctor' ? 'Medical License Number *' : 'Laboratory License Number *'}
                      </label>
                      <input
                        type="text"
                        placeholder={selectedRole === 'doctor' ? 'Enter medical license number' : 'Enter laboratory license number'}
                        value={userDetails.govId}
                        onChange={(e) => setUserDetails({...userDetails, govId: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}

                <button
                  onClick={handleRegistration}
                  disabled={
                    selectedRole === 'patient' 
                      ? !userDetails.name || !userDetails.age || !userDetails.gender
                      : !userDetails.name || !userDetails.govId
                  }
                  className="w-full text-white py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: selectedRole === 'patient' ? '#14b8a6' : selectedRole === 'doctor' ? '#3b82f6' : '#a855f7'
                  }}
                >
                  Complete Registration
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}