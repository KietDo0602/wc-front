import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../../api/api';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import './Auth.css';

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert(t('auth.passwordMismatch'));
      return;
    }

    if (formData.password.length < 6) {
      alert(t('auth.passwordTooShort'));
      return;
    }

    setLoading(true);

    try {
      await authAPI.resetPassword(token, formData.password);
      alert(t('auth.passwordResetSuccess'));
      navigate('/login');
    } catch (error) {
      if (error.response?.status === 400) {
        alert(t('auth.invalidResetToken'));
        setTokenValid(false);
      } else {
        alert(error.response?.data?.error || t('auth.passwordResetFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!tokenValid) {
    return (
      <div className="auth-container">
        <Card className="auth-card">
          <div className="auth-header">
            <div className="error-icon">❌</div>
            <h1>{t('auth.invalidToken')}</h1>
            <p className="error-message">
              {t('auth.invalidTokenMessage')}
            </p>
          </div>

          <div className="auth-footer">
            <p className="auth-link">
              <Link to="/forgot-password">{t('auth.requestNewLink')}</Link>
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
          <h1>{t('auth.resetPassword')}</h1>
          <p>{t('auth.resetPasswordSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="password">{t('auth.newPassword')}</label>
            <input
              type="password"
              id="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={t('placeholder.enterPassword')}
              required
              autoFocus
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>
            <input
              type="password"
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder={t('placeholder.confirmPassword')}
              required
              minLength={6}
            />
          </div>

          <Button 
            type="submit" 
            size="large" 
            fullwidth="true"
            loading={loading}
          >
            {loading ? t('auth.resetting') : t('auth.resetPasswordButton')}
          </Button>

          <p className="auth-link">
            <Link to="/login">{t('auth.backToLogin')}</Link>
          </p>
        </form>
      </Card>
    </div>
  );
};
