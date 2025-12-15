import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthData } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const isNewUser = params.get('newUser');

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setAuthData({ 
          token, 
          user: { id: payload.userId, username: payload.username } 
        });
        
        setTimeout(() => {
          if (isNewUser) {
            // Show welcome message for new users
            navigate('/predictions?welcome=true', { replace: true });
          } else {
            navigate('/predictions', { replace: true });
          }
        }, 100);
      } catch (error) {
        console.error('Token decode error:', error);
        navigate('/login?error=auth_failed', { replace: true });
      }
    } else {
      navigate('/login?error=auth_failed', { replace: true });
    }
  }, [location.search, navigate, setAuthData]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <h2>Completing login...</h2>
      <div className="spinner-icon" style={{
        width: '60px',
        height: '60px',
        border: '4px solid #e5e7eb',
        borderTopColor: '#667eea',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
    </div>
  );
};
