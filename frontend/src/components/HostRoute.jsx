import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const HostRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const { showToast } = useToast();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const isAllowed = user.role === 'admin' || user.verificationStatus === 'approved';
  if (!isAllowed) {
    showToast({ type: 'warning', message: 'You must be verified by an admin to list properties.' });
    return <Navigate to="/verify-host" replace />;
  }

  return children;
};

export default HostRoute;


