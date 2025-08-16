
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import styles from './ComplaintForm.module.scss';

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
        (error) => {
          setError('Unable to get your location. Please enter manually.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!photo) {
      setError('Please upload a photo');
      setLoading(false);
      return;
    }

    if (!formData.description.trim()) {
      setError('Please provide a description');
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
      submitData.append('photo', photo);
      submitData.append('description', formData.description);
      submitData.append('location', formData.location);
      submitData.append('userId', user.id);

      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: submitData
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Complaint submitted successfully!');
        setMlResults(data.mlResults);
        
        // Reset form
        setFormData({ description: '', location: '' });
        setPhoto(null);
        setPhotoPreview(null);
        
        // Redirect after 3 seconds
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } else {
        setError(data.message || 'Failed to submit complaint');
      }
    } catch (err) {
      setError('An error occurred while submitting the complaint');
    } finally {
      setLoading(false);
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
              required
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
                <span className={`${styles.mlValue} ${styles[`urgency-${mlResults.urgency.toLowerCase()}`]}`}>
                  {mlResults.urgency}
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