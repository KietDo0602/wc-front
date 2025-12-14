import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import '../components/Auth/Auth.css';

export const CompleteSignupPage = () => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [tempToken, setTempToken] = useState(null);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthData } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    
    if (!token) {
      navigate('/login');
      return;
    }

    setTempToken(token);

    // Try to decode and suggest username
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.displayName) {
        // Suggest username from display name
        const suggested = payload.displayName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .substring(0, 15);
        setUsername(suggested);
      }
    } catch (error) {
      console.error('Token decode error:', error);
    }
  }, [location, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (username.length < 4 || username.length > 20) {
      alert(t('name.required'));
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.completeGoogleSignup({ username }, tempToken);
      
      // Store token and user data
      localStorage.setItem('token', response.data.token);
      setAuthData({ token: response.data.token, user: response.data.user });
      
      navigate('/predictions');
    } catch (error) {
      alert(error.response?.data?.error || t('error.faileCreateAccount'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Card className="auth-card">
        <h2>{t("name.choose")}</h2>
        <p className="auth-subtitle">{t("name.pickUsername")}</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>{t("username")}</label>
            <input
              type="text"
              value={username}
              id="username"
              onChange={(e) => setUsername(e.target.value)}
              minLength={4}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
              title={t("name.validation")}
              required
            />
            <small>{t("name.format")}</small>
          </div>

          <Button type="submit" size="large" loading={loading} fullWidth>
            {loading ? t('name.accountCreate') : t('name.completeSignup')}
          </Button>
        </form>
      </Card>
    </div>
  );
};
