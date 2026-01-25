import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { predictionAPI } from '../../api/api';
import { Button } from '../UI/Button';
import { FlagIcon } from '../../utils/helpers';
import './PredictionPreviewModal.css';

export const PredictionPreviewModal = ({ userId, username, onClose }) => {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('groups');
  const { t } = useTranslation();

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
            <h3>{t('pred.groupStage.group', { group: group.groupCode})}</h3>
            <div className="preview-rankings">
              {group.rankings
                .sort((a, b) => a.position - b.position)
                .map((ranking, index) => (
                  <div key={ranking.team_id} className={`preview-team position-${ranking.position}`}>
                    <span className="position-badge">
                      {['🥇 1st', '🥈 2nd', '🥉 3rd', '4th'][index]}
                    </span>
                    <span className="team-flag">
                      <FlagIcon fifaCode={ranking.fifa_code} size="normal" />
                    </span>
                    <span className="team-name">{t(ranking.fifa_code)}</span>
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
      return <div className="empty-state">{t('pred.thirdPlace.none')}</div>;
    }

    return (
      <div className="preview-third-place">
        <h3>{t('pred.selected', {number: predictions.thirdPlaceSelections.length})}</h3>
        <div className="preview-third-grid">
          {predictions.thirdPlaceSelections.map(team => (
            <div key={team.id} className="preview-third-card">
              <div className="team-flag-large">
                <FlagIcon fifaCode={team.fifa_code} size="large" />
              </div>
              <div className="team-name-large">{t(team.fifa_code)}</div>
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
      'R32': t('pred.roundof32'),
      'R16': t('pred.roundof16'),
      'QF': t('pred.quarterfinals'),
      'SF': t('pred.semifinals'),
      'F': t('pred.final'),
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
                      <span className="winner-flag">
                        <FlagIcon fifaCode={match.fifa_code} size="normal" />
                      </span>
                      <span className="winner-name">{t(match.fifa_code)}</span>
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
          <h2>👤 {t('pred.prediction.userPrediction', {user: username})}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab ${tab === 'groups' ? 'active' : ''}`}
            onClick={() => setTab('groups')}
          >
            {t('pred.groupStage')}
          </button>
          <button 
            className={`tab ${tab === 'third' ? 'active' : ''}`}
            onClick={() => setTab('third')}
          >
            {t('pred.thirdPlace')}
          </button>
          <button 
            className={`tab ${tab === 'knockout' ? 'active' : ''}`}
            onClick={() => setTab('knockout')}
          >
            {t('pred.knockout')}
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner-icon"></div>
              <p>{t('pred.prediction.loading')}</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>⚠️ {t(error)}</p>
              <p className="error-hint">
                {error.includes('not available') 
                  ? t('pred.prediction.notSubmitted')
                  : 'pred.prediction.tryAgain'}
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
          <Button onClick={onClose} variant="outline">{t('button.close')}</Button>
        </div>
      </div>
    </div>
  );
};
