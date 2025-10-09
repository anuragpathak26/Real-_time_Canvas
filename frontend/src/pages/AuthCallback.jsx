import React, { useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      // Store the token
      localStorage.setItem('token', token);
      
      // Verify the token and get user data
      const verifyToken = async () => {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            navigate('/dashboard');
          } else {
            throw new Error('Token verification failed');
          }
        } catch (error) {
          console.error('Auth callback error:', error);
          localStorage.removeItem('token');
          navigate('/login?error=oauth_error');
        }
      };
      
      verifyToken();
    } else {
      navigate('/login?error=oauth_failed');
    }
  }, [searchParams, navigate, setUser]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
        <h2 className="text-green-600 font-medium">Completing authentication...</h2>
        <p className="text-gray-500 mt-2">Please wait while we sign you in.</p>
      </div>
    </div>
  );
};
export default AuthCallback;
