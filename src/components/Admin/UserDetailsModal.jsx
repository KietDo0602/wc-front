import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api/adminApi';
import { Button } from '../UI/Button';
import { FlagIcon } from '../../utils/helpers';
import './UserDetailsModal.css';

export const UserDetailsModal = ({ user, onClose, onRefresh }) => {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    loadPredictions();
  }, [user.user.id]);

  const loadPredictions = async () => {
    try {
      const response = await adminAPI.getUserPredictions(user.user.id);
      setPredictions(response.data);
    } catch (error) {
      console.error('Failed to load predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async () => {
    const reason = prompt('Enter reason for banning:');
    if (!reason) return;

    try {
      await adminAPI.banUser(user.user.id, reason);
      alert('User banned successfully');
      onRefresh();
      onClose();
    } catch (error) {
      alert('Failed to ban user');
    }
  };

  const handleUnban = async () => {
    if (!window.confirm('Unban this user?')) return;

    try {
      await adminAPI.unbanUser(user.user.id);
      alert('User unbanned successfully');
      onRefresh();
      onClose();
    } catch (error) {
      alert('Failed to unban user');
    }
  };

  const handleDelete = async () => {
    const confirmation = prompt(
      `⚠️ WARNING: Type "${user.user.username}" to confirm deletion:`
    );
    
    if (confirmation !== user.user.username) return;

    try {
      await adminAPI.deleteUser(user.user.id);
      alert('User deleted successfully');
      onRefresh();
      onClose();
    } catch (error) {
      alert('Failed to delete user');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content user-details-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>👤 User Details</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="modal-tabs">
          <button
            className={`modal-tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Info
          </button>
          <button
            className={`modal-tab ${activeTab === 'predictions' ? 'active' : ''}`}
            onClick={() => setActiveTab('predictions')}
          >
            Predictions
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'info' && (
            <div className="user-info">
              <div className="info-grid">
                <div className="info-item">
                  <label>ID</label>
                  <span>{user.user.id}</span>
                </div>
                <div className="info-item">
                  <label>Username</label>
                  <span>{user.user.username}</span>
                </div>
                <div className="info-item">
                  <label>Email</label>
                  <span>{user.user.email}</span>
                </div>
                <div className="info-item">
                  <label>Role</label>
                  <span className={`role-badge role-${user.user.role}`}>
                    {user.user.role}
                  </span>
                </div>
                <div className="info-item">
                  <label>Status</label>
                  <span>
                    {user.user.is_banned ? (
                      <span className="status-badge status-banned">Banned</span>
                    ) : user.user.eliminated ? (
                      <span className="status-badge status-eliminated">Eliminated</span>
                    ) : (
                      <span className="status-badge status-active">Active</span>
                    )}
                  </span>
                </div>
                <div className="info-item">
                  <label>Joined</label>
                  <span>{new Date(user.user.created_at).toLocaleDateString()}</span>
                </div>
                <div className="info-item">
                  <label>Auth Method</label>
                  <span>{user.user.google_id ? '🔵 Google' : '📧 Email/Password'}</span>
                </div>
                <div className="info-item">
                  <label>Predictions</label>
                  <span>
                    Groups: {user.predictions.group_predictions} | 
                    3rd Place: {user.predictions.third_place_predictions} | 
                    Knockout: {user.predictions.knockout_predictions}
                  </span>
                </div>
              </div>

              {user.user.is_banned && (
                <div className="ban-info">
                  <h4>🚫 Ban Information</h4>
                  <p><strong>Reason:</strong> {user.user.banned_reason}</p>
                  <p><strong>Banned At:</strong> {new Date(user.user.banned_at).toLocaleString()}</p>
                </div>
              )}

              {user.user.eliminated && (
                <div className="elimination-info">
                  <h4>❌ Elimination Information</h4>
                  <p><strong>Reason:</strong> {user.user.eliminated_reason}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'predictions' && (
            <div className="predictions-view">
              {loading ? (
                <div className="loading-state">
                  <div className="spinner-icon"></div>
                  <p>Loading predictions...</p>
                </div>
              ) : predictions ? (
                <>
                  {/* Group Rankings */}
                  <div className="prediction-section">
                    <h3>📊 Group Stage Predictions</h3>
                    {predictions.groupRankings.length > 0 ? (
                      <div className="groups-predictions">
                        {Object.entries(
                          predictions.groupRankings.reduce((acc, ranking) => {
                            if (!acc[ranking.group_code]) acc[ranking.group_code] = [];
                            acc[ranking.group_code].push(ranking);
                            return acc;
                          }, {})
                        ).map(([groupCode, rankings]) => (
                          <div key={groupCode} className="group-prediction-card">
                            <h4>Group {groupCode}</h4>
                            <ol>
                              {rankings.sort((a, b) => a.position - b.position).map(r => (
                                <li key={r.id}>
                                  <FlagIcon fifaCode={r.fifa_code} size="small" />
                                  <span>{r.team_name}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-data">No group predictions yet</p>
                    )}
                  </div>

                  {/* Third Place */}
                  <div className="prediction-section">
                    <h3>🥉 Third Place Selections</h3>
                    {predictions.thirdPlaceSelections.length > 0 ? (
                      <div className="third-place-list">
                        {predictions.thirdPlaceSelections.map(team => (
                          <div key={team.id} className="team-chip">
                            <FlagIcon fifaCode={team.fifa_code} size="small" />
                            <span>{team.team_name}</span>
                            <span className="group-label">Group {team.group_code}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-data">No third place selections yet</p>
                    )}
                  </div>

                  {/* Knockout */}
                  <div className="prediction-section">
                    <h3>🏆 Knockout Predictions</h3>
                    {predictions.knockoutPredictions.length > 0 ? (
                      <div className="knockout-list">
                        {Object.entries(
                          predictions.knockoutPredictions.reduce((acc, pred) => {
                            if (!acc[pred.round]) acc[pred.round] = [];
                            acc[pred.round].push(pred);
                            return acc;
                          }, {})
                        ).map(([round, preds]) => (
                          <div key={round} className="round-predictions">
                            <h4>{round.replace('_', ' ').toUpperCase()}</h4>
                            <div className="matches-grid">
                              {preds.sort((a, b) => a.match_number - b.match_number).map(pred => (
                                <div key={pred.id} className="match-prediction">
                                  <span className="match-number">Match {pred.match_number}</span>
                                  {pred.winner_name ? (
                                    <>
                                      <FlagIcon fifaCode={pred.winner_fifa_code} size="small" />
                                      <span>{pred.winner_name}</span>
                                    </>
                                  ) : (
                                    <span className="no-prediction">Not predicted</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-data">No knockout predictions yet</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="no-data">Failed to load predictions</p>
              )}
            </div>
          )}
        </div>

        {user.user.role !== 'admin' && (
          <div className="modal-footer">
            {user.user.is_banned ? (
              <Button onClick={handleUnban} variant="success">
                Unban User
              </Button>
            ) : (
              <Button onClick={handleBan} variant="warning">
                Ban User
              </Button>
            )}
            <Button onClick={handleDelete} variant="danger">
              Delete User
            </Button>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
