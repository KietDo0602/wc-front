import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthData } = useAuth();
  const hasProcessed = useRef(false); // Prevent double execution

  useEffect(() => {
    // Prevent running twice (React 18 strict mode)
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setAuthData({ 
          token, 
          user: { id: payload.userId, username: payload.username } 
        });
        navigate('/predictions', { replace: true }); // Use replace to avoid back button issues
      } catch (error) {
        console.error('Token decode error:', error);
        navigate('/login?error=auth_failed', { replace: true });
      }
    } else {
      navigate('/login?error=auth_failed', { replace: true });
    }
  }, [location.search, navigate, setAuthData]); // Include all dependencies

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
      <div className="spinner-icon"></div>
    </div>
  );
};
