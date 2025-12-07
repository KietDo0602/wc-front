import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../UI/Button';
import './Header.css';

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="app-header">
      <div className="header-container">
        <Link to="/" className="logo">
          <span className="logo-icon">⚽</span>
          <span className="logo-text">World Cup Predictor</span>
        </Link>

        <nav className="nav-menu">
          {user ? (
            <>
              <Link 
                to="/predictions" 
                className={`nav-link ${isActive('/predictions') ? 'active' : ''}`}
              >
                My Predictions
              </Link>
              <Link 
                to="/leaderboard" 
                className={`nav-link ${isActive('/leaderboard') ? 'active' : ''}`}
              >
                Leaderboard
              </Link>
              <div className="user-menu">
                <span className="user-name">{user.username}</span>
                <Button onClick={handleLogout} variant="outline" size="small">
                  Logout
                </Button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="outline" size="small">Login</Button>
              </Link>
              <Link to="/register">
                <Button size="small">Register</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
