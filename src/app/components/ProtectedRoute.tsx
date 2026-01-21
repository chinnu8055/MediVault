import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface ProtectedRouteProps {
  element: React.ReactElement;
}

export default function ProtectedRoute({ element }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user has a valid session
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Redirect to landing page if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Render the protected element if authenticated
  return element;
}
