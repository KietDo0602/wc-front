import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import './Auth.css';

export const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check for error in URL params
    const params = new URLSearchParams(location.search);
    const error = params.get('error');
    if (error === 'auth_failed' || error === 'google_auth_failed') {
      setErrorMessage('Authentication failed. Please try again.');
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset previous error
    setErrorMessage("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(formData.email)) {
      setErrorMessage("auth.invalidEmailFormat");
      return;
    }

    if (formData.password.length < 8) {
      setErrorMessage("auth.passwordTooShort");
      return;
    }

    setLoading(true);
    try {
      await login(formData);
      navigate('/predictions');
    } catch (error) {
      setErrorMessage(error.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Redirect to backend Google OAuth
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/users/auth/google`;
  };

  return (
    <div className="auth-container">
      <Card className="auth-card">
        <div className="auth-header">
          <h1>{t("home.welcome")}</h1>
          <p>{t("login.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">{t('auth.email')}</label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={t('placeholder.email')}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <div className="password-header">
              <label htmlFor="password">{t('auth.password')}</label>
            </div>
            <input
              type="password"
              id="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={t('placeholder.enterPassword')}
              required
            />
            <Link to="/forgot-password" className="forgot-password-link">
              {t('auth.forgotPassword')}
            </Link>
          </div>

          {errorMessage && (
            <div className="auth-error">
              {t(errorMessage)}
            </div>
          )}


          <Button type="submit" size="large" className="w-full" loading={loading} fullwidth="true">
            {loading ? t('auth.loggingIn') : t('nav.login')}
          </Button>

          <p className="auth-link">
            {t('auth.noAccount')} <Link to="/register">{t('auth.registerHere')}</Link>
          </p>
        </form>

        <div className="auth-divider">
          <span>{t("or")}</span>
        </div>

        <Button 
          onClick={handleGoogleLogin}
          variant="outline"
          size="large"
          fullwidth="true"
          className="google-btn"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="google-icon" />
          {t("login.google")}
        </Button>
      </Card>
    </div>
  );
};
