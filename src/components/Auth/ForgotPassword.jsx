import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../../api/api';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import './Auth.css';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authAPI.forgotPassword(email);
      setEmailSent(true);
    } catch (error) {
      // Always show success message for security (don't reveal if email exists)
      setEmailSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="auth-container">
        <Card className="auth-card">
          <div className="auth-header">
            <div className="success-icon">✉️</div>
            <h1>{t('auth.checkEmail')}</h1>
            <p className="success-message">
              {t('auth.resetEmailSent')}
            </p>
          </div>

          <div className="auth-footer">
            <p className="auth-link">
              {t('auth.didntReceive')} <button onClick={() => setEmailSent(false)} className="link-button">{t('auth.tryAgain')}</button>
            </p>
            <p className="auth-link">
              <Link to="/login">{t('auth.backToLogin')}</Link>
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <Card className="auth-card">
        <div className="auth-header">
          <h1>{t('auth.forgotPassword')}</h1>
          <p>{t('auth.forgotPasswordSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">{t('auth.email')}</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('placeholder.email')}
              required
              autoFocus
            />
          </div>

          <Button 
            type="submit" 
            size="large" 
            fullwidth="true"
            loading={loading}
          >
            {loading ? t('auth.sending') : t('auth.sendResetLink')}
          </Button>

          <p className="auth-link">
            <Link to="/login">{t('auth.backToLogin')}</Link>
          </p>
        </form>
      </Card>
    </div>
  );
};
