import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      verifyToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      setUser(response.data);
      setError(null);
    } catch (err) {
      if (!err.response) {
        console.error('Server connection failed:', err.message);
        setError('Cannot connect to server. Please ensure the backend is running on port 5000.');
      } else {
        console.error('Token verification failed:', err.response.status, err.response.data);
        localStorage.removeItem('token');
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithOAuth = async (provider) => {
    try {
      setError(null);
      window.location.href = `${API_BASE_URL}/auth/${provider}`;
    } catch (err) {
      console.error('OAuth login failed:', err);
      setError('OAuth login failed. Please try again.');
    }
  };

  const login = async (credentials) => {
    try {
      setError(null);
      console.log('🔥 Attempting login with:', { email: credentials.email, password: '***' });
      console.log('🔥 API URL:', `${API_BASE_URL}/auth/login`);
      
      const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000, // Increased timeout for production server
      });
      
      console.log('✅ Login successful:', response.data);
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      return { success: true };
    } catch (err) {
      console.error('❌ Login error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message,
        code: err.code
      });
      
      let errorMessage = 'Login failed';
      let debugInfo = '';
      
      if (!err.response) {
        if (err.code === 'ECONNREFUSED') {
          errorMessage = 'Cannot connect to server. The backend server appears to be down.';
          debugInfo = 'Check if the backend is running on the correct port.';
        } else if (err.code === 'ENOTFOUND') {
          errorMessage = 'Server not found. Please check the server URL.';
          debugInfo = `Trying to connect to: ${API_BASE_URL}`;
        } else {
          errorMessage = 'Network error. Please check your internet connection.';
          debugInfo = err.message;
        }
      } else {
        const status = err.response.status;
        const data = err.response.data;
        
        switch (status) {
          case 401:
            errorMessage = data?.message || 'Invalid credentials';
            debugInfo = 'This could be due to: wrong password, user not found, or database connection issues.';
            break;
          case 404:
            errorMessage = 'Login endpoint not found';
            debugInfo = 'The server may be misconfigured or the API route is missing.';
            break;
          case 500:
            errorMessage = 'Server error occurred';
            debugInfo = 'This is likely a database connection issue or server misconfiguration.';
            break;
          case 400:
            errorMessage = data?.message || 'Invalid request';
            debugInfo = 'Check that email and password are provided correctly.';
            break;
          default:
            errorMessage = data?.message || `Server error (${status})`;
            debugInfo = 'Unexpected server response.';
        }
      }
      
      console.error('🔧 Debug info:', debugInfo);
      setError(`${errorMessage}${debugInfo ? ` (${debugInfo})` : ''}`);
      return { success: false, error: errorMessage, debugInfo };
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      const response = await axios.post(`${API_BASE_URL}/auth/register`, userData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      return { success: true };
    } catch (err) {
      let errorMessage = 'Registration failed';
      if (!err.response) {
        errorMessage = 'Cannot connect to server. Please ensure the backend is running.';
      } else {
        errorMessage = err.response.data?.message || errorMessage;
      }
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  const updateProfile = async (userData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_BASE_URL}/users/profile`, userData, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      setUser(response.data);
      return { success: true };
    } catch (err) {
      let errorMessage = 'Update failed';
      if (!err.response) {
        errorMessage = 'Cannot connect to server. Please ensure the backend is running.';
      } else {
        errorMessage = err.response.data?.message || errorMessage;
      }
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const isAuthenticated = () => !!user;
  const hasRole = (role) => user?.role === role;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        loginWithOAuth,
        logout,
        updateProfile,
        isAuthenticated,
        hasRole,
        setUser,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export default AuthContext;