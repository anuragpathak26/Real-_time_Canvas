import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Prefer env; fallback to deployed API with /api suffix
  const API_BASE_URL = (process.env.REACT_APP_API_URL?.replace(/\/$/, '')) || 'https://real-time-canvas-backend-wd2v.onrender.com/api';
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Simple retry helper (1 retry after delay)
  const withRetry = async (fn, { retries = 1, delayMs = 3000 } = {}) => {
    try {
      return await fn();
    } catch (e) {
      if (retries <= 0) throw e;
      await new Promise((r) => setTimeout(r, delayMs));
      return withRetry(fn, { retries: retries - 1, delayMs });
    }
  };

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
      const response = await withRetry(() => axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 20000,
      }));
      setUser(response.data);
      setError(null);
    } catch (err) {
      if (!err.response) {
        console.error('Server connection failed:', err.message);
        setError('Cannot connect to server. Please try again in a moment.');
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
      
      const response = await withRetry(() => axios.post(`${API_BASE_URL}/auth/login`, credentials, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 20000,
      }));
      
      console.log('Login successful:', response.data);
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      return { success: true };
    } catch (err) {
      console.error('Login error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message,
        code: err.code
      });
      
      let errorMessage = 'Login failed';
      let debugInfo = '';
      
      if (!err.response) {
        if (err.code === 'ECONNABORTED') {
          errorMessage = 'Server took too long to respond.';
          debugInfo = 'Cold start or network latency.';
        } else if (err.code === 'ECONNREFUSED') {
          errorMessage = 'Cannot connect to server. The backend appears down.';
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
            break;
          case 404:
            errorMessage = 'Login endpoint not found';
            debugInfo = `Check API_BASE_URL (${API_BASE_URL}) includes /api`;
            break;
          case 500:
            errorMessage = 'Server error occurred';
            break;
          case 400:
            errorMessage = data?.message || 'Invalid request';
            break;
          default:
            errorMessage = data?.message || `Server error (${status})`;
        }
      }
      
      console.error('Debug info:', debugInfo);
      setError(`${errorMessage}${debugInfo ? ` (${debugInfo})` : ''}`);
      return { success: false, error: errorMessage, debugInfo };
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      const response = await withRetry(() => axios.post(`${API_BASE_URL}/auth/register`, userData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 20000,
      }));
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      return { success: true };
    } catch (err) {
      let errorMessage = 'Registration failed';
      if (!err.response) {
        errorMessage = 'Cannot connect to server. Please try again shortly.';
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
      const response = await withRetry(() => axios.put(`${API_BASE_URL}/users/profile`, userData, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 20000,
      }));
      setUser(response.data);
      return { success: true };
    } catch (err) {
      let errorMessage = 'Update failed';
      if (!err.response) {
        errorMessage = 'Cannot connect to server. Please try again shortly.';
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