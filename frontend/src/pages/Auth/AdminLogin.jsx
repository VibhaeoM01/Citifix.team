
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './AdminLogin.module.scss';

const AdminLogin = () => {

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const secret = location.state?.secret || '';
  const { isAdminAuthenticated, admin, adminLogin } = useAuth();

  useEffect(() => {
    // Only redirect to /admin/secret if secret is missing and not already authenticated as admin
    if (!secret && !isAdminAuthenticated()) {
      navigate('/admin/secret');
    }
    // If already authenticated as admin, redirect to department dashboard
    if (isAdminAuthenticated() && admin && admin.department) {
      navigate(`/admin/${admin.department}`);
    }
  }, [secret, navigate, isAdminAuthenticated, admin]);
  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      // Use AuthContext's adminLogin to set context and localStorage
      const { success, admin: adminData, error: loginError } = await adminLogin(form.email, form.password);
      if (success && adminData && adminData.department) {
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => {
          navigate(`/admin/${adminData.department}`);
        }, 1200);
      } else if (success && adminData) {
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => {
          navigate('/admin');
        }, 1200);
      } else {
        setError(loginError || 'Invalid credentials or not an admin/staff');
      }
    } catch (err) {
      setError('Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <form onSubmit={handleSubmit} className={styles.loginForm}>
        <h2>Admin/Staff Login</h2>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Email"
          required
        />
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Password"
          required
        />
        <button type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
        {success && <div className={styles.success}>{success}</div>}
        {error && <div className={styles.error}>{error}</div>}
      </form>
      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <span>Not registered? </span>
        <button
          type="button"
          className="btn btn-link"
          style={{ color: '#667eea', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
          onClick={() => navigate('/admin/register', { state: { secret } })}
        >
          Go to Admin Register
        </button>
      </div>
    </div>
  );
};

export default AdminLogin;
