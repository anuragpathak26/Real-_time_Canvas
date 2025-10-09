import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { INPUT_WRAPPER, INPUT_FIELD, TOGGLE_BUTTON, BUTTON_PRIMARY } from '../styles/constants';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const { name, email, password, confirmPassword } = formData;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      return setError('Please fill in all fields.');
    }

    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    if (password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }

    try {
      setLoading(true);
      await register({ name, email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create an account.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">C</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
          <p className="text-gray-600">Join the collaborative canvas community</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md text-sm text-red-700 bg-red-100 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <div className={INPUT_WRAPPER}>
              <input
                id="name"
                name="name"
                type="text"
                value={name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className={INPUT_FIELD}
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className={INPUT_WRAPPER}>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={handleChange}
                placeholder="Enter your email"
                className={INPUT_FIELD}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className={INPUT_WRAPPER}>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handleChange}
                placeholder="Enter your password"
                className={INPUT_FIELD}
                required
              />
              <button
                type="button"
                className={TOGGLE_BUTTON}
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <div className={INPUT_WRAPPER}>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                className={INPUT_FIELD}
                required
              />
              <button
                type="button"
                className={TOGGLE_BUTTON}
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label="Toggle confirm password visibility"
              >
                {showConfirm ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className={BUTTON_PRIMARY}
            disabled={loading}
          >
            {loading ? (
              <span className="animate-spin border-b-2 border-white rounded-full w-5 h-5 inline-block mr-2"></span>
            ) : null}
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-green-600 hover:text-green-700 font-medium transition-colors">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
