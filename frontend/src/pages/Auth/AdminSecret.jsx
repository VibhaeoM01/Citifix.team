import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AdminSecret.module.scss';

const AdminSecret = () => {
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    // Call backend to check secret
    try {
      const response = await fetch('/api/auth/check-secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret })
      });
      const data = await response.json();
      if (response.ok && data.valid) {
        // If new user, go to dept info page, else to admin dashboard
        if (data.isNewUser) {
          navigate('/admin/login', { state: { secret } });
        } else {
          navigate(`/admin/${data.department}`);
        }
      } else {
        setError(data.message || 'Invalid secret number');
      }
    } catch (err) {
      setError('Server error. Please try again.');
      console.log(err);
    }
  };

  return (
    <div className={styles.secretContainer}>
      <form onSubmit={handleSubmit} className={styles.secretForm}>
        <h2>Enter Admin/Staff Secret Number</h2>
        <input
          type="password"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          placeholder="Secret Number"
          required
        />
        <button type="submit">Continue</button>
        {error && <div className={styles.error}>{error}</div>}
      </form>
    </div>
  );
};

export default AdminSecret;
