


import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import styles from './Navbar.module.scss';


const Navbar = () => {

  const { user, admin, logout, logoutAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const isLoggedIn = !!user || !!admin;
  // Check if admin is logged in and not already on complaints page
  const isAdmin = !!admin;
  const onAdminComplaintsPage = location.pathname.startsWith('/admin/complaints');



  const handleLogout = () => {
    if (user) logout();
    if (admin) logoutAdmin();
    navigate('/');
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}><img style={{height:"90px", width:"100px", display:"flex", alignItems:"center"}} src="/public/citifix.png" alt="" /></span>
        </Link>
        <div className={styles.navLinks}>
          <Link to="/" className={styles.navLink}>{t('home')}</Link>
          <Link to="/blog" className={styles.navLink}>{t('blog')}</Link>
          <Link to="/contact" className={styles.navLink}>{t('contact')}</Link>
          {user && (
            <Link to="/complaint" className={styles.navLink}>{t('complaint')}</Link>
          )}
          {/* Admin Complaints button: only show if admin is logged in and not on complaints page */}
          {isAdmin && !onAdminComplaintsPage && (
            <button
              className={styles.navLink}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onClick={() => navigate('/admin/complaints')}
            >
              {t('complaints')}
            </button>
          )}
          {/* Language toggle */}
          <button
            className={styles.langSwitchBtn}
            onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'hi' : 'en')}
            aria-label="Change language"
          >
            {i18n.language === 'en' ? 'हिंदी' : 'English'}
          </button>
        </div>
        <div className={styles.authSection}>
          {isLoggedIn ? (
            <div className={styles.userSection}>
              <span className={styles.userName}>
                {t('welcome')}, {user ? user.name : admin?.name}
              </span>
              <button onClick={handleLogout} className={styles.logoutBtn}>
                Logout
              </button>
            </div>
          ) : (
            <div className={styles.authButtons}>
              <Link to="/login" className={styles.loginBtn}>Login</Link>
              <Link to="/signup" className={styles.signupBtn}>Sign Up</Link>
              <Link to="/admin/secret" className={styles.signupBtn}>Admin Login</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;