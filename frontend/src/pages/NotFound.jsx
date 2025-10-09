import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-green-600">404</h1>
        <h2 className="text-2xl font-bold text-gray-800 mt-4">Page Not Found</h2>
        <p className="text-gray-500 mt-2">The page you are looking for doesn't exist or has been moved.</p>
        <Link to="/" className="mt-6 inline-block bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-md transition-all">
          Go to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;