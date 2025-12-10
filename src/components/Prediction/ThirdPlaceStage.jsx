import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    loadThirdPlaceTeams();
  }, []);

  const loadThirdPlaceTeams = async () => {
    try {
      // Get the user's own group predictions from the database
      const response = await predictionAPI.getMyPredictions();
      const groupRankings = response.data.groupRankings;

      console.log('Group Rankings from DB:', groupRankings);

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

      console.log('Third Place Teams:', thirdPlaceList);

      if (thirdPlaceList.length !== 12) {
        alert(`Error: Expected 12 third-place teams but found ${thirdPlaceList.length}. Please complete all group predictions first.`);
      }

      setThirdPlaceTeams(thirdPlaceList);

      // Load saved selections AFTER we have the teams
      if (response.data.thirdPlaceSelections && response.data.thirdPlaceSelections.length > 0) {
        const savedIds = response.data.thirdPlaceSelections.map(t => t.id);
        console.log('Saved third place selections:', savedIds);
        setSelectedTeams(savedIds);
        
        // Only mark as saved if we have exactly 8 selections
        if (savedIds.length === 8) {
          setSaved(true);
        }
      }
    } catch (error) {
      console.error('Failed to load third place teams:', error);
      alert('Failed to load third place teams. Please ensure all groups are completed.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTeam = (teamId) => {
    if (saved || viewMode) return;

    console.log('Toggle team clicked:', teamId, 'saved:', saved);
    
    if (saved) {
      console.log('Cannot toggle - already saved');
      return;
    }

    setSelectedTeams(prev => {
      if (prev.includes(teamId)) {
        console.log('Removing team:', teamId);
        return prev.filter(id => id !== teamId);
      } else if (prev.length < 8) {
        console.log('Adding team:', teamId);
        return [...prev, teamId];
      } else {
        console.log('Cannot add - already have 8 teams');
        return prev;
      }
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
      alert('Third place selections saved successfully!');
    } catch (error) {
      console.error('Failed to save selections:', error);
      alert(error.response?.data?.error || 'Failed to save selections');
    } finally {
      setSaving(false);
    }
  };

  const handleUnsave = () => {
    if (window.confirm('Are you sure you want to modify your selections? This will unsave them.')) {
      setSaved(false);
    }
  };

  const canContinue = selectedTeams.length === 8 && saved;

  if (loading) {
    return (
      <div className="third-place-stage">
        <div className="stage-header">
          <h2>Third Place Advancers</h2>
          <p>Loading third-place teams...</p>
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
        <div className="stage-header">
          <h2>Third Place Advancers</h2>
          <p className="error-message">
            No third-place teams found. Please complete all 12 group predictions first.
          </p>
        </div>
        <div className="stage-footer">
          <Button onClick={onBack} variant="outline">
            ← Back to Groups
          </Button>
        </div>
      </div>
    );
  }

  console.log('Render - saved:', saved, 'selectedTeams:', selectedTeams);

  return (
    <div className="third-place-stage">
      <div className="stage-header">
        <h2>Third Place Advancers</h2>
        {!viewMode && (<p>Select 8 teams from the 12 third-place finishers that will advance to the knockout stage</p>)}
        {viewMode && (<p>8 teams from the 12 third-place finishers selected here will advance to the knockout stage</p>)}
        {!viewMode && saved && (
          <p className="saved-notice">✓ Selections saved. Click "Edit Selections" below to modify.</p>
        )}
      </div>

      <Card className="selection-info">
        <div className="selection-counter">
          <span className="counter-number">{selectedTeams.length}</span>
          <span className="counter-label">/ 8 teams selected</span>
        </div>

        {!viewMode && (
          saved ? (
            <Button onClick={handleUnsave} variant="outline">
              Edit Selections
            </Button>
          ) : selectedTeams.length === 8 ? (
            <Button onClick={handleSave} loading={saving} variant="success">
              Save Selections
            </Button>
          ) : (
            <div className="selection-hint">
              Select {8 - selectedTeams.length} more team{8 - selectedTeams.length !== 1 ? 's' : ''}
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
              style={{ cursor: canSelect ? 'pointer' : 'not-allowed' }}
            >
              {isSelected && <div className="selection-badge">✓</div>}
              
              <div className="team-group-badge">Group {team.groupCode}</div>
              
              <div className="team-info">
                <div className="team-flag-large">
                  <FlagIcon fifaCode={team.fifa_code} size="large" />
                </div>
                <h3 className="team-name-large">{team.name}</h3>
              </div>

              <div className="team-position-label">3rd Place in Group {team.groupCode}</div>
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
