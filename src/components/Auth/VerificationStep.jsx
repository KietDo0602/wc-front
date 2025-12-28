import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../UI/Button';
import { Card } from '../UI/Card';
import './Auth.css';

export const VerificationStep = ({ email, onVerify, onBack, onResend }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [canResend, setCanResend] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (code.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      await onVerify(code);
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setLoading(true);
    try {
      await onResend();
      setTimeLeft(600);
      setCanResend(false);
      alert('A new verification code has been sent to your email');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Card className="auth-card">
        <div className="auth-header">
          <h1>📧 Verify Your Email</h1>
          <p>We've sent a 6-digit code to:</p>
          <p style={{ fontWeight: 600, color: 'var(--primary)' }}>{email}</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="code">Verification Code</label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              style={{
                fontSize: '1.5rem',
                letterSpacing: '0.5rem',
                textAlign: 'center',
                fontFamily: 'monospace'
              }}
              required
              autoFocus
            />
          </div>

          <div style={{
            textAlign: 'center',
            marginBottom: '1rem',
            color: timeLeft < 60 ? '#ef4444' : 'var(--text-secondary)'
          }}>
            {timeLeft > 0 ? (
              <span>Code expires in: <strong>{formatTime(timeLeft)}</strong></span>
            ) : (
              <span style={{ color: '#ef4444' }}>Code expired</span>
            )}
          </div>

          <Button 
            type="submit" 
            loading={loading}
            disabled={code.length !== 6 || timeLeft === 0}
            size="large"
            fullwidth="true"
          >
            Verify & Create Account
          </Button>

          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginTop: '1rem',
            flexDirection: 'column'
          }}>
            <Button
              type="button"
              onClick={handleResend}
              disabled={!canResend || loading}
              variant="outline"
              size="small"
            >
              {canResend ? 'Resend Code' : `Resend in ${formatTime(timeLeft)}`}
            </Button>

            <Button
              type="button"
              onClick={onBack}
              variant="outline"
              size="small"
            >
              ← Back to Registration
            </Button>
          </div>
        </form>

        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: '#f3f4f6',
          borderRadius: '8px',
          fontSize: '0.875rem',
          color: '#6b7280'
        }}>
          <strong>💡 Tip:</strong> Check your spam folder if you don't see the email within a few minutes.
        </div>
      </Card>
    </div>
  );
};
