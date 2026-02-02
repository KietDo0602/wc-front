import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { LanguageFlag } from '../../utils/helpers';
import { Button } from '../UI/Button';
import './Header.css';
import Logo from '/src/logo.svg';

export const Header = () => {
  const { user, logout } = useAuth();
  const { currentTheme, setCurrentTheme, themes } = useTheme();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const langDropdownRef = useRef(null);
  const themeDropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const langTriggerRef = useRef(null);
  const themeTriggerRef = useRef(null);

  // Load saved language + theme on first render
  useEffect(() => {
    const savedLang = localStorage.getItem("appLanguage");
    const savedTheme = localStorage.getItem("appTheme");

    if (savedLang && savedLang !== i18n.language) {
      i18n.changeLanguage(savedLang);
    }

    if (savedTheme && savedTheme !== currentTheme) {
      setCurrentTheme(savedTheme);
    }
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;

      const clickedLang =
        langDropdownRef.current?.contains(target) ||
        langTriggerRef.current?.contains(target);

      const clickedTheme =
        themeDropdownRef.current?.contains(target) ||
        themeTriggerRef.current?.contains(target);

      if (!clickedLang) setShowLangMenu(false);
      if (!clickedTheme) setShowThemeMenu(false);

      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(target)
      ) {
        const hamburger = document.querySelector('.hamburger-menu');
        if (hamburger && !hamburger.contains(target)) {
          setShowMobileMenu(false);
        }
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setShowLangMenu(false);
    setShowThemeMenu(false);
    setShowMobileMenu(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setShowMobileMenu(false);
  };

  const isActive = (path) => location.pathname === path;

  const changeLanguage = (lng) => {
    console.log('Change language to: ', lng);
    i18n.changeLanguage(lng);
    localStorage.setItem("appLanguage", lng);
    setShowLangMenu(false);
  };

  const changeTheme = (theme) => {
    setCurrentTheme(theme);
    localStorage.setItem("appTheme", theme);
    setShowThemeMenu(false);
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: "Français" },
    { code: 'ar', name: "العربية" },
    { code: 'pt', name: "Português" },
    { code: 'cn', name: "中文" },
    { code: 'vi', name: "Tiếng Việt" },
    { code: 'de', name: "Deutsch" },
    { code: 'it', name: "Italiano" },
    { code: 'ja', name: "日本語" },
    { code: 'ko', name: "한국어" },
    { code: 'tr', name: "Türkçe" },
    { code: 'in', name: "हिन्दी" },
    { code: 'th', name: "ไทย" },
  ];

  const currentLang = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <header className="app-header">
      <div className="header-container">
        <Link to="/" className="logo">
          <img src={Logo} className="logo-icon" alt="Logo" />
          <span className="logo-text">World Cup Brackets</span>
        </Link>

        {/* Hamburger Menu Button (Mobile Only) */}
        <button 
          className="hamburger-menu"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Desktop Navigation */}
        <nav className="nav-menu desktop-nav">
          {user && (
            <>
              <Link 
                to="/predictions" 
                className={`nav-link ${isActive('/predictions') ? 'active' : ''}`}
              >
                {t('nav.myPredictions')}
              </Link>
              <Link 
                to="/leaderboard" 
                className={`nav-link ${isActive('/leaderboard') ? 'active' : ''}`}
              >
                {t('nav.leaderboard')}
              </Link>
              <Link 
                to="/results" 
                className={`nav-link ${isActive('/results') ? 'active' : ''}`}
              >
                {t('nav.matchResults')}
              </Link>
            </>
          )}

          {/* Language Selector */}
          <div className="dropdown-container" ref={langDropdownRef}>
            <button
              ref={langTriggerRef}
              className="dropdown-trigger"
              onClick={() => {
                setShowLangMenu(!showLangMenu);
                setShowThemeMenu(false);
              }}
            >
              <span className="dropdown-icon">
                <LanguageFlag languageCode={currentLang.code} size="small" />
              </span>
              <span className="dropdown-label">{currentLang.code.toUpperCase()}</span>
              <span className="dropdown-arrow">▼</span>
            </button>

            {showLangMenu && (
              <div className="dropdown-menu">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    className={`dropdown-item ${i18n.language === lang.code ? 'active' : ''}`}
                    onClick={() => changeLanguage(lang.code)}
                  >
                    <span className="dropdown-item-icon">
                      <LanguageFlag languageCode={lang.code} size="normal" />
                    </span>
                    <span>{lang.name}</span>
                    {i18n.language === lang.code && <span className="check-mark">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme Selector */}
          <div className="dropdown-container" ref={themeDropdownRef}>
            <button
              ref={themeTriggerRef}
              className="dropdown-trigger"
              onClick={() => {
                setShowThemeMenu(!showThemeMenu);
                setShowLangMenu(false);
              }}
            >
              <span className="dropdown-icon">🎨</span>
              <span className="dropdown-label">{t(`theme.${currentTheme}`)}</span>
              <span className="dropdown-arrow">▼</span>
            </button>

            {showThemeMenu && (
              <div className="dropdown-menu">
                {Object.keys(themes).map((themeKey) => (
                  <button
                    key={themeKey}
                    className={`dropdown-item ${currentTheme === themeKey ? 'active' : ''}`}
                    onClick={() => changeTheme(themeKey)}
                  >
                    <span 
                      className="theme-preview" 
                      style={{ 
                        background: `linear-gradient(135deg, ${themes[themeKey].primary} 0%, ${themes[themeKey].primaryDark} 100%)` 
                      }}
                    ></span>
                    <span>{t(`theme.${themeKey}`)}</span>
                    {currentTheme === themeKey && <span className="check-mark">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {user && user.role === 'admin' && (
            <Link to="/admin" className="nav-link admin-link">
              🛡️ Admin
            </Link>
          )}

          {user ? (
            <div className="user-menu">
              <span className="user-name">{user.username}</span>
              <Button onClick={handleLogout} variant="outline" size="small">
                {t('nav.logout')}
              </Button>
            </div>
          ) : (
            <>
              <Link to="/login">
                <Button variant="outline" size="small">{t('nav.login')}</Button>
              </Link>
              <Link to="/register">
                <Button size="small">{t('nav.register')}</Button>
              </Link>
            </>
          )}
        </nav>

        {/* Mobile Navigation Menu */}
        {showMobileMenu && (
          <nav className="mobile-nav" ref={mobileMenuRef}>
            {user && (
              <div className="mobile-user-info">
                <span className="mobile-user-name">👤 {user.username}</span>
              </div>
            )}

            {user && (
              <>
                <Link 
                  to="/predictions" 
                  className={`mobile-nav-link ${isActive('/predictions') ? 'active' : ''}`}
                  onClick={() => setShowMobileMenu(false)}
                >
                  📊 {t('nav.myPredictions')}
                </Link>
                <Link 
                  to="/leaderboard" 
                  className={`mobile-nav-link ${isActive('/leaderboard') ? 'active' : ''}`}
                  onClick={() => setShowMobileMenu(false)}
                >
                  🏆 {t('nav.leaderboard')}
                </Link>
                <Link 
                  to="/results" 
                  className={`mobile-nav-link ${isActive('/results') ? 'active' : ''}`}
                  onClick={() => setShowMobileMenu(false)}
                >
                  📋 {t('nav.matchResults')}
                </Link>

                {user.role === 'admin' && (
                  <Link 
                    to="/admin" 
                    className="mobile-nav-link admin-link"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    🛡️ Admin
                  </Link>
                )}
              </>
            )}

            <div className="mobile-divider"></div>

            {/* Mobile Language Dropdown */}
            <div className="mobile-dropdown-section">
              <button
                ref={langTriggerRef}
                className="mobile-dropdown-trigger"
                onClick={() => setShowLangMenu(!showLangMenu)}
              >
                <span className="mobile-dropdown-icon">
                  <LanguageFlag languageCode={currentLang.code} size="small" />
                </span>
                <span className="mobile-dropdown-label">
                  {currentLang.name}
                </span>
                <span className={`mobile-dropdown-arrow ${showLangMenu ? 'open' : ''}`}>▼</span>
              </button>

              {showLangMenu && (
                <div
                  className="mobile-dropdown-menu"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      className={`mobile-dropdown-item ${i18n.language === lang.code ? 'active' : ''}`}
                      onClick={() => {
                        changeLanguage(lang.code);
                        setShowLangMenu(false);
                      }}
                    >
                      <LanguageFlag languageCode={lang.code} size="small" />
                      <span>{lang.name}</span>
                      {i18n.language === lang.code && <span className="check-mark">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Theme Dropdown */}
            <div className="mobile-dropdown-section">
              <button
                ref={themeTriggerRef}
                className="mobile-dropdown-trigger"
                onClick={() => setShowThemeMenu(!showThemeMenu)}
              >
                <span className="mobile-dropdown-icon">🎨</span>
                <span className="mobile-dropdown-label">
                  {t(`theme.${currentTheme}`)}
                </span>
                <span className={`mobile-dropdown-arrow ${showThemeMenu ? 'open' : ''}`}>▼</span>
              </button>

              {showThemeMenu && (
                <div
                  className="mobile-dropdown-menu"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {Object.keys(themes).map((themeKey) => (
                    <button
                      key={themeKey}
                      className={`mobile-dropdown-item ${currentTheme === themeKey ? 'active' : ''}`}
                      onClick={() => {
                        changeTheme(themeKey);
                        setShowThemeMenu(false);
                      }}
                    >
                      <span 
                        className="mobile-theme-preview" 
                        style={{ 
                          background: `linear-gradient(135deg, ${themes[themeKey].primary} 0%, ${themes[themeKey].primaryDark} 100%)` 
                        }}
                      ></span>
                      <span>{t(`theme.${themeKey}`)}</span>
                      {currentTheme === themeKey && <span className="check-mark">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {user ? (
              <>
                <div className="mobile-divider"></div>
                <Button 
                  onClick={handleLogout} 
                  variant="outline" 
                  size="large"
                  style={{ width: '100%' }}
                >
                  🚪 {t('nav.logout')}
                </Button>
              </>
            ) : (
              <>
                <div className="mobile-divider"></div>
                <Link to="/login" onClick={() => setShowMobileMenu(false)}>
                  <Button variant="outline" size="large" style={{ width: '100%', marginBottom: '0.5rem' }}>
                    {t('nav.login')}
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setShowMobileMenu(false)}>
                  <Button size="large" style={{ width: '100%' }}>
                    {t('nav.register')}
                  </Button>
                </Link>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};
