
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './Contact.module.scss';

const Contact = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Message sent successfully! We\'ll get back to you soon.');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setError(data.message || 'Failed to send message');
      }
    } catch (err) {
      setError('An error occurred while sending the message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.contactContainer}>
      <div className={styles.contactHeader}>
        <h1 className={styles.contactTitle}>{t('contactUs')}</h1>
        <p className={styles.contactSubtitle}>
          {t('contactSubtitle')}
        </p>
      </div>

      <div className={styles.contactContent}>
        <div className={styles.contactInfo}>
          <h2>{t('getInTouch')}</h2>
          <div className={styles.infoItems}>
            <div className={styles.infoItem}>
              <span className={styles.infoIcon}>📍</span>
              <div>
                <h3>{t('address')}</h3>
                <p>City Hall, Smart City Division<br />
                123 Innovation Street<br />
                Tech District, 12345</p>
              </div>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoIcon}>📧</span>
              <div>
                <h3>{t('email')}</h3>
                <p>info@smartcity.gov<br />
                support@smartcity.gov</p>
              </div>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoIcon}>📞</span>
              <div>
                <h3>{t('phone')}</h3>
                <p>+1 (555) 123-4567<br />
                +1 (555) 987-6543</p>
              </div>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoIcon}>🕒</span>
              <div>
                <h3>{t('workingHours')}</h3>
                <p>Monday - Friday: 8:00 AM - 6:00 PM<br />
                Saturday: 9:00 AM - 2:00 PM<br />
                Sunday: Closed</p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.contactForm}>
          <h2>{t('sendUsAMessage')}</h2>
          
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name" className="form-label">{t('fullName')}</label>
              <input
                type="text"
                id="name"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder={t('enterYourFullName')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">{t('email')}</label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder={t('enterYourEmail')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="subject" className="form-label">{t('subject')}</label>
              <input
                type="text"
                id="subject"
                name="subject"
                className="form-input"
                value={formData.subject}
                onChange={handleChange}
                required
                placeholder={t('enterSubject')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="message" className="form-label">{t('message')}</label>
              <textarea
                id="message"
                name="message"
                className="form-input form-textarea"
                value={formData.message}
                onChange={handleChange}
                required
                placeholder={t('enterYourMessage')}
                rows="5"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? t('sending') : t('sendMessage')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact; 