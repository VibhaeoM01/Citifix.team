import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';


const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, admin, loading, isAdminAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (adminOnly) {
    if (!isAdminAuthenticated()) {
      return <Navigate to="/admin/login" replace />;
    }
    // Optionally, you can check for admin object existence
    if (!admin) {
      return <Navigate to="/admin/login" replace />;
    }
    return children;
  }

  // For user-only routes
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute; 