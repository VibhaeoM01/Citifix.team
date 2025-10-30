import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';

const AdminRoute = ({ children }) => {
  const { admin, isAdminAuthenticated } = useAuth();

  if (!isAdminAuthenticated() || !admin || !['admin', 'staff'].includes(admin.role)) {
    // Redirect unauthorized users to admin login page
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default AdminRoute;