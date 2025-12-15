import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { LanguageFlag } from '../../utils/helpers';
import { Button } from '../UI/Button';
import './Header.css';

export const Header = () => {
  const { user, logout } = useAuth();
  const { currentTheme, setCurrentTheme, themes } = useTheme();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  
  const langDropdownRef = useRef(null);
  const themeDropdownRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
        setShowLangMenu(false);
      }
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target)) {
        setShowThemeMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setShowLangMenu(false);
    setShowThemeMenu(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setShowLangMenu(false);
  };

  const changeTheme = (theme) => {
    setCurrentTheme(theme);
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
          <span className="logo-icon">🏆</span>
          <span className="logo-text">World Cup Brackets</span>
        </Link>

        <nav className="nav-menu">
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
            </>
          )}

          {/* Language Selector */}
          <div className="dropdown-container" ref={langDropdownRef}>
            <button 
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
      </div>
    </header>
  );
};
