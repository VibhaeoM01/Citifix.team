import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import styles from './AdminDashboard.module.scss';

const AdminDashboard = () => {
  const [complaints, setComplaints] = useState([]);
  const [view, setView] = useState('list'); // 'list' or 'map'
  const [loading, setLoading] = useState(true);
  const { admin, adminToken, token: userToken } = useAuth();
  const navigate = useNavigate();

  // Check if user has admin/staff privileges
  useEffect(() => {
    if (!admin || !['admin', 'staff'].includes(admin.role)) {
      navigate('/admin/login', { replace: true });
    }
  }, [admin, navigate]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    resolved: 0,
    highUrgency: 0
  });

  const fetchComplaints = useCallback(async () => {
    try {
      const authToken = adminToken || userToken;
      const headers = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch('/api/admin/complaints', {
        headers
      });
      const data = await response.json();
      setComplaints(Array.isArray(data.complaints) ? data.complaints : []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  }, [adminToken, userToken]);

  const fetchStats = useCallback(async () => {
    try {
      const authToken = adminToken || userToken;
      const headers = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch('/api/admin/stats', {
        headers
      });
      const data = await response.json();
      setStats({
        total: data?.total ?? 0,
        pending: data?.pending ?? 0,
        resolved: data?.resolved ?? 0,
        highUrgency: data?.highUrgency ?? 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [adminToken, userToken]);

  useEffect(() => {
    fetchComplaints();
    fetchStats();
  }, [fetchComplaints, fetchStats]);

  const handleMarkAsNoted = async (complaintId) => {
    try {
      // Debug logging
      console.log('=== Start Mark as Noted Process ===');
      console.log('ComplaintId:', complaintId);
      
      // Find the complaint in the current state
      const complaint = complaints.find(c => c._id === complaintId);
      console.log('Found complaint:', complaint);
      
      if (!complaint) {
        throw new Error('Complaint not found in current state');
      }

      // Check if complaint is already noted
      if (complaint.status === 'noted') {
        alert('This complaint has already been marked as noted.');
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      console.log('API URL:', apiUrl);

  const authToken = adminToken || userToken;
      console.log('Authenticated with admin token:', !!adminToken);
  console.log('Authenticated with user token:', !!userToken);

      if (!authToken) {
        throw new Error('Authentication token not found');
      }

      console.log('Sending request to mark complaint as noted...');
      const response = await fetch(`${apiUrl}/complaints/${complaintId}/mark-noted`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          adminNotes: 'Complaint has been noted and assigned for action'
        })
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      const data = await response.json();
      console.log('Server response data:', data);

      if (!response.ok) {
        // Enhanced error handling
        const errorMessage = data.error || data.message || 'Unknown server error';
        console.error('Server returned error:', {
          status: response.status,
          error: errorMessage,
          data: data
        });
        throw new Error(errorMessage);
      }

      // Update the complaint status locally
      setComplaints(complaints.map(c => 
        c._id === complaintId 
          ? { ...c, status: 'noted', adminNotes: data.complaint.adminNotes }
          : c
      ));
      
      // Show detailed success message
      const emailStatus = data.emailNotification?.sent
        ? '✅ Email notification sent to user'
        : '⚠️ Email notification failed: ' + (data.emailNotification?.message || 'Unknown error');
      
      alert(`Complaint successfully marked as noted\n${emailStatus}`);
      
      // Refresh stats
      fetchStats();
      
    } catch (error) {
      console.error('Error marking complaint as noted:', error);
      
      // Show more detailed error message
      const errorMessage = error.message === 'Failed to fetch'
        ? 'Network error: Please check your internet connection'
        : error.message || 'An unexpected error occurred';
      
      alert(`Error: ${errorMessage}\nPlease try again or contact support if the problem persists.`);
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency.toLowerCase()) {
      case 'high': return '#dc2626';
      case 'medium': return '#ea580c';
      case 'low': return '#059669';
      default: return '#64748b';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ea580c'; // Orange/yellow for pending
      case 'noted': return '#059669'; // Green for noted (acknowledged)
      case 'resolved': return '#16a34a'; // Darker green for resolved
      default: return '#64748b'; // Gray for other statuses
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const handleClearAllComplaints = async () => {
    if (!window.confirm('⚠️ WARNING: This will permanently delete ALL complaints. Are you sure?')) {
      return;
    }
    
    try {
      const response = await fetch('/api/complaints/admin/clear-all', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken || userToken}`,
        }
      });

      const data = await response.json();
      if (response.ok) {
        alert(`Successfully cleared ${data.count} complaints`);
        // Refresh the complaints list and stats
        fetchComplaints();
        fetchStats();
      } else {
        throw new Error(data.message || 'Failed to clear complaints');
      }
    } catch (error) {
      console.error('Error clearing complaints:', error);
      alert('Failed to clear complaints: ' + error.message);
    }
  };

  return (
    <div className={styles.adminContainer}>
      <div className={styles.adminHeader}>
        <div className={styles.headerTop}>
          <h1 className={styles.adminTitle}>Admin Dashboard</h1>
          
          {/* Clear All Complaints Button - Moved to top */}
          {['admin', 'staff'].includes(admin?.role) && (
            <button
              onClick={handleClearAllComplaints}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              🗑️ Clear All Complaints
            </button>
          )}
        </div>

        <div className={styles.viewToggle}>
          <button
            className={`${styles.toggleBtn} ${view === 'list' ? styles.active : ''}`}
            onClick={() => setView('list')}
          >
            📋 List View
          </button>
          <button
            className={`${styles.toggleBtn} ${view === 'map' ? styles.active : ''}`}
            onClick={() => setView('map')}
          >
            🗺️ Map View
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>Total Complaints</h3>
          <p className={styles.statNumber}>{stats.total}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Pending</h3>
          <p className={styles.statNumber}>{stats.pending}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Resolved</h3>
          <p className={styles.statNumber}>{stats.resolved}</p>
        </div>
        <div className={styles.statCard}>
          <h3>High Urgency</h3>
          <p className={styles.statNumber}>{stats.highUrgency}</p>
        </div>
      </div>

      {view === 'list' ? (
        <div className={styles.complaintsList}>
          <h2>Complaints Management</h2>
          <div className={styles.complaintsGrid}>
            {complaints.map((complaint) => (
              <div key={complaint._id} className={styles.complaintCard}>
                <div className={styles.complaintHeader}>
                  <span 
                    className={styles.urgencyBadge}
                    style={{ backgroundColor: getUrgencyColor(complaint.urgency) }}
                  >
                    {complaint.urgency}
                  </span>
                  <span 
                    className={styles.statusBadge}
                    style={{ backgroundColor: getStatusColor(complaint.status) }}
                  >
                    {complaint.status}
                  </span>
                </div>
                
                <div className={styles.complaintImage}>
                  <img src={complaint.photoUrl} alt="Complaint" />
                </div>
                
                <div className={styles.complaintDetails}>
                  <h3>{complaint.category}</h3>
                  <p>{complaint.description}</p>
                  <p><strong>Location:</strong> {complaint.location}</p>
                  <p><strong>Submitted by:</strong> {complaint.userName}</p>
                  <p><strong>Date:</strong> {new Date(complaint.createdAt).toLocaleDateString()}</p>
                </div>

                <div className={styles.complaintActions}>
                  {complaint.status === 'pending' && (
                    <button
                      onClick={() => handleMarkAsNoted(complaint._id)}
                      className="btn btn-primary"
                    >
                      Mark as Noted
                    </button>
                  )}
                </div>
              </div>
            ))}
            {/* Remove the bottom clear button since we moved it to the top */}
          </div>
        </div>
      ) : (
        <div className={styles.mapContainer}>
          <div className={styles.mapPlaceholder}>
            <h3>🗺️ Map View</h3>
            <p>Interactive map showing complaint locations</p>
            <p>Map integration will be implemented with Mapbox or Leaflet.js</p>
            <div className={styles.mapStats}>
              <div className={styles.mapStat}>
                <span className={styles.mapStatNumber}>{complaints.length}</span>
                <span className={styles.mapStatLabel}>Total Complaints</span>
              </div>
              <div className={styles.mapStat}>
                <span className={styles.mapStatNumber}>
                  {complaints.filter(c => c.urgency === 'high').length}
                </span>
                <span className={styles.mapStatLabel}>High Priority</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard; 