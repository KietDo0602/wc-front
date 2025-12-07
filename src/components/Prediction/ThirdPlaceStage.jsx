import React, { useState, useEffect } from 'react';
import { predictionAPI } from '../../api/api';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import './ThirdPlaceStage.css';

export const ThirdPlaceStage = ({ onComplete, onBack, savedPredictions, groupRankings }) => {
  const [thirdPlaceTeams, setThirdPlaceTeams] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Extract third place teams from group rankings
    const thirdPlace = [];
    Object.entries(groupRankings).forEach(([groupId, teams]) => {
      if (teams && teams.length >= 3) {
        thirdPlace.push({
          ...teams[2], // Third place (index 2)
          groupId: parseInt(groupId),
          groupCode: String.fromCharCode(64 + parseInt(groupId)) // A-L
        });
      }
    });
    setThirdPlaceTeams(thirdPlace.sort((a, b) => a.groupId - b.groupId));

    // Load saved selections
    if (savedPredictions?.thirdPlaceSelections) {
      setSelectedTeams(savedPredictions.thirdPlaceSelections.map(t => t.id));
      setSaved(true);
    }
  }, [groupRankings, savedPredictions]);

  const toggleTeam = (teamId) => {
    if (saved) return;

    setSelectedTeams(prev => {
      if (prev.includes(teamId)) {
        return prev.filter(id => id !== teamId);
      } else if (prev.length < 8) {
        return [...prev, teamId];
      }
      return prev;
    });
  };

  const handleSave = async () => {
    if (selectedTeams.length !== 8) {
      alert('Please select exactly 8 teams');
      return;
    }

    setSaving(true);
    try {
      await predictionAPI.submitThirdPlace(selectedTeams);
      setSaved(true);
    } catch (error) {
      console.error('Failed to save selections:', error);
      alert(error.response?.data?.error || 'Failed to save selections');
    } finally {
      setSaving(false);
    }
  };

  const canContinue = selectedTeams.length === 8 && saved;

  return (
    <div className="third-place-stage">
      <div className="stage-header">
        <h2>Third Place Advancers</h2>
        <p>Select 8 teams from the 12 third-place finishers that will advance to the knockout stage</p>
      </div>

      <Card className="selection-info">
        <div className="selection-counter">
          <span className="counter-number">{selectedTeams.length}</span>
          <span className="counter-label">/ 8 teams selected</span>
        </div>
        {selectedTeams.length === 8 && !saved && (
          <Button onClick={handleSave} loading={saving} variant="success">
            Save Selections
          </Button>
        )}
        {saved && (
          <div className="saved-indicator">
            <span className="check-icon">✓</span>
            Selections Saved
          </div>
        )}
      </Card>

      <div className="third-place-grid">
        {thirdPlaceTeams.map(team => {
          const isSelected = selectedTeams.includes(team.id);
          const canSelect = selectedTeams.length < 8 || isSelected;

          return (
            <div
              key={team.id}
              className={`third-place-card ${isSelected ? 'selected' : ''} ${!canSelect || saved ? 'disabled' : ''}`}
              onClick={() => canSelect && toggleTeam(team.id)}
            >
              {isSelected && <div className="selection-badge">✓</div>}
              
              <div className="team-group-badge">Group {team.groupCode}</div>
              
              <div className="team-info">
                <div className="team-flag-large">{team.fifa_code}</div>
                <h3 className="team-name-large">{team.name}</h3>
              </div>

              <div className="team-position-label">3rd Place</div>
            </div>
          );
        })}
      </div>

      <div className="stage-footer">
        <Button onClick={onBack} variant="outline">
          ← Back to Groups
        </Button>
        <Button
          onClick={onComplete}
          disabled={!canContinue}
          size="large"
        >
          Continue to Knockout Stage →
        </Button>
      </div>

      {!canContinue && (
        <p className="help-text">
          {selectedTeams.length !== 8 
            ? `Select ${8 - selectedTeams.length} more team${8 - selectedTeams.length !== 1 ? 's' : ''}`
            : 'Save your selections to continue'}
        </p>
      )}
    </div>
  );
};
