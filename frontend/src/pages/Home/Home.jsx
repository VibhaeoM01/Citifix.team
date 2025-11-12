import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth";
import { useTranslation } from "react-i18next";
import styles from "./Home.module.scss";

const Home = () => {
  const { user, admin, adminToken, token: userToken } = useAuth();
  const { t } = useTranslation();

  const handleClearAllComplaints = async () => {
    if (
      !window.confirm(
        "⚠️ WARNING: This will permanently delete ALL complaints. Are you sure?"
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/complaints/admin/clear-all", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${adminToken || userToken}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        alert(`Successfully cleared ${data.count} complaints`);
      } else {
        throw new Error(data.message || "Failed to clear complaints");
      }
    } catch (error) {
      console.error("Error clearing complaints:", error);
      alert("Failed to clear complaints: " + error.message);
    }
  };

  const features = [
    {
      icon: "📱",
      title: t("easyComplaintRegistration"),
      description: t("easyComplaintRegistrationDesc"),
    },
    {
      icon: "🤖",
      title: t("aiPoweredAnalysis"),
      description: t("aiPoweredAnalysisDesc"),
    },
    {
      icon: "🗺️",
      title: t("locationTracking"),
      description: t("locationTrackingDesc"),
    },
    {
      icon: "📊",
      title: t("realTimeUpdates"),
      description: t("realTimeUpdatesDesc"),
    },
    {
      icon: "🏛️",
      title: t("smartGovernance"),
      description: t("smartGovernanceDesc"),
    },
    {
      icon: "🔒",
      title: t("securePrivate"),
      description: t("securePrivateDesc"),
    },
  ];

  return (
    <div className={styles.home}>
      {/* Admin Controls */}
      {admin && ["admin", "staff"].includes(admin.role) && (
        <div className={styles.adminControls}>
          <div className={styles.container}>
            <button
              onClick={handleClearAllComplaints}
              className={styles.clearButton}
            >
              🗑️ Clear All Complaints
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      {/* <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              {t("smartCityComplaintSystem")}
            </h1>
            <p className={styles.heroSubtitle}>{t("empoweringCitizens")}</p>
            <div className={styles.heroButtons}>
              {user ? (
                <Link to="/complaint" className={styles.ctaButton}>
                  {t("registerYourComplaint")}
                </Link>
              ) : (
                <>
                  <Link to="/signup" className={styles.ctaButton}>
                    {t("getStarted")}
                  </Link>
                  <Link to="/login" className={styles.secondaryButton}>
                    {t("loginToStart")}
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className={styles.heroImage}>
            <img
              height={300}
              src="/public/cta logo.png"
              alt="AI-powered Smart City Complaint System"
              className={styles.heroIllustration}
            />
          </div>
        </div> 
  <div className={styles.floatingIcons}>
    <span>💡</span>
    <span>🚧</span>
    <span>🗑️</span>
  </div>
      </section> */}

      <section className={styles.hero}>
  <div className={styles.container}>
    <div className={styles.heroContent}>
      <h1 className={styles.heroTitle}>
        {t("smartCityComplaintSystem")}
      </h1>
      <p className={styles.heroSubtitle}>{t("empoweringCitizens")}</p>
      <div className={styles.heroButtons}>
        {user ? (
          <Link to="/complaint" className={styles.ctaButton}>
            {t("registerYourComplaint")}
          </Link>
        ) : (
          <>
            <Link to="/signup" className={styles.ctaButton}>
              {t("getStarted")}
            </Link>
            <Link to="/login" className={styles.secondaryButton}>
              {t("loginToStart")}
            </Link>
          </>
        )}
      </div>
    </div>

    <div className={styles.heroImage}>
      <img
        height={300}
        src="/public/cta logo.png"
        alt="AI-powered Smart City Complaint System"
        className={styles.heroIllustration}
      />
    </div>
  </div>

  
</section>


      {/* Features Section */}
      <section className={styles.features}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t("whyChooseOurPlatform")}</h2>
            <p className={styles.sectionSubtitle}>
              {t("futureOfCivicEngagement")}
            </p>
          </div>

          <div className={styles.featuresGrid}>
            {features.map((feature, index) => (
              <div key={index} className={styles.featureCard}>
                <div className={styles.featureIcon}>{feature.icon}</div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDescription}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>{t("readyToMakeADifference")}</h2>
            <p className={styles.ctaText}>{t("joinThousands")}</p>
            {!user && (
              <Link to="/signup" className={styles.ctaButton}>
                {t("startYourJourney")}
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
