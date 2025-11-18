import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getApiBaseUrl } from '@/services/invmisApi';


/**
 * SSO Login Page
 * Handles authentication when user comes from Digital System
 */
export default function SSOLogin() {
  const apiBase = getApiBaseUrl();

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setError('No authentication token provided');
      setLoading(false);
      return;
    }

    // Validate token with backend
    authenticateWithToken(token);
  }, [searchParams]);

  const authenticateWithToken = async (token: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔐 Validating SSO token from Digital System...');

      // Validate token with backend (Updated endpoint)
      const response = await fetch(`${apiBase}/auth/sso-validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Invalid or expired token');
      }

      const data = await response.json();

      if (data.success && data.user) {
        console.log('✅ SSO validation successful:', data.user.username);
        
        // Store user in auth context
        await login(data.user);
        
        // Store token in localStorage for API calls
        localStorage.setItem('sso_token', token);
        
        console.log('✅ SSO Authentication successful');
        
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('❌ SSO Authentication error:', error);
      setError(error instanceof Error ? error.message : 'Authentication failed');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="mt-4 text-xl font-semibold text-gray-700">
            Authenticating from Digital System...
          </h2>
          <p className="mt-2 text-gray-500">Please wait while we verify your credentials</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Authentication Failed
            </h3>
            <p className="mt-2 text-sm text-gray-500">{error}</p>
            <div className="mt-6">
              <a
                href="http://localhost:5000" // Your DS URL
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Return to Digital System
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
