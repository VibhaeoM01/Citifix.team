import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Auth.module.scss';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const result = await signup(formData.email, formData.password, formData.name);
      if (result.success) {
        setSuccess('Account created successfully! Redirecting...');
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
    if (!formData.email || !formData.name) {
      setError('Please fill in all required fields first');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/request-signup-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: formData.email,
          name: formData.name 
        }),
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

  const handleOtpSignup = async (e) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter the OTP');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/signup-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: formData.email,
          name: formData.name,
          otp 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Account created successfully! Redirecting...');
        setTimeout(() => navigate('/'), 1500);
      } else {
        setError(data.message || 'Invalid OTP');
      }
    } catch (err) {
      setError('Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>Create Account</h1>
          <p className={styles.authSubtitle}>Join our smart city initiative</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {!showOtp ? (
          <form onSubmit={handleSubmit} className={styles.authForm}>
            <div className="form-group">
              <label htmlFor="name" className="form-label">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Enter your email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                className="form-input"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Create a password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                className="form-input"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Confirm your password"
              />
            </div>



            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSignup} className={styles.authForm}>
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
              {loading ? 'Verifying...' : 'Verify & Create Account'}
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
              Sign up with OTP
            </button>
          )}
          
          {showOtp && (
            <button
              onClick={() => setShowOtp(false)}
              className="btn btn-secondary"
              disabled={loading}
            >
              Back to Password Signup
            </button>
          )}
        </div>

        <div className={styles.authFooter}>
          <p>
            Already have an account?{' '}
            <Link to="/login" className={styles.authLink}>
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup; 