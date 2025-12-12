import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/UI/Button';
import './HomePage.css';

export const HomePage = () => {
  const { user } = useAuth();

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="hero-icon">🏆</span>
            World Cup Brackets
          </h1>
          <p className="hero-subtitle">
            Predict every match. Compete with friends. Win glory!
          </p>
          
          {user ? (
            <Link to="/predictions">
              <Button size="large">Make Your Predictions →</Button>
            </Link>
          ) : (
            <div className="hero-buttons">
              <Link to="/register">
                <Button size="large">Get Started</Button>
              </Link>
              <Link to="/login">
                <Button size="large" variant="outline">Login</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="features-section">
        <div className="features-container">
          <div className="feature-card">
            <div className="feature-icon">🏟️</div>
            <h3>Group Stage</h3>
            <p>Predict the final standings for all 12 groups</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🥉</div>
            <h3>Third Place Selection</h3>
            <p>Choose which 8 third-place teams advance to knockouts</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🏆</div>
            <h3>Knockout Bracket</h3>
            <p>Predict winners from Round of 32 all the way to the World Cup Final!</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Live Leaderboard</h3>
            <p>Track your ranking as matches are played and results come in</p>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <h2>Instructions</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h4>Register</h4>
            <p>Create your account to get started!</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h4>Predict</h4>
            <p>Make predictions for all stages: Group Stages, Third Place, Knockout Stages</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h4>Submit</h4>
            <p>Lock in your predictions before <b>11th June 2026</b>, and wait for matches to begin</p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <h4>Compete</h4>
            <p>Watch the leaderboard as results are revealed</p>
          </div>
        </div>
      </section>
    </div>
  );
};
