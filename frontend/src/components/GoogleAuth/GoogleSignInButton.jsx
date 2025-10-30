import React from 'react';
import styles from './GoogleAuth.module.scss';

const GoogleSignInButton = ({ mode = 'signin' }) => {
  const [error, setError] = React.useState('');

  const handleGoogleAuth = async () => {
    try {
      // Check if Google OAuth is available
      const backendURL = window.REACT_APP_BACKEND_URL || 'http://localhost:5001';
      const response = await fetch(`${backendURL}/api/auth/google`);
      
      if (response.status === 501) {
        setError('Google OAuth is not configured yet. Please use email/password login.');
        return;
      }
      
      // Redirect to Google OAuth
      window.location.href = `${backendURL}/api/auth/google`;
    } catch (error) {
      console.error('Google OAuth error:', error);
      setError('Unable to connect to authentication service. Please try again.');
    }
  };

  return (
    <div className={styles.googleAuthContainer}>
      {error && (
        <div className={styles.errorMessage}>
          ⚠️ {error}
        </div>
      )}
      
      <button 
        onClick={handleGoogleAuth}
        className={styles.googleSignInBtn}
        type="button"
      >
        <div className={styles.googleIconWrapper}>
          <img 
            className={styles.googleIcon}
            src="https://developers.google.com/identity/images/g-logo.png"
            alt="Google"
          />
        </div>
        <span className={styles.btnText}>
          {mode === 'signin' ? 'Sign in with Google' : 'Sign up with Google'}
        </span>
      </button>
      
      <div className={styles.benefits}>
        <p className={styles.benefitText}>✓ Secure Google Authentication</p>
        <p className={styles.benefitText}>✓ No password required</p>
        <p className={styles.benefitText}>✓ Verified email address</p>
      </div>
    </div>
  );
};

// Authentication Success Handler Component
export const AuthSuccessHandler = () => {
  React.useEffect(() => {
    // Get token from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      // Redirect to login with error
      window.location.href = '/login?error=' + error;
      return;
    }

    if (token) {
      // Store token in localStorage
      localStorage.setItem('token', token);
      
      // Update auth context if available
      const authContext = window.AuthContext;
      if (authContext && authContext.setUser) {
        // Refresh auth status
        try {
          authContext.checkAuthStatus();
        } catch (e) {
          console.error('Error refreshing auth status:', e);
        }
      }

      // Redirect to home page
      window.location.href = '/';
    } else {
      // No token, redirect to login
      window.location.href = '/login';
    }
  }, []);

  return (
    <div className={styles.authSuccess}>
      <h2>Authentication Successful</h2>
      <p>Redirecting you to the application...</p>
    </div>
  );
};

export default GoogleSignInButton;