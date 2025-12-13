import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/UI/Button';
import './HomePage.css';

export const HomePage = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="hero-icon">🏆</span>
            World Cup Brackets
          </h1>
          <p className="hero-subtitle">
            {t("home.subtitle")}
          </p>
          
          {user ? (
            <Link to="/predictions">
              <Button size="large">{t("home.predictions")} →</Button>
            </Link>
          ) : (
            <div className="hero-buttons">
              <Link to="/register">
                <Button size="large">{t("home.getStarted")}</Button>
              </Link>
              <Link to="/login">
                <Button size="large" variant="outline">{t("home.login")}</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="features-section">
        <div className="features-container">
          <div className="feature-card">
            <div className="feature-icon">🏟️</div>
            <h3>{t("home.groupStage")}</h3>
            <p>{t("home.groupStageDesc")}</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🥉</div>
            <h3>{t("home.thirdPlace")}</h3>
            <p>{t("home.thirdPlaceDesc")}</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🏆</div>
            <h3>{t("home.knockout")}</h3>
            <p>{t("home.knockoutDesc")}</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>{t("home.leaderboard")}</h3>
            <p>{t("home.leaderboardDesc")}</p>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <h2>{t("home.instructions")}</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h4>{t("home.instructions.register")}</h4>
            <p>{t("home.instructions.register.desc")}</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h4>{t("home.instructions.predict")}</h4>
            <p>{t("home.instructions.predict.desc")}</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h4>{t("home.instructions.submit")}</h4>
            <p>{t("home.instructions.submit.desc")}</p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <h4>{t("home.instructions.compete")}</h4>
            <p>{t("home.instructions.compete.desc")}</p>
          </div>
        </div>
      </section>
    </div>
  );
};
