import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Auth.module.scss';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await login(email, password);
      if (result.success) {
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => navigate('/'), 1500);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpRequest = async () => {
    if (!email) {
      setError('Please enter your email first');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowOtp(true);
        setSuccess('OTP sent to your email!');
      } else {
        setError(data.message || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpLogin = async (e) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter the OTP');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/login-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => navigate('/'), 1500);
      } else {
        setError(data.message || 'Invalid OTP');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>Welcome Back</h1>
          <p className={styles.authSubtitle}>Sign in to your account</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {!showOtp ? (
          <form onSubmit={handleSubmit} className={styles.authForm}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                id="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                type="password"
                id="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpLogin} className={styles.authForm}>
            <div className="form-group">
              <label htmlFor="otp" className="form-label">OTP Code</label>
              <input
                type="text"
                id="otp"
                className="form-input"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                placeholder="Enter OTP from your email"
                maxLength="6"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        )}

        <div className={styles.authActions}>
          {!showOtp && (
            <button
              onClick={handleOtpRequest}
              className="btn btn-secondary"
              disabled={loading}
            >
              Login with OTP
            </button>
          )}
          
          {showOtp && (
            <button
              onClick={() => setShowOtp(false)}
              className="btn btn-secondary"
              disabled={loading}
            >
              Back to Password Login
            </button>
          )}
        </div>

        <div className={styles.authFooter}>
          <p>
            Don't have an account?{' '}
            <Link to="/signup" className={styles.authLink}>
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 