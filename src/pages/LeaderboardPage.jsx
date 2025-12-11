import React, { useState, useEffect } from 'react';
import { leaderboardAPI } from '../api/api';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { PredictionPreviewModal } from '../components/Prediction/PredictionPreviewModal';
import './LeaderboardPage.css';

export const LeaderboardPage = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [previewUser, setPreviewUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [leaderboardRes, activeRes] = await Promise.all([
        leaderboardAPI.getLeaderboard(),
        leaderboardAPI.getActive()
      ]);

      setLeaderboard(leaderboardRes.data.leaderboard);
      setActiveUsers(activeRes.data.activeUsers);

      try {
        const rankRes = await leaderboardAPI.getMyRank();
        setMyRank(rankRes.data.ranking);
      } catch (err) {
        // User might not have predictions yet
        console.log('No rank available yet');
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
    return position;
  };

  const handlePreviewUser = (userId, username) => {
    setPreviewUser({ userId, username });
  };

  const handleClosePreview = () => {
    setPreviewUser(null);
  };

  if (loading) {
    return (
      <div className="leaderboard-page loading">
        <div className="spinner-icon"></div>
        <p>Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-header">
        <h1>🏆 Leaderboard</h1>
        <p>See how you stack up against other predictors</p>
      </div>

      {myRank && (
        <Card className="my-rank-card">
          <div className="my-rank-content">
            <div className="rank-info">
              <span className="rank-label">Your Rank</span>
              <span className="rank-number">#{myRank.rank}</span>
            </div>
            <div className="rank-stats">
              <div className="stat">
                <span className="stat-value">{myRank.correct_match_predictions}</span>
                <span className="stat-label">Correct</span>
              </div>
              <div className="stat">
                <span className="stat-value">{myRank.total_predictions}</span>
                <span className="stat-label">Total</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="leaderboard-tabs">
        <button
          className={`tab ${tab === 'all' ? 'active' : ''}`}
          onClick={() => setTab('all')}
        >
          All Users ({leaderboard.length})
        </button>
        <button
          className={`tab ${tab === 'active' ? 'active' : ''}`}
          onClick={() => setTab('active')}
        >
          Still in the Running ({activeUsers.length})
        </button>
      </div>

      <Card className="leaderboard-card">
        <div className="leaderboard-table">
          {tab === 'all' && leaderboard.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Username</th>
                  <th>Correct</th>
                  <th>Total</th>
                  <th>Accuracy</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((user, index) => (
                  <tr key={user.user_id} className={myRank?.user_id === user.user_id ? 'highlight' : ''}>
                    <td className="rank-cell">{getMedalEmoji(index + 1)}</td>
                    <td className="username-cell">{user.username}</td>
                    <td>{user.correct_match_predictions}</td>
                    <td>{user.total_predictions}</td>
                    <td>{user.accuracy_percentage}%</td>
                    <td className="actions-cell">
                      <button 
                        className="preview-btn"
                        onClick={() => handlePreviewUser(user.user_id, user.username)}
                      >
                        👁️ View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'active' && activeUsers.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeUsers.map((user, index) => (
                  <tr key={user.id}>
                    <td>{index + 1}</td>
                    <td className="username-cell">{user.username}</td>
                    <td>{user.email}</td>
                    <td><span className="status-badge active">✓ Active</span></td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="actions-cell">
                      <button 
                        className="preview-btn"
                        onClick={() => handlePreviewUser(user.id, user.username)}
                      >
                        👁️ View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {((tab === 'all' && leaderboard.length === 0) || (tab === 'active' && activeUsers.length === 0)) && (
            <div className="empty-state">
              <p>No users found</p>
            </div>
          )}
        </div>
      </Card>

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
