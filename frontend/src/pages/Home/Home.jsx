
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import styles from './Home.module.scss';

const Home = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const features = [
    {
      icon: '📱',
      title: t('easyComplaintRegistration'),
      description: t('easyComplaintRegistrationDesc')
    },
    {
      icon: '🤖',
      title: t('aiPoweredAnalysis'),
      description: t('aiPoweredAnalysisDesc')
    },
    {
      icon: '🗺️',
      title: t('locationTracking'),
      description: t('locationTrackingDesc')
    },
    {
      icon: '📊',
      title: t('realTimeUpdates'),
      description: t('realTimeUpdatesDesc')
    },
    {
      icon: '🏛️',
      title: t('smartGovernance'),
      description: t('smartGovernanceDesc')
    },
    {
      icon: '🔒',
      title: t('securePrivate'),
      description: t('securePrivateDesc')
    }
  ];

  return (
    <div className={styles.home}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              {t('smartCityComplaintSystem')}
            </h1>
            <p className={styles.heroSubtitle}>
              {t('empoweringCitizens')}
            </p>
            <div className={styles.heroButtons}>
              {user ? (
                <Link to="/complaint" className={styles.ctaButton}>
                  {t('registerYourComplaint')}
                </Link>
              ) : (
                <>
                  <Link to="/signup" className={styles.ctaButton}>
                    {t('getStarted')}
                  </Link>
                  <Link to="/login" className={styles.secondaryButton}>
                    {t('loginToStart')}
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className={styles.heroImage}>
            <div className={styles.imagePlaceholder}>
              🏙️ Smart City
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t('whyChooseOurPlatform')}</h2>
            <p className={styles.sectionSubtitle}>
              {t('futureOfCivicEngagement')}
            </p>
          </div>
          
          <div className={styles.featuresGrid}>
            {features.map((feature, index) => (
              <div key={index} className={styles.featureCard}>
                <div className={styles.featureIcon}>{feature.icon}</div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDescription}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>{t('readyToMakeADifference')}</h2>
            <p className={styles.ctaText}>
              {t('joinThousands')}
            </p>
            {!user && (
              <Link to="/signup" className={styles.ctaButton}>
                {t('startYourJourney')}
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home; 