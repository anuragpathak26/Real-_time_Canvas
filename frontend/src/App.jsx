import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CanvasRoom from './pages/CanvasRoom';
import NotFound from './pages/NotFound';
import Unauthorized from './pages/Unauthorized';
import AuthCallback from './pages/AuthCallback';

// Styles
import './styles/main.css';

function App() {
  return (
    <AuthProvider>
      <div className="app">
        <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/room/:roomId"
              element={
                <ProtectedRoute>
                  <CanvasRoom />
                </ProtectedRoute>
              }
            />
            
            {/* 404 - Not Found */}
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
