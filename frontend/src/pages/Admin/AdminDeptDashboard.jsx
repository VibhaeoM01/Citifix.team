import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const AdminDeptDashboard = () => {
  const { dept } = useParams();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchComplaints = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`/api/complaints/department/${dept}`);
        setComplaints(res.data.complaints || []);
      } catch (err) {
        console.log(err);
        setError('Failed to fetch complaints');
      } finally {
        setLoading(false);
      }
    };
    fetchComplaints();
  }, [dept]);

  return (
    <div style={{ padding: '2rem' }}>
      <h2>{dept} Department Complaints</h2>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && complaints.length === 0 && <p>No complaints found for this department.</p>}
      {!loading && complaints.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>ID</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Description</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Location</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Urgency</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Status</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Created At</th>
            </tr>
          </thead>
          <tbody>
            {complaints.map(c => (
              <tr key={c._id}>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{c._id}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{c.description}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{c.location}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{c.urgency}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{c.status}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{new Date(c.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminDeptDashboard;
