import React, { useState, useEffect } from 'react';
import { predictionAPI } from '../../api/api';
import { Button } from '../UI/Button';
import { getFlagEmoji } from '../../utils/helpers';
import './PredictionPreviewModal.css';

export const PredictionPreviewModal = ({ userId, username, onClose }) => {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('groups');

  useEffect(() => {
    loadUserPredictions();
  }, [userId]);

  const loadUserPredictions = async () => {
    try {
      const response = await predictionAPI.getUserPredictions(userId);
      setPredictions(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load predictions:', error);
      setError(error.response?.data?.error || 'Failed to load predictions');
      setLoading(false);
    }
  };

  const renderGroupPredictions = () => {
    if (!predictions?.groupRankings || predictions.groupRankings.length === 0) {
      return <div className="empty-state">No group predictions available</div>;
    }

    // Group rankings by group
    const groupedRankings = {};
    predictions.groupRankings.forEach(ranking => {
      if (!groupedRankings[ranking.group_id]) {
        groupedRankings[ranking.group_id] = {
          groupId: ranking.group_id,
          groupCode: ranking.group_code,
          rankings: []
        };
      }
      groupedRankings[ranking.group_id].rankings.push(ranking);
    });

    return (
      <div className="preview-groups-grid">
        {Object.values(groupedRankings).map(group => (
          <div key={group.groupId} className="preview-group-card">
            <h3>Group {group.groupCode}</h3>
            <div className="preview-rankings">
              {group.rankings
                .sort((a, b) => a.position - b.position)
                .map((ranking, index) => (
                  <div key={ranking.team_id} className={`preview-team position-${ranking.position}`}>
                    <span className="position-badge">
                      {['🥇 1st', '🥈 2nd', '🥉 3rd', '4th'][index]}
                    </span>
                    <span className="team-flag">{getFlagEmoji(ranking.fifa_code)}</span>
                    <span className="team-name">{ranking.team_name}</span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderThirdPlacePredictions = () => {
    if (!predictions?.thirdPlaceSelections || predictions.thirdPlaceSelections.length === 0) {
      return <div className="empty-state">No third-place predictions available</div>;
    }

    return (
      <div className="preview-third-place">
        <h3>Selected Third-Place Advancers ({predictions.thirdPlaceSelections.length}/8)</h3>
        <div className="preview-third-grid">
          {predictions.thirdPlaceSelections.map(team => (
            <div key={team.id} className="preview-third-card">
              <div className="team-flag-large">{getFlagEmoji(team.fifa_code)}</div>
              <div className="team-name-large">{team.name}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderKnockoutPredictions = () => {
    if (!predictions?.matchPredictions || predictions.matchPredictions.length === 0) {
      return <div className="empty-state">No knockout predictions available</div>;
    }

    // Group by round
    const byRound = {
      'R32': [],
      'R16': [],
      'QF': [],
      'SF': [],
      'F': []
    };

    predictions.matchPredictions.forEach(pred => {
      if (byRound[pred.round]) {
        byRound[pred.round].push(pred);
      }
    });

    const roundNames = {
      'R32': 'Round of 32',
      'R16': 'Round of 16',
      'QF': 'Quarter Finals',
      'SF': 'Semi Finals',
      'F': 'Final'
    };

    return (
      <div className="preview-knockout">
        {Object.entries(byRound).map(([round, matches]) => {
          if (matches.length === 0) return null;
          
          return (
            <div key={round} className="preview-round">
              <h3>{roundNames[round]}</h3>
              <div className="preview-matches">
                {matches.map(match => (
                  <div key={match.match_id} className="preview-match">
                    <span className="match-number">{match.match_name}</span>
                    <div className="predicted-winner">
                      <span className="winner-flag">{getFlagEmoji(match.fifa_code)}</span>
                      <span className="winner-name">{match.predicted_team_name}</span>
                      <span className="winner-badge">✓</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>👤 {username}'s Predictions</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab ${tab === 'groups' ? 'active' : ''}`}
            onClick={() => setTab('groups')}
          >
            Group Stage
          </button>
          <button 
            className={`tab ${tab === 'third' ? 'active' : ''}`}
            onClick={() => setTab('third')}
          >
            Third Place
          </button>
          <button 
            className={`tab ${tab === 'knockout' ? 'active' : ''}`}
            onClick={() => setTab('knockout')}
          >
            Knockout
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner-icon"></div>
              <p>Loading predictions...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>⚠️ {error}</p>
              <p className="error-hint">
                {error.includes('not available') 
                  ? 'This user has not submitted their predictions yet.'
                  : 'Please try again later.'}
              </p>
            </div>
          ) : (
            <>
              {tab === 'groups' && renderGroupPredictions()}
              {tab === 'third' && renderThirdPlacePredictions()}
              {tab === 'knockout' && renderKnockoutPredictions()}
            </>
          )}
        </div>

        <div className="modal-footer">
          <Button onClick={onClose} variant="outline">Close</Button>
        </div>
      </div>
    </div>
  );
};
