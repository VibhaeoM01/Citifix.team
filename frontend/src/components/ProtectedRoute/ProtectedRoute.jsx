import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';

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
    if (!isAdminAuthenticated() || !admin || !['admin', 'staff'].includes(admin.role)) {
      return <Navigate to="/admin/login" replace />;
    }
    return children;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;