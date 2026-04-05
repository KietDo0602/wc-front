import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../UI/Button';
import { Card } from '../UI/Card';
import { VerificationStep } from './VerificationStep';
import api from '../../api/api';
import './Auth.css';

export const Register = () => {
  const [step, setStep] = useState(1); // 1: email/password, 2: verification
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuthData } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const validateForm = () => {
    const { email, password, confirmPassword } = formData;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return t('auth.invalidEmailFormat');
    }

    if (password.length < 8) {
      return t('auth.passwordTooShort');
    }

    if (password !== confirmPassword) {
      return t('auth.passwordMismatch');
    }

    return null;
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      await api.post('/users/register', {
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      });
      
      setStep(2);
    } catch (err) {
      const errorData = err.response?.data;
      
      if (errorData?.authMethod === 'google') {
        setError(t(errorData.error) || t('An account with this email already exists. Please sign in with Google instead.'));
      } else {
        setError(t(errorData?.error) || t('Failed to send verification code'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (code) => {
    if (isVerifying) return;

    setIsVerifying(true);

    try {
      const response = await api.post('/users/verify-email', {
        email: formData.email.trim().toLowerCase(),
        code
      });

      const { token, user } = response.data;
      
      setAuthData({ token, user });
      navigate('/predictions');
    } catch (error) {
      console.error('Verification failed:', error);
      setError(t(error.response?.data?.error) || t('Verification failed'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    await api.post('/users/resend-code', {
      email: formData.email.trim().toLowerCase()
    });
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/auth/google`;
  };

  if (step === 2) {
    return (
      <VerificationStep
        email={formData.email}
        onVerify={handleVerify}
        onBack={() => setStep(1)}
        onResend={handleResend}
      />
    );
  }

  return (
    <div className="auth-container">
      <Card className="auth-card">
        <div className="auth-header">
          <h1>{t("register.createAccount")}</h1>
          <p>{t("register.subtitle")}</p>
        </div>

        <form onSubmit={handleSendCode} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">{t("email")}</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={t('placeholder.email')}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t("password")}</label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={t('placeholder.enterPasswordMin')}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">{t("password.confirm")}</label>
            <input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder={t('placeholder.confirmPassword')}
              required
            />
          </div>

          {error && (
            <div className="error-message">{t(error)}</div>
          )}

          <Button type="submit" loading={loading} size="large" fullwidth="true">
            {t('register.createAccount')}
          </Button>

          <p className="auth-link">
            {t("register.existingAccount")} <Link to="/login">{t("register.loginHere")}</Link>
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
