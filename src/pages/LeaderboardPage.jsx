import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { leaderboardAPI } from '../api/api';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { PredictionPreviewModal } from '../components/Prediction/PredictionPreviewModal';
import './LeaderboardPage.css';

export const LeaderboardPage = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeLeaderboard, setActiveLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [previewUser, setPreviewUser] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load both leaderboards
      const [generalRes, activeRes] = await Promise.all([
        leaderboardAPI.getLeaderboard(),
        leaderboardAPI.getActiveLeaderboard()
      ]);

      setLeaderboard(generalRes.data.leaderboard || []);
      setActiveLeaderboard(activeRes.data.leaderboard || []);

      // Load user's rank if logged in
      try {
        const rankRes = await leaderboardAPI.getMyRank();
        if (rankRes.data.submitted && rankRes.data.qualified) {
          setMyRank(rankRes.data);
        }
      } catch (err) {
        console.log('No rank available');
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalEmoji = (position) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `#${position}`;
  };

  const handlePreviewUser = (userId, username) => {
    setPreviewUser({ userId, username });
  };

  const handleClosePreview = () => {
    setPreviewUser(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="leaderboard-page loading">
        <div className="spinner-icon"></div>
        <p>{t('lead.loading')}</p>
      </div>
    );
  }

  const currentLeaderboard = tab === 'all' ? leaderboard : activeLeaderboard;

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-header">
        <h1>🏆 {t('lead.title')}</h1>
        <p>{t('lead.subtitle')}</p>
      </div>

      {myRank && (
        <Card className={`my-rank-card ${myRank.is_eliminated ? 'eliminated' : ''}`}>
          <div className="my-rank-content">
            <div className="rank-info">
              <span className="rank-label">{t('lead.yourRank')}</span>
              <span className="rank-number">{getMedalEmoji(myRank.rank)}</span>
              {myRank.is_eliminated && (
                <span className="eliminated-badge">❌ Eliminated</span>
              )}
            </div>
            <div className="rank-stats">
              <div className="stat">
                <span className="stat-value">{myRank.accuracy_percentage}%</span>
                <span className="stat-label">{t('lead.accuracy')}</span>
              </div>
              <div className="stat">
                <span className="stat-value">
                  {myRank.correct_predictions}/{myRank.completed_matches}
                </span>
                <span className="stat-label">{t('lead.correct')}</span>
              </div>
            </div>
          </div>
          <div className="submission-time">
            Submitted: {formatDate(myRank.submitted_at)}
          </div>
        </Card>
      )}

      <div className="leaderboard-tabs">
        <button
          className={`tab ${tab === 'all' ? 'active' : ''}`}
          onClick={() => setTab('all')}
        >
          📊 {t('lead.allUsers')} ({leaderboard.length})
        </button>
        <button
          className={`tab ${tab === 'active' ? 'active' : ''}`}
          onClick={() => setTab('active')}
        >
          🔥 {t('lead.stillRunning')} ({activeLeaderboard.length})
        </button>
      </div>

      <Card className="leaderboard-card">
        <div className="leaderboard-table">
          {currentLeaderboard.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>{t('lead.rank')}</th>
                  <th>{t('lead.username')}</th>
                  <th>{t('lead.accuracy')}</th>
                  <th>{t('lead.correct')}</th>
                  <th>{t('lead.completed')}</th>
                  <th>{t('lead.submitted')}</th>
                  <th>{t('lead.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {currentLeaderboard.map((user) => (
                  <tr 
                    key={user.id} 
                    className={myRank?.id === user.id ? 'highlight' : ''}
                  >
                    <td className="rank-cell">
                      {getMedalEmoji(user.rank)}
                    </td>
                    <td className="username-cell">
                      {user.username}
                      {myRank?.id === user.id && (
                        <span className="you-badge">You</span>
                      )}
                    </td>
                    <td className="accuracy-cell">
                      <span className="accuracy-value">
                        {user.accuracy_percentage}%
                      </span>
                    </td>
                    <td>
                      {user.correct_predictions}/{user.completed_matches}
                    </td>
                    <td>
                      <span className="matches-badge">
                        {t('lead.matches', {no_matches: user.completed_matches})} 
                      </span>
                    </td>
                    <td className="date-cell">
                      {formatDate(user.predictions_submitted_at)}
                    </td>
                    <td className="actions-cell">
                      <button 
                        className="preview-btn"
                        onClick={() => handlePreviewUser(user.id, user.username)}
                      >
                        👁️ {t('lead.view')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p>
                {tab === 'all' 
                  ? t('lead.noPredictions')
                  : t('lead.noPlayerRemain')}
              </p>
            </div>
          )}
        </div>
      </Card>

      {activeLeaderboard.length === 0 && leaderboard.length > 0 && tab === 'active' && (
        <Card className="info-card">
          <p className="info-message">
            🏆 {t('lead.allElminated')}
          </p>
        </Card>
      )}

      {previewUser && (
        <PredictionPreviewModal
          userId={previewUser.userId}
          username={previewUser.username}
          onClose={handleClosePreview}
        />
      )}
    </div>
  );
};
