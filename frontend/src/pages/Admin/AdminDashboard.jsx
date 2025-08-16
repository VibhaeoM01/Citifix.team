import { useState, useEffect } from 'react';
import styles from './AdminDashboard.module.scss';

const AdminDashboard = () => {
  const [complaints, setComplaints] = useState([]);
  const [view, setView] = useState('list'); // 'list' or 'map'
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    resolved: 0,
    highUrgency: 0
  });

  useEffect(() => {
    fetchComplaints();
    fetchStats();
  }, []);

  const fetchComplaints = async () => {
    try {
      const response = await fetch('/api/admin/complaints', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setComplaints(data.complaints);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleMarkAsNoted = async (complaintId) => {
    try {
      const response = await fetch(`/api/admin/complaints/${complaintId}/noted`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        // Update the complaint status locally
        setComplaints(complaints.map(complaint => 
          complaint._id === complaintId 
            ? { ...complaint, status: 'noted' }
            : complaint
        ));
        fetchStats(); // Refresh stats
      }
    } catch (error) {
      console.error('Error marking as noted:', error);
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
      case 'pending': return '#ea580c';
      case 'noted': return '#3b82f6';
      case 'resolved': return '#059669';
      default: return '#64748b';
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className={styles.adminContainer}>
      <div className={styles.adminHeader}>
        <h1 className={styles.adminTitle}>Admin Dashboard</h1>
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