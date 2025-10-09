import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-green-600">401</h1>
        <h2 className="text-2xl font-bold text-gray-800 mt-4">Unauthorized Access</h2>
        <p className="text-gray-500 mt-2">You don't have permission to access this page.</p>
        <div className="mt-6 flex gap-4 justify-center">
          <Link to="/login" className="mt-6 inline-block bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-md transition-all">
            Go to Login
          </Link>
          <Link to="/" className="mt-3 inline-block text-green-600 hover:text-green-700 font-medium">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;