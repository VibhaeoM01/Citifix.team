
import { useTranslation } from 'react-i18next';
import styles from './ComplaintForm.module.scss';
import  { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';

const ComplaintForm = () => {
  const [formData, setFormData] = useState({
    description: '',
    location: '',
    email: ''
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
      // Check file size (10MB limit as per server config)
      if (file.size > 10 * 1024 * 1024) {
        setError('Photo size should be less than 10MB');
        return;
      }

      // Check file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setError('Only JPG, JPEG, and PNG images are allowed');
        return;
      }

      console.log('Selected file:', {
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
      });

      setPhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target.result);
      };
      reader.onerror = (e) => {
        console.error('FileReader error:', e.target.error);
        setError('Error reading file. Please try again.');
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
          console.error('Geolocation error:', error);
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
    
    setLoading(true);
    setError('');
    setSuccess('');
    setMlProcessing(false);

    // Get authentication token
    const token = localStorage.getItem('token');

    try {
      // Validate authentication
      if (!token) {
        throw new Error('Please log in to submit a complaint');
      }

      // Validate form data
      if (!photo) {
        throw new Error('Please upload a photo');
      }

      if (!formData.location.trim()) {
        throw new Error('Please provide a location');
      }

      if (!formData.email.trim()) {
        throw new Error('Please provide an email address');
      }

      // Log submission details
      console.log('Submitting complaint:', {
        photoName: photo.name,
        photoSize: `${(photo.size / 1024 / 1024).toFixed(2)}MB`,
        photoType: photo.type,
        location: formData.location,
        email: formData.email,
        description: formData.description?.length || 0,
        hasUser: !!user
      });

      // Step 1: ML Processing
      console.log('Starting ML processing...');
      setMlProcessing(true);
      
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      console.log('Using API URL:', apiUrl);
      
      // Create FormData with the correct field name 'photo' for the image
      const requestData = new FormData();
      requestData.append('photo', photo);  // Use 'photo' consistently
      requestData.append('description', formData.description || '');
      requestData.append('location', formData.location || '');
      requestData.append('email', formData.email || '');
      
      // Log the FormData contents for debugging
      console.log('FormData contents:', {
        hasFile: requestData.has('photo'),
        fileName: photo.name,
        fileSize: photo.size,
        fileType: photo.type,
        description: formData.description || 'No description'
      });

      const mlResponse = await fetch(`${apiUrl}/complaints/analyze-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
          // Remove Content-Type header to let browser set it with boundary
        },
        body: requestData
      });

      // Check HTTP status first
      if (!mlResponse.ok) {
        if (mlResponse.status === 429) {
          throw new Error('System is busy. Please try again in a few minutes.');
        } else if (mlResponse.status === 413) {
          throw new Error('Image file is too large. Please use a smaller image (max 10MB).');
        } else if (mlResponse.status === 415) {
          throw new Error('Invalid image format. Please use JPG, JPEG, or PNG format.');
        }
      }

      let mlResponseText;
      let mlData;
      
      try {
        mlResponseText = await mlResponse.text();
        console.log('ML Response text:', mlResponseText);

        // Check if response text is empty
        if (!mlResponseText.trim()) {
          throw new Error('ML API returned empty response');
        }

        // Parse the response
        mlData = JSON.parse(mlResponseText);
        console.log('\n=== ML RESPONSE DEBUG ===');
        console.log('Raw ML response:', mlResponseText);
        console.log('Parsed ML data:', mlData);
        
        // Handle different response formats
        if (mlData.error) {
          throw new Error(mlData.error);
        }
        
        if (mlData.success === false) {
          throw new Error(mlData.message || 'Analysis failed');
        }

        // Extract results from any of the possible locations
        const results = mlData.results || mlData.mlResults || (mlData.success ? mlData : null);
        
        if (!results) {
          console.error('Missing results in response:', mlData);
          throw new Error('Could not find analysis results in response');
        }

        console.log('Extracted results:', results);
        console.log('========================\n');
        
        // Set ML results instead of returning them
        setMlResults(results);
      } catch (err) {
        console.error('Error processing ML response:', err);
        throw new Error(`Image analysis failed: ${err.message}. Please try again or use a different image.`);
      }
      try {
        mlData = JSON.parse(mlResponseText);
        console.log('\n=== ML RESPONSE DEBUG ===');
        console.log('Raw ML response:', mlResponseText);
        console.log('Parsed ML data:', mlData);
        console.log('response.results:', mlData?.results);
        console.log('response.mlResults:', mlData?.mlResults);
        console.log('========================\n');
      } catch (err) {
        console.error('Error parsing ML response:', err);
        throw new Error(`Invalid ML response format: ${err.message}`);
      }

      const mlResultsRaw = mlData?.results || mlData?.mlResults || mlData;
      if (!mlResultsRaw || typeof mlResultsRaw !== 'object') {
        throw new Error('ML response did not include prediction results');
      }

      const categoryFromML = mlResultsRaw.predictedCategory || mlResultsRaw.category || 'Other';
      const urgencyFromML = mlResultsRaw.predictedUrgency || mlResultsRaw.urgency || 'medium';

      console.log('Using ML results payload:', mlResultsRaw);
      console.log('Resolved categoryFromML:', categoryFromML);
      console.log('Resolved urgencyFromML:', urgencyFromML);

      // Step 2: Submit complete complaint
      console.log('Submitting complaint with ML results:', mlResultsRaw);
      
      // Add ML results to form data
      requestData.append('category', categoryFromML);
      requestData.append('urgency', urgencyFromML);

      const submitResponse = await fetch(`${apiUrl}/complaints`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: requestData
      });

      let responseData;
      try {
        const contentType = submitResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          responseData = await submitResponse.json();
        } else {
          const submitResponseText = await submitResponse.text();
          console.log('Submit Response text:', submitResponseText);
          
          if (!submitResponse.ok) {
            throw new Error(`Complaint submission failed: ${submitResponseText}`);
          }
          responseData = { message: submitResponseText };
        }
      } catch (err) {
        console.error('Error processing submit response:', err);
        throw new Error('Failed to process submission response: ' + err.message);
      }

      console.log('Submission successful:', responseData);
      
      if (responseData.complaint) {
        console.log('Complaint created:', {
          id: responseData.complaint.id,
          category: responseData.complaint.category,
          urgency: responseData.complaint.urgency
        });
      }

      // Format ML results
      const mlResultsData = mlResultsRaw || responseData.mlResults || responseData.complaint?.mlResults;
      console.log('\n=== ML RESULTS PROCESSING ===');
      console.log('Raw mlResultsData:', mlResultsData);
      
      if (mlResultsData) {
        const formattedResults = {
          category: mlResultsData.predictedCategory || mlResultsData.category || 'Other',
          urgency: mlResultsData.predictedUrgency || mlResultsData.urgency || 'medium',
          caption: mlResultsData.caption || 'Analysis complete'
        };
        console.log('Formatted results:', formattedResults);
        console.log('Category selection logic:');
        console.log('- predictedCategory:', mlResultsData.predictedCategory);
        console.log('- category:', mlResultsData.category);
        console.log('- final selection:', formattedResults.category);
        console.log('========================\n');
        setMlResults(formattedResults);
      }

      // Success! Show success message
      setSuccess('Your complaint has been submitted successfully! You will be redirected in 5 seconds...');
      console.log('Form submission completed successfully');
      
      // Wait longer before resetting form and redirecting to allow viewing results
      setTimeout(() => {
        // Reset form
        setFormData({
          description: '',
          location: '',
          email: ''
        });
        setPhoto(null);
        setPhotoPreview(null);
        
        console.log('Redirecting to home...');
        navigate('/');
      }, 5000);

    } catch (err) {
      console.error('Form submission error:', err);
      console.log('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
        cause: err.cause
      });
      setError(err.message || 'An error occurred while submitting the complaint');
    } finally {
      setLoading(false);
      setMlProcessing(false);
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

          {/* Email */}
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email address for notifications"
            />
            <small className={styles.fieldHint}>
              We'll send you updates about your complaint to this email address
            </small>
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

        {/* Final evaluated category (do not expose raw AI analysis) */}
        {mlResults && (
          <div className={styles.mlResults}>
            <h3>{t('evaluationResult') ?? 'Evaluation'}</h3>
            <div className={styles.mlCards}>
              <div className={styles.mlCard}>
                <span className={styles.mlLabel}>{t('finalCategory') ?? 'Final category'}:</span>
                <span className={styles.mlValue}>{mlResults.category}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplaintForm;