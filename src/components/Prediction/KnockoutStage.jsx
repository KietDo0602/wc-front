import React, { useState, useEffect } from 'react';
import { predictionAPI } from '../../api/api';
import { Button } from '../UI/Button';
import './KnockoutStage.css';

const MatchCard = ({ match, teams, selectedWinner, onSelect, disabled }) => {
  return (
    <div className="match-card">
      <div className="match-label">{match.name}</div>
      <div className="match-teams">
        {teams.map(team => (
          <div
            key={team.id}
            className={`match-team ${selectedWinner === team.id ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => !disabled && onSelect(match.id, team.id)}
          >
            <span className="team-flag-match">{team.fifa_code}</span>
            <span className="team-name-match">{team.name}</span>
            {selectedWinner === team.id && <span className="winner-badge">✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export const KnockoutStage = ({ onBack, onSubmit, savedPredictions, groupRankings, thirdPlaceAdvancers }) => {
  const [predictions, setPredictions] = useState({});
  const [advancingTeams, setAdvancingTeams] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Initialize advancing teams from group stage winners/runners-up and third place
    initializeKnockoutTeams();

    // Load saved predictions
    if (savedPredictions?.matchPredictions) {
      const saved = {};
      savedPredictions.matchPredictions.forEach(pred => {
        saved[pred.match_id] = pred.predicted_team_id;
      });
      setPredictions(saved);
    }
  }, [groupRankings, thirdPlaceAdvancers, savedPredictions]);

  const initializeKnockoutTeams = () => {
    const teams = {
      roundOf32: []
    };

    // Get winners and runners-up from groups
    Object.values(groupRankings).forEach((ranking, index) => {
      if (ranking && ranking.length >= 2) {
        teams.roundOf32.push(ranking[0]); // Winner
        teams.roundOf32.push(ranking[1]); // Runner-up
      }
    });

    // Add third place advancers
    if (thirdPlaceAdvancers && thirdPlaceAdvancers.length === 8) {
      teams.roundOf32.push(...thirdPlaceAdvancers);
    }

    setAdvancingTeams(teams);
  };

  const handleMatchSelect = async (matchId, winnerId) => {
    setPredictions(prev => ({
      ...prev,
      [matchId]: winnerId
    }));

    // Auto-save individual prediction
    try {
      await predictionAPI.submitMatchPrediction(matchId, winnerId);
    } catch (error) {
      console.error('Failed to save prediction:', error);
    }
  };

  const getMatchTeams = (match) => {
    // This is simplified - in production you'd need proper bracket logic
    // based on FIFA World Cup knockout stage rules
    const roundOf32Teams = advancingTeams.roundOf32 || [];
    
    if (!roundOf32Teams.length) return [];
    
    // Return two teams for demonstration
    const startIndex = (match - 1) * 2;
    return roundOf32Teams.slice(startIndex, startIndex + 2);
  };

  const calculateRoundProgress = (round) => {
    const roundMatches = {
      'R32': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
      'R16': [17, 18, 19, 20, 21, 22, 23, 24],
      'QF': [25, 26, 27, 28],
      'SF': [29, 30],
      'F': [31]
    };

    const matches = roundMatches[round] || [];
    const completed = matches.filter(m => predictions[m]).length;
    return { total: matches.length, completed };
  };

  const canSubmit = () => {
    const r32 = calculateRoundProgress('R32');
    const r16 = calculateRoundProgress('R16');
    const qf = calculateRoundProgress('QF');
    const sf = calculateRoundProgress('SF');
    const f = calculateRoundProgress('F');

    return r32.completed === r32.total &&
           r16.completed === r16.total &&
           qf.completed === qf.total &&
           sf.completed === sf.total &&
           f.completed === f.total;
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSubmit();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to submit predictions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="knockout-stage">
      <div className="stage-header">
        <h2>Knockout Stage Predictions</h2>
        <p>Select the winner of each match through to the final</p>
      </div>

      <div className="knockout-bracket">
        {/* Round of 32 */}
        <div className="bracket-round">
          <h3 className="round-title">Round of 32</h3>
          <div className="round-progress">
            {calculateRoundProgress('R32').completed} / {calculateRoundProgress('R32').total}
          </div>
          <div className="matches-column">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map(matchId => (
              <MatchCard
                key={matchId}
                match={{ id: matchId, name: `Match ${matchId}` }}
                teams={getMatchTeams(matchId)}
                selectedWinner={predictions[matchId]}
                onSelect={handleMatchSelect}
                disabled={false}
              />
            ))}
          </div>
        </div>

        {/* Round of 16 */}
        <div className="bracket-round">
          <h3 className="round-title">Round of 16</h3>
          <div className="round-progress">
            {calculateRoundProgress('R16').completed} / {calculateRoundProgress('R16').total}
          </div>
          <div className="matches-column">
            {[17, 18, 19, 20, 21, 22, 23, 24].map(matchId => (
              <MatchCard
                key={matchId}
                match={{ id: matchId, name: `Match ${matchId}` }}
                teams={getMatchTeams(matchId)}
                selectedWinner={predictions[matchId]}
                onSelect={handleMatchSelect}
                disabled={false}
              />
            ))}
          </div>
        </div>

        {/* Quarter Finals */}
        <div className="bracket-round">
          <h3 className="round-title">Quarter Finals</h3>
          <div className="round-progress">
            {calculateRoundProgress('QF').completed} / {calculateRoundProgress('QF').total}
          </div>
          <div className="matches-column">
            {[25, 26, 27, 28].map(matchId => (
              <MatchCard
                key={matchId}
                match={{ id: matchId, name: `QF ${matchId - 24}` }}
                teams={getMatchTeams(matchId)}
                selectedWinner={predictions[matchId]}
                onSelect={handleMatchSelect}
                disabled={false}
              />
            ))}
          </div>
        </div>

        {/* Semi Finals */}
        <div className="bracket-round">
          <h3 className="round-title">Semi Finals</h3>
          <div className="round-progress">
            {calculateRoundProgress('SF').completed} / {calculateRoundProgress('SF').total}
          </div>
          <div className="matches-column">
            {[29, 30].map(matchId => (
              <MatchCard
                key={matchId}
                match={{ id: matchId, name: `SF ${matchId - 28}` }}
                teams={getMatchTeams(matchId)}
                selectedWinner={predictions[matchId]}
                onSelect={handleMatchSelect}
                disabled={false}
              />
            ))}
          </div>
        </div>

        {/* Final */}
        <div className="bracket-round final-round">
          <h3 className="round-title">🏆 Final</h3>
          <div className="round-progress">
            {calculateRoundProgress('F').completed} / {calculateRoundProgress('F').total}
          </div>
          <div className="matches-column">
            <MatchCard
              match={{ id: 31, name: 'Final' }}
              teams={getMatchTeams(31)}
              selectedWinner={predictions[31]}
              onSelect={handleMatchSelect}
              disabled={false}
            />
          </div>
        </div>
      </div>

      <div className="stage-footer">
        <Button onClick={onBack} variant="outline">
          ← Back to Third Place
        </Button>
        
        {canSubmit() ? (
          <Button
            onClick={handleSubmit}
            loading={saving}
            size="large"
            variant="success"
          >
            🎯 Submit All Predictions
          </Button>
        ) : (
          <div className="completion-status">
            <p>Complete all matches to submit your predictions</p>
          </div>
        )}
      </div>
    </div>
  );
};
