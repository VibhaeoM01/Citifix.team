import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import styles from './AdminDashboard.module.scss';

const AdminDeptDashboard = () => {
  const { dept } = useParams();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { adminToken, token: userToken } = useAuth();

  useEffect(() => {
    const fetchComplaints = async () => {
      setLoading(true);
      setError('');
      try {
        // Check both possible token locations
        const authToken = adminToken || userToken;
        console.log('Using admin token for department fetch:', !!adminToken);
        console.log('Using user token for department fetch:', !!userToken);
        console.log('Resolved token:', authToken ? authToken.substring(0, 50) + '...' : 'No token');
        
        if (!authToken) {
          throw new Error('No authentication token available');
        }
        
        console.log('Fetching complaints for department:', dept);
        const response = await fetch(`/api/complaints/department/${dept}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.status === 401 || response.status === 403) {
          console.log('Authentication error:', response.status);
          navigate('/admin/login', { replace: true });
          return;
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Server response:', errorText);
          let errorMessage;
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorJson.error || 'Unknown error';
          } catch {
            errorMessage = errorText;
          }
          throw new Error(`Server Error (${response.status}): ${errorMessage}`);
        }
        
        const data = await response.json();
        console.log('Fetched complaints:', data);
        setComplaints(data.complaints || []);
      } catch (err) {
        console.error('Fetch complaints error:', err);
        setError('Failed to fetch complaints: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchComplaints();
  }, [dept, adminToken, userToken, navigate]);

  const handleMarkAsNoted = async (complaintId) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      
      // Use the same token logic as fetchComplaints
      const authToken = adminToken || userToken;
      console.log('Using admin token for mark-as-noted:', !!adminToken);
      console.log('Using user token for mark-as-noted:', !!userToken);
      console.log('Resolved token:', authToken ? authToken.substring(0, 50) + '...' : 'No token');
      if (!authToken) {
        throw new Error('No authentication token available');
      }

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

      console.log('API Response status:', response.status);
      console.log('API Response headers:', response.headers);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Complaint marked as noted:', data);
        
        // Update the complaint status locally
        setComplaints(complaints.map(complaint => 
          complaint._id === complaintId 
            ? { ...complaint, status: 'noted' }
            : complaint
        ));
        
        // Show success message with email status
        const emailStatus = data.emailNotification 
          ? (data.emailNotification.sent 
            ? '\n✅ Email notification sent to user' 
            : '\n⚠️ Email notification failed: ' + data.emailNotification.message)
          : '\n⚠️ No email notification status available';
        alert(data.message + emailStatus);
        
      } else {
        console.log('API Error response:', response);
        let errorMessage = 'Unknown error occurred';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || 'API request failed';
          console.log('Error data:', errorData);
        } catch (parseError) {
          console.log('Could not parse error response:', parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        console.log('Final error message being shown:', errorMessage);
        alert('Failed to mark complaint as noted: ' + errorMessage);
      }
    } catch (error) {
      console.error('Network/fetch error:', error);
      alert('Network error: ' + error.message + '. Please check if the backend server is running.');
    }
  };

  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const getPhotoUrl = (photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith('http')) return photoPath;
    
    // Get the base URL from environment variable
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    
    // Remove any leading slashes from the photo path
    const cleanPath = photoPath.replace(/^\/+/, '');
    
    // Construct the full URL
    return `${baseUrl}/${cleanPath}`;
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency?.toLowerCase()) {
      case 'high': return '#dc2626';
      case 'medium': return '#ea580c';
      case 'low': return '#059669';
      default: return '#64748b';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ea580c';
      case 'noted': return '#059669';
      case 'resolved': return '#16a34a';
      default: return '#64748b';
    }
  };

  return (
    <div className={styles.adminContainer}>
      <div className={styles.adminHeader}>
        <h1 className={styles.adminTitle}>{dept} Department Complaints</h1>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div className="error">{error}</div>}
      
      <div className={styles.complaintsList}>
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
                {complaint.photo && (
                  <img 
                    src={getPhotoUrl(complaint.photo)}
                    alt="Complaint" 
                    onClick={() => setSelectedComplaint(complaint)}
                    style={{ cursor: 'pointer' }}
                    onError={(e) => {
                      console.error('Failed to load image:', complaint.photo);
                      e.target.src = 'https://via.placeholder.com/300x200?text=Image+Not+Found';
                    }}
                  />
                )}
              </div>
              
              <div className={styles.complaintDetails}>
                <h3>{complaint.category}</h3>
                <p><strong>Description:</strong> {complaint.description}</p>
                <p><strong>Location:</strong> {complaint.location}</p>
                <p><strong>Submitted by:</strong> {complaint.user?.name || 'Anonymous'}</p>
                <p><strong>Date:</strong> {new Date(complaint.createdAt).toLocaleDateString()}</p>
                {complaint.mlResults?.caption && (
                  <p><strong>AI Analysis:</strong> {complaint.mlResults.caption}</p>
                )}
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

      {selectedComplaint && (
        <div className={styles.imageModal} onClick={() => setSelectedComplaint(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <span className={styles.closeButton} onClick={() => setSelectedComplaint(null)}>×</span>
            <img 
              src={getPhotoUrl(selectedComplaint.photo)} 
              alt="Complaint" 
              style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain' }}
            />
            <div className={styles.modalDetails}>
              <h3>{selectedComplaint.category}</h3>
              <p>{selectedComplaint.description}</p>
              <p><strong>Location:</strong> {selectedComplaint.location}</p>
              <p><strong>Status:</strong> {selectedComplaint.status}</p>
              <p><strong>Urgency:</strong> {selectedComplaint.urgency}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDeptDashboard;
