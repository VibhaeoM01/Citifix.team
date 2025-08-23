
import { useTranslation } from 'react-i18next';
import styles from './ComplaintForm.module.scss';
import  { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ComplaintForm = () => {
  const [formData, setFormData] = useState({
    description: '',
    location: ''
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mlResults, setMlResults] = useState(null);
  const [mlProcessing, setMlProcessing] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Photo size should be less than 5MB');
        return;
      }

      setPhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData({
            ...formData,
            location: `${latitude}, ${longitude}`
          });
        },
        (_error) => {
          setError('Unable to get your location. Please enter manually.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submission started');
    console.log('Form data:', formData);
    console.log('Photo:', photo);
    console.log('User:', user);
    
    setLoading(true);
    setError('');
    setSuccess('');
    setMlProcessing(false); // Reset ML processing state

    if (!photo) {
      console.log('Validation failed: No photo uploaded');
      setError('Please upload a photo');
      setLoading(false);
      return;
    }

    if (!formData.location.trim()) {
      setError('Please provide a location');
      setLoading(false);
      return;
    }

    try {
      // Create FormData for file upload
      const submitData = new FormData();
      console.log('Preparing photo upload:', { 
        fileName: photo.name,
        fileSize: photo.size,
        fileType: photo.type 
      });
      
      // Ensure correct file field name for multer
      submitData.append('photo', photo);
      submitData.append('description', formData.description);
      submitData.append('location', formData.location);
      
      // User ID is already available through the auth token
      console.log('Form data prepared:', {
        description: formData.description,
        location: formData.location,
        user: user
      });
      
      setMlProcessing(true); // Start ML processing before API call

      setMlProcessing(true); // Start ML processing indicator
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      console.log('Sending request to:', `${apiUrl}/complaints`);
      console.log('Token:', localStorage.getItem('token'));
      
      console.log('Making API request with FormData contents:', 
        Array.from(submitData.entries()).reduce((obj, [key, value]) => {
          obj[key] = value instanceof File ? `File: ${value.name}` : value;
          return obj;
        }, {})
      );

      // Don't set any Content-Type header, let the browser set it with the boundary
      const response = await fetch(`${apiUrl}/complaints`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: submitData
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      const data = await response.json();
      console.log('Response data:', data);
      
      // Log specific parts of the response
      if (data.complaint) {
        console.log('Complaint created:', {
          id: data.complaint.id,
          category: data.complaint.category,
          urgency: data.complaint.urgency
        });
      }
      
      // Check if we have the expected ML results
      if (data.mlResults) {
        console.log('ML results received:', data.mlResults);
      } else {
        console.warn('No ML results in response');
      }

      if (response.ok) {
        console.log('Submission successful, setting states...');
        setSuccess('Complaint submitted successfully!');
        
        // Check both possible locations for ML results and ensure they have required fields
        const mlResultsData = data.mlResults || (data.complaint && data.complaint.mlResults);
        if (mlResultsData) {
          // Ensure all required fields exist with defaults
          const formattedResults = {
            category: mlResultsData.category || 'Other',
            urgency: mlResultsData.urgency || 'medium',
            caption: mlResultsData.caption || 'Analysis complete'
          };
          console.log('Setting ML results:', formattedResults);
          setMlResults(formattedResults);
        } else {
          console.warn('No ML results to set');
          // Set default ML results
          setMlResults({
            category: 'Processing',
            urgency: 'medium',
            caption: 'Analysis in progress...'
          });
        }
        
        console.log('Resetting form...');
        // Reset form
        setFormData({ description: '', location: '' });
        setPhoto(null);
        setPhotoPreview(null);
        
        console.log('Starting redirect timer...');
        // Redirect after 3 seconds
        setTimeout(() => {
          console.log('Redirecting to home...');
          navigate('/');
        }, 3000);
      } else {
        console.error('Submission failed:', response.status, data);
        setError(data.message || 'Failed to submit complaint');
      }
    } catch (err) {
      console.error('Error during submission:', err);
      console.log('Error details:', {
        message: err.message,
        stack: err.stack
      });
      setError('An error occurred while submitting the complaint');
    } finally {
      console.log('Submission completed. Loading:', loading, 'ML Processing:', mlProcessing);
      setLoading(false);
      setMlProcessing(false); // Always turn off ML processing
    }
  };
  return (
    <div className={styles.complaintContainer}>
      <div className={styles.complaintCard}>
        <div className={styles.complaintHeader}>
          <h1 className={styles.complaintTitle}>{t('registerYourComplaint')}</h1>
          <p className={styles.complaintSubtitle}>
            {t('helpUsImprove')}
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className={styles.complaintForm}>
          {/* Photo Upload */}
          <div className="form-group">
            <label htmlFor="photo" className="form-label">{t('uploadPhoto')}</label>
            <div className={styles.photoUpload}>
              <input
                type="file"
                id="photo"
                accept="image/*"
                onChange={handlePhotoChange}
                className={styles.photoInput}
                required
              />
              <div className={styles.photoPreview}>
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className={styles.previewImage} />
                ) : (
                  <div className={styles.uploadPlaceholder}>
                    <span className={styles.uploadIcon}>📷</span>
                    <p>{t('clickToUploadPhoto')}</p>
                    <small>{t('maxSize5mb')}</small>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description" className="form-label">{t('description')}</label>
            <textarea
              id="description"
              name="description"
              className="form-input form-textarea"
              value={formData.description}
              onChange={handleChange}
              placeholder={t('describeIssue')}
              rows="4"
            />
          </div>

          {/* Location */}
          <div className="form-group">
            <label htmlFor="location" className="form-label">{t('location')}</label>
            <div className={styles.locationInput}>
              <input
                type="text"
                id="location"
                name="location"
                className="form-input"
                value={formData.location}
                onChange={handleChange}
                required
                placeholder={t('enterLocationOrUseGPS')}
              />
              <button
                type="button"
                onClick={getCurrentLocation}
                className={styles.gpsButton}
              >
                📍 {t('gps')}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? t('submitting') : t('submitComplaint')}
          </button>
        </form>

        {/* ML Processing Indicator */}
        {mlProcessing && (
          <div className={styles.mlProcessing}>
            <div className={styles.spinner}></div>
            <p>{t('analyzingComplaint')}</p>
          </div>
        )}

        {/* ML Results Display */}
        {mlResults && (
          <div className={styles.mlResults}>
            <h3>{t('aiAnalysisResults')}</h3>
            <div className={styles.mlCards}>
              <div className={styles.mlCard}>
                <span className={styles.mlLabel}>{t('category')}:</span>
                <span className={styles.mlValue}>{mlResults.category}</span>
              </div>
              <div className={styles.mlCard}>
                <span className={styles.mlLabel}>{t('urgency')}:</span>
                <span className={`${styles.mlValue} ${styles[`urgency-${(mlResults.urgency || 'medium').toLowerCase()}`]}`}>
                  {mlResults.urgency || 'Medium'}
                </span>
              </div>
              <div className={styles.mlCard}>
                <span className={styles.mlLabel}>{t('imageCaption')}:</span>
                <span className={styles.mlValue}>{mlResults.caption}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplaintForm;