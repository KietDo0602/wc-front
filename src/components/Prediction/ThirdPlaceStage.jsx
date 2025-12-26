import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { predictionAPI } from '../../api/api';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { FlagIcon } from '../../utils/helpers';
import './ThirdPlaceStage.css';

export const ThirdPlaceStage = ({ onComplete, onBack, savedPredictions, viewMode }) => {
  const [thirdPlaceTeams, setThirdPlaceTeams] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    loadThirdPlaceTeams();
  }, []);

  const loadThirdPlaceTeams = async () => {
    try {
      // Get the user's own group predictions from the database
      const response = await predictionAPI.getMyPredictions();
      const groupRankings = response.data.groupRankings;

      // Extract third place teams (position === 3)
      const thirdPlaceList = groupRankings
        .filter(ranking => ranking.position === 3)
        .map(ranking => ({
          id: ranking.team_id,
          name: ranking.team_name,
          fifa_code: ranking.fifa_code,
          groupId: ranking.group_id,
          groupCode: ranking.group_code
        }))
        .sort((a, b) => a.groupId - b.groupId);

      if (thirdPlaceList.length !== 12) {
        alert(t('error.completeGroupPred', {number: thirdPlaceList.length}));
      }

      setThirdPlaceTeams(thirdPlaceList);

      // Load saved selections AFTER we have the teams
      if (response.data.thirdPlaceSelections && response.data.thirdPlaceSelections.length > 0) {
        const savedIds = response.data.thirdPlaceSelections.map(t => t.id);
        setSelectedTeams(savedIds);
        
        // Only mark as saved if we have exactly 8 selections
        if (savedIds.length === 8) {
          setSaved(true);
        }
      }
    } catch (error) {
      console.error('Failed to load third place teams:', error);
      alert(t('error.failedLoadThirdPlace'));
    } finally {
      setLoading(false);
    }
  };

  const toggleTeam = (teamId) => {
    if (saved || viewMode) return;

    if (saved) {
      return;
    }

    setSelectedTeams(prev => {
      if (prev.includes(teamId)) {
        return prev.filter(id => id !== teamId);
      } else if (prev.length < 8) {
        return [...prev, teamId];
      } else {
        return prev;
      }
    });
  };

  const handleSave = async () => {
    if (selectedTeams.length !== 8) {
      alert(t('error.exact8Teams'));
      return;
    }

    setSaving(true);
    try {
      await predictionAPI.submitThirdPlace(selectedTeams);
      setSaved(true);
      alert(t('alert.savedSuccess'));
    } catch (error) {
      console.error('Failed to save selections:', error);
      alert(error.response?.data?.error || t('error.failedSave'));
    } finally {
      setSaving(false);
    }
  };

  const handleUnsave = () => {
    if (window.confirm(t('confirm.unSaved'))) {
      setSaved(false);
    }
  };

  const canContinue = selectedTeams.length === 8 && saved;

  if (loading) {
    return (
      <div className="third-place-stage">
        <div className="third-place-stage-header">
          <h2>{t("pred.thirdPlace.header")}</h2>
          <p>{t("pred.thirdPlace.loading")}</p>
        </div>
        <div className="loading-spinner">
          <div className="spinner-icon"></div>
        </div>
      </div>
    );
  }

  if (thirdPlaceTeams.length === 0) {
    return (
      <div className="third-place-stage">
        <div className="third-place-stage-header">
          <h2>{t("pred.thirdPlace.header")}</h2>
          <p className="error-message">
            {t("pred.thirdPlace.missingGroups")}
          </p>
        </div>
        <div className="stage-footer">
          <Button onClick={onBack} variant="outline">
            ← {t('pred.backToGroups')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="third-place-stage">
      <div className="third-place-stage-header">
        <h2>{t('pred.thirdPlace.header')}</h2>
        {!viewMode && (<p>{t('pred.thirdPlace.text1')}</p>)}
        {viewMode && (<p>{t('pred.thirdPlace.text2')}</p>)}
        {!viewMode && saved && (
          <p className="third-place-saved-notice">✓ {t('pred.thirdPlace.saved')}</p>
        )}
      </div>

      <Card className="selection-info">
        <div className="selection-counter">
          <span className="counter-number">{selectedTeams.length}</span>
          <span className="counter-label">/ {t('pred.thirdPlace.teamSelected')}</span>
        </div>

        {!viewMode && (
          saved ? (
            <Button onClick={handleUnsave} variant="primary">
              {t('pred.thirdPlace.editSelections')}
            </Button>
          ) : selectedTeams.length === 8 ? (
            <Button onClick={handleSave} loading={saving} variant="success">
              {t('pred.thirdPlace.saveSelections')}
            </Button>
          ) : (
            <div className="selection-hint">
              {t('pred.thirdPlace.selectMore', {teams: 8 - selectedTeams.length})}
            </div>
          )
        )}
        
      </Card>

      <div className="third-place-grid">
        {thirdPlaceTeams.map(team => {
          const isSelected = selectedTeams.includes(team.id);
          const canSelect = !saved && (selectedTeams.length < 8 || isSelected);

          return (
            <div
              key={team.id}
              className={`third-place-card ${isSelected ? 'selected' : ''} ${!canSelect ? 'disabled' : ''}`}
              onClick={() => toggleTeam(team.id)}
              style={{ cursor: !viewMode && canSelect ? 'pointer' : 'not-allowed' }}
            >
              {isSelected && <div className="selection-badge">✓</div>}
              
              <div className="team-group-badge">{t("pred.groupStage.group", {group: team.groupCode})}</div>
              
              <div className="team-info">
                <div className="team-flag-large">
                  <FlagIcon fifaCode={team.fifa_code} size="large" />
                </div>
                <h3 className="team-name-large">{team.name}</h3>
              </div>

              <div className="team-position-label">{t('pred.thirdPlace.teamPositionLabel', {group: team.groupCode})}</div>
            </div>
          );
        })}
      </div>

      {viewMode && (
        <div className="third-place-view-mode-notice">
          <p>✓ {t('pred.knockout.locked')}</p>
        </div>
      )}

      {!canContinue && !viewMode && (
        <div className="third-place-help-text-row">
          <p className="third-place-help-text">
            {selectedTeams.length !== 8 
              ? t('pred.thirdPlace.selectMore', {teams: 8 - selectedTeams.length})
              : t('pred.thirdPlace.saveContinue')
            }
          </p>
        </div>
      )}

      <div className="third-place-stage-footer">
        <Button onClick={onBack} variant="outline">
          ← {t('pred.backToGroups')}
        </Button>
        <Button
          onClick={onComplete}
          disabled={!canContinue}
          size="large"
        >
          {t('pred.thirdPlace.continueButton')} →
        </Button>
      </div>

    </div>
  );
};
