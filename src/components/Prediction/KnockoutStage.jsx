import React, { useState, useEffect, useRef } from 'react';
import { predictionAPI } from '../../api/api';
import { Button } from '../UI/Button';
import { getThirdPlaceMatchup, findMatchingElement} from '../../utils/helpers';
import html2canvas from 'html2canvas';
import './KnockoutStage.css';

const MatchCard = ({ match, teams, selectedWinner, onSelect, disabled, compact }) => {
  if (!teams || teams.length === 0) {
    return (
      <div className={`match-card empty ${compact ? 'compact' : ''}`}>
        <div className="match-label">{match.name}</div>
        <div className="match-placeholder">
          <p>TBD</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`match-card ${compact ? 'compact' : ''}`}>
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

export const KnockoutStage = ({ onBack, onSubmit, savedPredictions, viewMode }) => {
  const [predictions, setPredictions] = useState({});
  const [roundOf32Teams, setRoundOf32Teams] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const bracketRef = useRef(null);

  useEffect(() => {
    initializeKnockoutTeams();
    
    if (savedPredictions?.matchPredictions) {
      const saved = {};
      savedPredictions.matchPredictions.forEach(pred => {
        saved[pred.match_id] = pred.predicted_team_id;
      });
      setPredictions(saved);
    }
  }, [savedPredictions]);

  const initializeKnockoutTeams = async () => {
    try {
      const response = await predictionAPI.getMyPredictions();
      const groupRankings = response.data.groupRankings;
      const thirdPlaceSelections = response.data.thirdPlaceSelections;

      if (!groupRankings || groupRankings.length === 0) {
        console.error('No group rankings found');
        setLoading(false);
        return;
      }

      if (!thirdPlaceSelections || thirdPlaceSelections.length !== 8) {
        alert('Please complete third-place selections first (need exactly 8 teams)');
        setLoading(false);
        return;
      }

      const teams = [];
      const groupsMap = {};
      
      groupRankings.forEach(ranking => {
        if (!groupsMap[ranking.group_id]) {
          groupsMap[ranking.group_id] = [];
        }
        groupsMap[ranking.group_id][ranking.position - 1] = {
          id: ranking.team_id,
          name: ranking.team_name,
          fifa_code: ranking.fifa_code
        };
      });

      const sortedGroups = Object.keys(groupsMap).sort((a, b) => parseInt(a) - parseInt(b));
      
      sortedGroups.forEach(groupId => {
        const ranking = groupsMap[groupId];
        if (ranking && ranking.length >= 3) {
          if (ranking[0]) {
            teams.push({ ...ranking[0], groupId: parseInt(groupId), position: 1 });
          }
          if (ranking[1]) {
            teams.push({ ...ranking[1], groupId: parseInt(groupId), position: 2 });
          }
          if (ranking[2]) {
            teams.push({ ...ranking[2], groupId: parseInt(groupId), position: 3 });
          }
        }
      });

      let result = [];
      if (thirdPlaceSelections && thirdPlaceSelections.length === 8) {
        const idsThirdPlace = new Set(thirdPlaceSelections.map(team => team.id));
        result = teams.filter(team => team.position < 3 || idsThirdPlace.has(team.id));
      }

      setRoundOf32Teams(result);
    } catch (error) {
      console.error('Failed to initialize knockout teams:', error);
      alert('Failed to load knockout stage. Please ensure all previous stages are complete.');
    } finally {
      setLoading(false);
    }
  };

  const handleMatchSelect = async (matchId, winnerId) => {
    setPredictions(prev => ({
      ...prev,
      [matchId]: winnerId
    }));

    try {
      await predictionAPI.submitMatchPrediction(matchId, winnerId);
    } catch (error) {
      console.error('Failed to save prediction:', error);
    }
  };

  function helperGetTeam(teams, groupId, position) {
    const res = teams.find(team => team.groupId === groupId && team.position === position);
    // console.log(res);
    return res;
  }

  const getWinnerOfMatch = (matchId) => {
    const winnerId = predictions[matchId];
    if (!winnerId) return null;
    
    return roundOf32Teams.find(team => team.id === winnerId);
  };

  const getMatchTeams = (matchId) => {
    if (matchId >= 1 && matchId <= 16) {
      const thirdPlaceTeams = roundOf32Teams.filter(team => team.position === 3);
      const matchups = findMatchingElement(thirdPlaceTeams);

      if (matchId === 1) {
        const team1 = helperGetTeam(roundOf32Teams, 5, 1);
        // Get the group in which the third place opponent that first team will be playing
        const team2Group = matchups[5];
        const team2 = helperGetTeam(roundOf32Teams, team2Group, 3);
        return [team1, team2];
      }
      if (matchId === 2) {
        const team1 = helperGetTeam(roundOf32Teams, 9, 1);
        // Get the group in which the third place opponent that first team will be playing
        const team2Group = matchups[9];
        const team2 = helperGetTeam(roundOf32Teams, team2Group, 3);
        return [team1, team2];
      }
      if (matchId === 3) {
        const team1 = helperGetTeam(roundOf32Teams, 1, 2);
        const team2 = helperGetTeam(roundOf32Teams, 2, 2);
        return [team1, team2];
      }
      if (matchId === 4) {
        const team1 = helperGetTeam(roundOf32Teams, 6, 1);
        const team2 = helperGetTeam(roundOf32Teams, 3, 2);
        return [team1, team2];
      }
      if (matchId === 5) {
        const team1 = helperGetTeam(roundOf32Teams, 11, 2);
        const team2 = helperGetTeam(roundOf32Teams, 12, 2);
        return [team1, team2];
      }
      if (matchId === 6) {
        const team1 = helperGetTeam(roundOf32Teams, 8, 1);
        const team2 = helperGetTeam(roundOf32Teams, 10, 2);
        return [team1, team2];
      }
      if (matchId === 7) {
        const team1 = helperGetTeam(roundOf32Teams, 4, 1);
        // Get the group in which the third place opponent that first team will be playing
        const team2Group = matchups[4];
        const team2 = helperGetTeam(roundOf32Teams, team2Group, 3);
        return [team1, team2];
      }
      if (matchId === 8) {
        const team1 = helperGetTeam(roundOf32Teams, 7, 1);
        // Get the group in which the third place opponent that first team will be playing
        const team2Group = matchups[7];
        const team2 = helperGetTeam(roundOf32Teams, team2Group, 3);
        return [team1, team2];
      }
      if (matchId === 9) {
        const team1 = helperGetTeam(roundOf32Teams, 3, 1);
        const team2 = helperGetTeam(roundOf32Teams, 6, 2);
        return [team1, team2];
      }
      if (matchId === 10) {
        const team1 = helperGetTeam(roundOf32Teams, 5, 2);
        const team2 = helperGetTeam(roundOf32Teams, 9, 2);
        return [team1, team2];
      }
      if (matchId === 11) {
        const team1 = helperGetTeam(roundOf32Teams, 1, 1);
        const team2Group = matchups[1];
        const team2 = helperGetTeam(roundOf32Teams, team2Group, 3);
        return [team1, team2];
      }
      if (matchId === 12) {
        const team1 = helperGetTeam(roundOf32Teams, 12, 1);
        const team2Group = matchups[12];
        const team2 = helperGetTeam(roundOf32Teams, team2Group, 3);
        return [team1, team2];
      }
      if (matchId === 13) {
        const team1 = helperGetTeam(roundOf32Teams, 10, 1);
        const team2 = helperGetTeam(roundOf32Teams, 8, 2);
        return [team1, team2];
      }
      if (matchId === 14) {
        const team1 = helperGetTeam(roundOf32Teams, 4, 2);
        const team2 = helperGetTeam(roundOf32Teams, 7, 2);
        return [team1, team2];
      }
      if (matchId === 15) {
        const team1 = helperGetTeam(roundOf32Teams, 2, 1);
        const team2Group = matchups[2];
        const team2 = helperGetTeam(roundOf32Teams, team2Group, 3);
        return [team1, team2];
      }
      if (matchId === 16) {
        const team1 = helperGetTeam(roundOf32Teams, 11, 1);
        const team2Group = matchups[11];
        const team2 = helperGetTeam(roundOf32Teams, team2Group, 3);
        return [team1, team2];
      }
    }

    // Round of 16 (Matches 17-24)
    if (matchId >= 17 && matchId <= 24) {
      // Match 17: Winner of Match 1 vs Winner of Match 2
      if (matchId === 17) {
        const team1 = getWinnerOfMatch(1);
        const team2 = getWinnerOfMatch(2);
        return [team1, team2].filter(t => t);
      }
      // Match 18: Winner of Match 3 vs Winner of Match 4
      if (matchId === 18) {
        const team1 = getWinnerOfMatch(3);
        const team2 = getWinnerOfMatch(4);
        return [team1, team2].filter(t => t);
      }
      // Match 19: Winner of Match 5 vs Winner of Match 6
      if (matchId === 19) {
        const team1 = getWinnerOfMatch(5);
        const team2 = getWinnerOfMatch(6);
        return [team1, team2].filter(t => t);
      }
      // Match 20: Winner of Match 7 vs Winner of Match 8
      if (matchId === 20) {
        const team1 = getWinnerOfMatch(7);
        const team2 = getWinnerOfMatch(8);
        return [team1, team2].filter(t => t);
      }
      // Match 21: Winner of Match 9 vs Winner of Match 10
      if (matchId === 21) {
        const team1 = getWinnerOfMatch(9);
        const team2 = getWinnerOfMatch(10);
        return [team1, team2].filter(t => t);
      }
      // Match 22: Winner of Match 11 vs Winner of Match 12
      if (matchId === 22) {
        const team1 = getWinnerOfMatch(11);
        const team2 = getWinnerOfMatch(12);
        return [team1, team2].filter(t => t);
      }
      // Match 23: Winner of Match 13 vs Winner of Match 14
      if (matchId === 23) {
        const team1 = getWinnerOfMatch(13);
        const team2 = getWinnerOfMatch(14);
        return [team1, team2].filter(t => t);
      }
      // Match 24: Winner of Match 15 vs Winner of Match 16
      if (matchId === 24) {
        const team1 = getWinnerOfMatch(15);
        const team2 = getWinnerOfMatch(16);
        return [team1, team2].filter(t => t);
      }
    }

    // Quarter Finals (Matches 25-28)
    if (matchId >= 25 && matchId <= 28) {
      // Match 25 (QF1): Winner of Match 17 vs Winner of Match 18
      if (matchId === 25) {
        const team1 = getWinnerOfMatch(17);
        const team2 = getWinnerOfMatch(18);
        return [team1, team2].filter(t => t);
      }
      // Match 26 (QF2): Winner of Match 19 vs Winner of Match 20
      if (matchId === 26) {
        const team1 = getWinnerOfMatch(19);
        const team2 = getWinnerOfMatch(20);
        return [team1, team2].filter(t => t);
      }
      // Match 27 (QF3): Winner of Match 21 vs Winner of Match 22
      if (matchId === 27) {
        const team1 = getWinnerOfMatch(21);
        const team2 = getWinnerOfMatch(22);
        return [team1, team2].filter(t => t);
      }
      // Match 28 (QF4): Winner of Match 23 vs Winner of Match 24
      if (matchId === 28) {
        const team1 = getWinnerOfMatch(23);
        const team2 = getWinnerOfMatch(24);
        return [team1, team2].filter(t => t);
      }
    }

    // Semi Finals (Matches 29-30)
    if (matchId >= 29 && matchId <= 30) {
      // Match 29 (SF1): Winner of Match 25 vs Winner of Match 26
      if (matchId === 29) {
        const team1 = getWinnerOfMatch(25);
        const team2 = getWinnerOfMatch(26);
        return [team1, team2].filter(t => t);
      }
      // Match 30 (SF2): Winner of Match 27 vs Winner of Match 28
      if (matchId === 30) {
        const team1 = getWinnerOfMatch(27);
        const team2 = getWinnerOfMatch(28);
        return [team1, team2].filter(t => t);
      }
    }

    // Final (Match 31)
    if (matchId === 31) {
      const team1 = getWinnerOfMatch(29); // Winner of SF1
      const team2 = getWinnerOfMatch(30); // Winner of SF2
      return [team1, team2].filter(t => t);
    }

    // Third Place Match (Match 32) - Optional
    if (matchId === 32) {
      // Get the losers of semi-finals (teams that were NOT selected as winners)
      const sf1Teams = getMatchTeams(29);
      const sf2Teams = getMatchTeams(30);
      
      const sf1Winner = predictions[29];
      const sf2Winner = predictions[30];
      
      const sf1Loser = sf1Teams.find(t => t && t.id !== sf1Winner);
      const sf2Loser = sf2Teams.find(t => t && t.id !== sf2Winner);
      
      return [sf1Loser, sf2Loser].filter(t => t);
    }

    return [];
  };

  const calculateProgress = () => {
    const rounds = {
      'R32': { matches: Array.from({length: 16}, (_, i) => i + 1), label: 'Round of 32' },
      'R16': { matches: Array.from({length: 8}, (_, i) => i + 17), label: 'Round of 16' },
      'QF': { matches: Array.from({length: 4}, (_, i) => i + 25), label: 'Quarter Finals' },
      'SF': { matches: Array.from({length: 2}, (_, i) => i + 29), label: 'Semi Finals' },
      'F': { matches: [31], label: 'Final' }
    };

    const progress = {};
    Object.entries(rounds).forEach(([key, value]) => {
      const completed = value.matches.filter(m => predictions[m]).length;
      progress[key] = {
        completed,
        total: value.matches.length,
        label: value.label
      };
    });

    return progress;
  };

  const canSubmit = () => {
    const progress = calculateProgress();
    return Object.values(progress).every(p => p.completed === p.total);
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

  const exportAsImage = async () => {
    if (!bracketRef.current) {
      alert('Unable to capture bracket. Please try again.');
      return;
    }
    
    setExporting(true);
    
    try {
      // Save current scroll position
      const container = document.querySelector('.bracket-container');
      const originalOverflow = container.style.overflow;
      const originalHeight = container.style.height;
      
      // Temporarily make everything visible
      container.style.overflow = 'visible';
      container.style.height = 'auto';
      
      // Wait for layout adjustment
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Get the full bracket scroll element
      const bracketScroll = bracketRef.current.querySelector('.bracket-scroll');
      
      // Create export container
      const exportDiv = document.createElement('div');
      exportDiv.style.cssText = `
        position: fixed;
        left: -99999px;
        top: 0;
        background: #f9fafb;
        padding: 3rem;
        width: auto;
        height: auto;
      `;
      
      // Add header
      const header = document.createElement('div');
      header.style.cssText = `
        text-align: center;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 3px solid #667eea;
      `;
      header.innerHTML = `
        <h1 style="margin: 0; font-size: 2.5rem; color: #1f2937; font-weight: 800;">
          🏆 World Cup Knockout Predictions
        </h1>
      `;
      
      // Clone bracket
      const bracketClone = bracketScroll.cloneNode(true);
      bracketClone.style.cssText = `
        display: flex;
        width: auto;
        height: auto;
        overflow: visible;
      `;
      
      exportDiv.appendChild(header);
      exportDiv.appendChild(bracketClone);
      document.body.appendChild(exportDiv);
      
      // Wait for images and layout
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Capture
      const canvas = await html2canvas(exportDiv, {
        scale: 2.5,
        backgroundColor: '#f9fafb',
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: exportDiv.scrollWidth,
        height: exportDiv.scrollHeight,
        windowWidth: exportDiv.scrollWidth,
        windowHeight: exportDiv.scrollHeight,
        onclone: (clonedDoc) => {
          const clonedDiv = clonedDoc.querySelector('div[style*="fixed"]');
          if (clonedDiv) {
            clonedDiv.style.left = '0';
          }
        }
      });
      
      // Restore original styles
      container.style.overflow = originalOverflow;
      container.style.height = originalHeight;
      document.body.removeChild(exportDiv);
      
      // Download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().split('T')[0];
        link.download = `worldcup-knockout-predictions-${timestamp}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }, 'image/png', 1.0);
      
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Failed to export: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="knockout-stage">
        <div className="stage-header">
          <h2>Knockout Stage Predictions</h2>
          <p>Loading knockout bracket...</p>
        </div>
        <div className="loading-spinner">
          <div className="spinner-icon"></div>
        </div>
      </div>
    );
  }

  if (roundOf32Teams.length === 0) {
    return (
      <div className="knockout-stage">
        <div className="stage-header">
          <h2>Knockout Stage Predictions</h2>
          <p className="error-message">
            Unable to load knockout teams. Please ensure you've completed both group stage and third-place selections.
          </p>
        </div>
        <div className="stage-footer">
          <Button onClick={onBack} variant="outline">
            ← Back to Third Place
          </Button>
        </div>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="knockout-stage" ref={bracketRef}>
      <div className="knockout-header">
        <h2>🏆 Knockout Stage</h2>
        <div className="progress-summary">
          {Object.entries(progress).map(([key, p]) => (
            <div key={key} className={`progress-item ${p.completed === p.total ? 'complete' : ''}`}>
              <span className="progress-label">{p.label}</span>
              <span className="progress-count">{p.completed}/{p.total}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bracket-container">
        <div className="bracket-scroll">
          {/* Left Side - Top Half */}
          <div className="bracket-section bracket-left">
            <div className="bracket-column r32">
              <div className="round-header">R32</div>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(matchId => (
                <MatchCard
                  key={matchId}
                  match={{ id: matchId, name: `M${matchId}` }}
                  teams={getMatchTeams(matchId)}
                  selectedWinner={predictions[matchId]}
                  onSelect={handleMatchSelect}
                  compact
                />
              ))}
            </div>

            <div className="bracket-column r16">
              <div className="round-header">R16</div>
              {[17, 18, 19, 20].map(matchId => (
                <MatchCard
                  key={matchId}
                  match={{ id: matchId, name: `M${matchId}` }}
                  teams={getMatchTeams(matchId)}
                  selectedWinner={predictions[matchId]}
                  onSelect={handleMatchSelect}
                  compact
                />
              ))}
            </div>

            <div className="bracket-column qf">
              <div className="round-header">QF</div>
              {[25, 26].map(matchId => (
                <MatchCard
                  key={matchId}
                  match={{ id: matchId, name: `QF${matchId - 24}` }}
                  teams={getMatchTeams(matchId)}
                  selectedWinner={predictions[matchId]}
                  onSelect={handleMatchSelect}
                  compact
                />
              ))}
            </div>

            <div className="bracket-column sf">
              <div className="round-header">SF</div>
              <MatchCard
                match={{ id: 29, name: 'SF1' }}
                teams={getMatchTeams(29)}
                selectedWinner={predictions[29]}
                onSelect={handleMatchSelect}
                compact
              />
            </div>
          </div>

          {/* Center - Final */}
          <div className="bracket-section bracket-center">
            <div className="bracket-column final">
              <div className="round-header">🏆 FINAL</div>
              <MatchCard
                match={{ id: 31, name: 'Final' }}
                teams={getMatchTeams(31)}
                selectedWinner={predictions[31]}
                onSelect={handleMatchSelect}
                compact
              />
            </div>
          </div>

          {/* Right Side - Bottom Half */}
          <div className="bracket-section bracket-right">
            <div className="bracket-column sf">
              <div className="round-header">SF</div>
              <MatchCard
                match={{ id: 30, name: 'SF2' }}
                teams={getMatchTeams(30)}
                selectedWinner={predictions[30]}
                onSelect={handleMatchSelect}
                compact
              />
            </div>

            <div className="bracket-column qf">
              <div className="round-header">QF</div>
              {[27, 28].map(matchId => (
                <MatchCard
                  key={matchId}
                  match={{ id: matchId, name: `QF${matchId - 24}` }}
                  teams={getMatchTeams(matchId)}
                  selectedWinner={predictions[matchId]}
                  onSelect={handleMatchSelect}
                  compact
                />
              ))}
            </div>

            <div className="bracket-column r16">
              <div className="round-header">R16</div>
              {[21, 22, 23, 24].map(matchId => (
                <MatchCard
                  key={matchId}
                  match={{ id: matchId, name: `M${matchId}` }}
                  teams={getMatchTeams(matchId)}
                  selectedWinner={predictions[matchId]}
                  onSelect={handleMatchSelect}
                  compact
                />
              ))}
            </div>

            <div className="bracket-column r32">
              <div className="round-header">R32</div>
              {[9, 10, 11, 12, 13, 14, 15, 16].map(matchId => (
                <MatchCard
                  key={matchId}
                  match={{ id: matchId, name: `M${matchId}` }}
                  teams={getMatchTeams(matchId)}
                  selectedWinner={predictions[matchId]}
                  onSelect={handleMatchSelect}
                  compact
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="knockout-footer">
        {!viewMode && (
          <>
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
              <div className="completion-hint">
                Complete all {Object.values(progress).reduce((sum, p) => sum + (p.total - p.completed), 0)} remaining matches
              </div>
            )}
          </>
        )}
        {viewMode && (
          <div className="view-mode-notice">
            <p>✓ Your predictions are locked and saved</p>
          </div>
        )}
        {viewMode && (
          <Button 
            onClick={exportAsImage} 
            loading={exporting}
            variant="outline"
            className="export-btn"
          >
            📸 Save My Prediction
          </Button>
        )}
      </div>
    </div>
  );
};
