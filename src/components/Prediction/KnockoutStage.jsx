import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FlagIcon, getFlagCode, } from '../../utils/helpers';
import { predictionAPI } from '../../api/api';
import { Button } from '../UI/Button';
import { getThirdPlaceMatchup, findMatchingElement} from '../../utils/helpers';
import './KnockoutStage.css';


const MatchCard = ({ match, teams, selectedWinner, onSelect, disabled, compact }) => {
  if (!teams || teams.length === 0) {
    return (
      <div className={`match-card empty ${compact ? 'compact' : ''}`}>
        <div className="match-label">{match.name}</div>
        <div className="match-placeholder">
          <div className="placeholder-flag">
            <FlagIcon fifaCode={null} size="normal" />
          </div>
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
            className={`match-team ${selectedWinner === team.id ? 'selected' : ''}`}
            onClick={() => !disabled && onSelect(match.id, team.id)}
            style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
          >
            <span className="team-flag-match">
              <FlagIcon fifaCode={team.fifa_code} size="small" />
            </span>
            <span className="team-name-match">{team.name}</span>
            {selectedWinner === team.id && <span className="winner-badge">✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export const KnockoutStage = ({ onBack, onSubmit, savedPredictions, viewMode, user }) => {
  const [predictions, setPredictions] = useState({});
  const [roundOf32Teams, setRoundOf32Teams] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const bracketRef = useRef(null);
  const { t } = useTranslation();

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
        alert(t('alert.completeThirdSelection'));
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
      alert(t('alert.loadKnockoutFail'));
    } finally {
      setLoading(false);
    }
  };

  const handleMatchSelect = async (matchId, winnerId) => {
    if (viewMode) {
      return;
    }

    // Check if this is changing an existing prediction
    const isChangingPrediction = predictions[matchId] && predictions[matchId] !== winnerId;

    // Update frontend state optimistically
    setPredictions(prev => ({
      ...prev,
      [matchId]: winnerId
    }));

    try {
      // Save the new prediction
      await predictionAPI.submitMatchPrediction(matchId, winnerId);
      
      // If changing a prediction, clear all dependent matches
      if (isChangingPrediction) {
        console.log(`🔄 Prediction changed for match ${matchId}, clearing dependents...`);
        await clearDependentMatches(matchId);
      }
    } catch (error) {
      console.error(t('error.failedSavePred'), error);
      // Revert optimistic update on error
      setPredictions(prev => {
        const newPredictions = { ...prev };
        if (isChangingPrediction) {
          newPredictions[matchId] = predictions[matchId]; // Restore old value
        } else {
          delete newPredictions[matchId]; // Remove if it was new
        }
        return newPredictions;
      });
      if (!viewMode) {
        alert(error.response?.data?.error || t('error.failedSavePred'));
      }
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

  const clearDependentMatches = async (changedMatchId) => {
    const matchDependencies = {
      // R32 matches affect R16
      1: [17], 2: [17], 3: [18], 4: [18],
      5: [19], 6: [19], 7: [20], 8: [20],
      9: [21], 10: [21], 11: [22], 12: [22],
      13: [23], 14: [23], 15: [24], 16: [24],
      
      // R16 matches affect QF
      17: [25], 18: [25], 19: [26], 20: [26],
      21: [27], 22: [27], 23: [28], 24: [28],
      
      // QF matches affect QF
      25: [29], 26: [29], 27: [30], 28: [30],
      
      // SF matches affect Final
      29: [31], 30: [31]
    };

    const getAllDependentMatches = (matchId) => {
      const direct = matchDependencies[matchId] || [];
      const all = [...direct];
      
      // Recursively get all downstream matches
      direct.forEach(dependentId => {
        all.push(...getAllDependentMatches(dependentId));
      });
      
      return [...new Set(all)]; // Remove duplicates
    };

    const matchesToClear = getAllDependentMatches(changedMatchId);
    
    if (matchesToClear.length > 0) {
      // Clear from frontend state immediately
      setPredictions(prev => {
        const newPredictions = { ...prev };
        matchesToClear.forEach(matchId => {
          delete newPredictions[matchId];
        });
        return newPredictions;
      });

      // Delete from backend - WAIT for all to complete
      try {
        await Promise.all(
          matchesToClear.map(matchId => 
            predictionAPI.deleteMatchPrediction(matchId)
              .catch(err => {
                console.error(`Failed to delete prediction for match ${matchId}:`, err);
                // Don't throw, continue with other deletes
              })
          )
        );
        console.log(`✅ Cleared ${matchesToClear.length} dependent matches:`, matchesToClear);
      } catch (error) {
        console.error('Error clearing dependent matches:', error);
      }
    }
  };

  const calculateProgress = () => {
    const rounds = {
      'R32': { matches: Array.from({length: 16}, (_, i) => i + 1), label: t('pred.roundof32') },
      'R16': { matches: Array.from({length: 8}, (_, i) => i + 17), label: t('pred.roundof16') },
      'QF': { matches: Array.from({length: 4}, (_, i) => i + 25), label: t('pred.quarterfinals') },
      'SF': { matches: Array.from({length: 2}, (_, i) => i + 29), label: t('pred.semifinals') },
      'F': { matches: [31], label: t('pred.final') }
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
      alert(error.response?.data?.error || t('error.failedSubmitPred'));
    } finally {
      setSaving(false);
    }
  };

  const exportAsImage = async () => {
    setExporting(true);

    try {
      /* =============================
         Submission date
      ============================== */
      let submittedDate = 'Not submitted';
      try {
        const statusRes = await predictionAPI.getStatus();
        if (statusRes.data.predictions_submitted_at) {
          submittedDate = new Date(statusRes.data.predictions_submitted_at)
            .toISOString()
            .slice(0, 16)
            .replace('T', ' ');
        }
      } catch {}

      /* =============================
         Canvas
      ============================== */
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = 3000;
      canvas.height = 1650;

      ctx.fillStyle = '#f9fafb';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      /* =============================
         Header
      ============================== */
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 60px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 World Cup Knockout Predictions', 1500, 80);

      ctx.font = '36px Arial';
      ctx.fillStyle = '#6b7280';
      ctx.fillText(user?.username || 'My Predictions', 1500, 130);

      ctx.font = '28px Arial';
      ctx.fillText(`Submitted: ${submittedDate}`, 1500, 170);

      ctx.strokeStyle = '#667eea';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(600, 190);
      ctx.lineTo(2400, 190);
      ctx.stroke();

      /* =============================
         Flag drawing
      ============================== */
      const drawFlag = async (fifaCode, x, y, size = 16) => {
        const iso = getFlagCode(fifaCode);
        if (!iso) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = `https://flagcdn.com/w40/${iso}.png`;

        await new Promise((res) => {
          img.onload = res;
          img.onerror = res;
        });

        if (!img.naturalWidth) return;

        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, x, y, size, size);
        ctx.restore();
      };

      /* =============================
         Match card
      ============================== */
      const drawMatch = async (x, y, label, teams, winnerId, isFinal = false) => {
        const w = 220;
        const h = teams.length ? 120 : 80;

        ctx.fillStyle = isFinal ? 'rgba(245,158,11,.15)' : '#fff';
        ctx.strokeStyle = isFinal ? '#f59e0b' : '#e5e7eb';
        ctx.lineWidth = isFinal ? 3 : 2;

        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isFinal ? '#f59e0b' : '#667eea';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, x + w / 2, y + 24);

        ctx.textAlign = 'left';

        for (let i = 0; i < teams.length; i++) {
          const t = teams[i];
          const ty = y + 50 + i * 32;
          const win = t.id === winnerId;

          if (win) {
            ctx.fillStyle = '#d1fae5';
            ctx.strokeStyle = '#10b981';
            ctx.beginPath();
            ctx.roundRect(x + 10, ty - 18, w - 20, 28, 6);
            ctx.fill();
            ctx.stroke();
          }

          await drawFlag(t.fifa_code, x + 16, ty - 12, 16);

          ctx.fillStyle = win ? '#065f46' : '#1f2937';
          ctx.font = win ? 'bold 15px Arial' : '15px Arial';
          ctx.fillText(
            t.name.length > 15 ? t.name.slice(0, 13) + '…' : t.name,
            x + 38,
            ty
          );

          if (win) {
            ctx.textAlign = 'right';
            ctx.fillText('✓', x + w - 14, ty);
            ctx.textAlign = 'left';
          }
        }

        return { x, y, w, h };
      };

      /* =============================
         Round labels
      ============================== */
      const startY = 250;
      
      ctx.fillStyle = '#4b5563';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      
      ctx.fillText('Round of 32', 280, startY - 20);
      ctx.fillText('Round of 16', 600, startY - 20);
      ctx.fillText('Quarter Finals', 920, startY - 20);
      ctx.fillText('Semi Finals', 1240, startY - 20);
      ctx.fillText('🏆 FINAL', 1500, startY - 20);
      ctx.fillText('Semi Finals', 1760, startY - 20);
      ctx.fillText('Quarter Finals', 2080, startY - 20);
      ctx.fillText('Round of 16', 2400, startY - 20);
      ctx.fillText('Round of 32', 2720, startY - 20);

      /* =============================
         LEFT BRACKET
      ============================== */
      const r32Left = [];
      let y = startY;
      for (let i = 1; i <= 8; i++) {
        r32Left.push(
          await drawMatch(170, y, `M${i}`, getMatchTeams(i), predictions[i])
        );
        y += 140;
      }

      const r16Left = [];
      y = startY + 70;
      for (let i = 17; i <= 20; i++) {
        r16Left.push(
          await drawMatch(490, y, `M${i}`, getMatchTeams(i), predictions[i])
        );
        y += 280;
      }

      const qfLeft = [];
      y = startY + 210;
      for (let i = 25; i <= 26; i++) {
        qfLeft.push(
          await drawMatch(810, y, `QF${i - 24}`, getMatchTeams(i), predictions[i])
        );
        y += 560;
      }

      const sf1 = await drawMatch(
        1130,
        startY + 490,
        'SF1',
        getMatchTeams(29),
        predictions[29]
      );

      /* =============================
         CHAMPION & FINAL
      ============================== */
      const finalTeams = getMatchTeams(31);
      const finalWinner = finalTeams.find(t => t?.id === predictions[31]);

      if (finalWinner) {
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🏆 CHAMPION 🏆', 1500, startY + 290);
        ctx.font = 'bold 28px Arial';
        ctx.fillText(finalWinner.name, 1500, startY + 325);
      }

      const finalBox = await drawMatch(
        1390,
        startY + 350,
        'FINAL',
        finalTeams,
        predictions[31],
        true
      );

      /* =============================
         RIGHT BRACKET
      ============================== */
      const sf2 = await drawMatch(
        1650,
        startY + 490,
        'SF2',
        getMatchTeams(30),
        predictions[30]
      );

      const qfRight = [];
      y = startY + 210;
      for (let i = 27; i <= 28; i++) {
        qfRight.push(
          await drawMatch(1970, y, `QF${i - 24}`, getMatchTeams(i), predictions[i])
        );
        y += 560;
      }

      const r16Right = [];
      y = startY + 70;
      for (let i = 21; i <= 24; i++) {
        r16Right.push(
          await drawMatch(2290, y, `M${i}`, getMatchTeams(i), predictions[i])
        );
        y += 280;
      }

      const r32Right = [];
      y = startY;
      for (let i = 9; i <= 16; i++) {
        r32Right.push(
          await drawMatch(2610, y, `M${i}`, getMatchTeams(i), predictions[i])
        );
        y += 140;
      }

      /* =============================
         CONNECTION LINES
      ============================== */
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;

      const drawConnection = (x1, y1, x2, y2) => {
        const midX = (x1 + x2) / 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(midX, y1);
        ctx.lineTo(midX, y2);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      };

      // LEFT: R32 -> R16
      for (let i = 0; i < 4; i++) {
        const m1 = r32Left[i * 2];
        const m2 = r32Left[i * 2 + 1];
        const target = r16Left[i];
        drawConnection(m1.x + m1.w, m1.y + m1.h / 2, target.x, target.y + target.h / 2);
        drawConnection(m2.x + m2.w, m2.y + m2.h / 2, target.x, target.y + target.h / 2);
      }

      // LEFT: R16 -> QF
      for (let i = 0; i < 2; i++) {
        const m1 = r16Left[i * 2];
        const m2 = r16Left[i * 2 + 1];
        const target = qfLeft[i];
        drawConnection(m1.x + m1.w, m1.y + m1.h / 2, target.x, target.y + target.h / 2);
        drawConnection(m2.x + m2.w, m2.y + m2.h / 2, target.x, target.y + target.h / 2);
      }

      // LEFT: QF -> SF1
      drawConnection(qfLeft[0].x + qfLeft[0].w, qfLeft[0].y + qfLeft[0].h / 2, sf1.x, sf1.y + sf1.h / 2);
      drawConnection(qfLeft[1].x + qfLeft[1].w, qfLeft[1].y + qfLeft[1].h / 2, sf1.x, sf1.y + sf1.h / 2);

      // LEFT: SF1 -> FINAL
      drawConnection(sf1.x + sf1.w, sf1.y + sf1.h / 2, finalBox.x, finalBox.y + finalBox.h / 2);

      // RIGHT: SF2 -> FINAL
      drawConnection(finalBox.x + finalBox.w, finalBox.y + finalBox.h / 2, sf2.x, sf2.y + sf2.h / 2);

      // RIGHT: QF -> SF2
      drawConnection(sf2.x + sf2.w, sf2.y + sf2.h / 2, qfRight[0].x, qfRight[0].y + qfRight[0].h / 2);
      drawConnection(sf2.x + sf2.w, sf2.y + sf2.h / 2, qfRight[1].x, qfRight[1].y + qfRight[1].h / 2);

      // RIGHT: R16 -> QF
      for (let i = 0; i < 2; i++) {
        const m1 = r16Right[i * 2];
        const m2 = r16Right[i * 2 + 1];
        const target = qfRight[i];
        drawConnection(target.x + target.w, target.y + target.h / 2, m1.x, m1.y + m1.h / 2);
        drawConnection(target.x + target.w, target.y + target.h / 2, m2.x, m2.y + m2.h / 2);
      }

      // RIGHT: R32 -> R16
      for (let i = 0; i < 4; i++) {
        const m1 = r32Right[i * 2];
        const m2 = r32Right[i * 2 + 1];
        const target = r16Right[i];
        drawConnection(target.x + target.w, target.y + target.h / 2, m1.x, m1.y + m1.h / 2);
        drawConnection(target.x + target.w, target.y + target.h / 2, m2.x, m2.y + m2.h / 2);
      }

      /* =============================
         EXPORT
      ============================== */
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `worldcup-bracket-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        alert('✅ Bracket exported successfully!');
      });

    } catch (err) {
      console.error(err);
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="knockout-stage">
        <div className="stage-header">
          <h2>{t('pred.knockout.header')}</h2>
          <p>{t('pred.knockout.loading')}</p>
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
          <h2>{t('pred.knockout.header')}</h2>
          <p className="error-message">
            {t("pred.knockout.error")}
          </p>
        </div>
        <div className="stage-footer">
          <Button onClick={onBack} variant="outline">
            ← {t('pred.backToThird')}
          </Button>
        </div>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="knockout-stage" ref={bracketRef}>
      <div className="knockout-header">
        <h2>🏆 {t('pred.knockout')}</h2>
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
              <div className="round-label">{t('pred.roundof32')}</div>
                <div className="match-list">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(matchId => (
                    <MatchCard
                      key={matchId}
                      match={{ id: matchId, name: `M${matchId}` }}
                      teams={getMatchTeams(matchId)}
                      selectedWinner={predictions[matchId]}
                      onSelect={handleMatchSelect}
                      disabled={viewMode}
                      compact
                    />
                  ))}
              </div>
            </div>

            <div className="bracket-column r16">
              <div className="round-label">{t('pred.roundof16')}</div>
              <div className="match-list">
                {[17, 18, 19, 20].map(matchId => (
                  <MatchCard
                    key={matchId}
                    match={{ id: matchId, name: `M${matchId}` }}
                    teams={getMatchTeams(matchId)}
                    selectedWinner={predictions[matchId]}
                    onSelect={handleMatchSelect}
                    disabled={viewMode}
                    compact
                  />
                ))}
              </div>
            </div>

            <div className="bracket-column qf">
              <div className="round-label">{t('pred.quarterfinals')}</div>
              <div className="match-list">
                {[25, 26].map(matchId => (
                  <MatchCard
                    key={matchId}
                    match={{ id: matchId, name: `QF${matchId - 24}` }}
                    teams={getMatchTeams(matchId)}
                    selectedWinner={predictions[matchId]}
                    onSelect={handleMatchSelect}
                    disabled={viewMode}
                    compact
                  />
                ))}
              </div>
            </div>

            <div className="bracket-column sf">
              <div className="round-label">{t('pred.semifinals')}</div>
              <div className="match-list">
                <MatchCard
                  match={{ id: 29, name: 'SF1' }}
                  teams={getMatchTeams(29)}
                  selectedWinner={predictions[29]}
                  onSelect={handleMatchSelect}
                  disabled={viewMode}
                  compact
                />
              </div>
            </div>
          </div>

          {/* Center - Final */}
          <div className="bracket-section bracket-center">
            <div className="bracket-column final">
              <div className="round-label">🏆 {t('pred.final.full')}</div>
              <div className="match-list">
                <MatchCard
                  match={{ id: 31, name: 'Final' }}
                  teams={getMatchTeams(31)}
                  selectedWinner={predictions[31]}
                  onSelect={handleMatchSelect}
                  disabled={viewMode}
                  compact
                />
              </div>
            </div>
          </div>

          {/* Right Side - Bottom Half */}
          <div className="bracket-section bracket-right">
            <div className="bracket-column sf">
              <div className="round-label">{t('pred.semifinals')}</div>
              <div className="match-list">
                <MatchCard
                  match={{ id: 30, name: 'SF2' }}
                  teams={getMatchTeams(30)}
                  selectedWinner={predictions[30]}
                  onSelect={handleMatchSelect}
                  disabled={viewMode}
                  compact
                />
              </div>
            </div>

            <div className="bracket-column qf">
              <div className="round-label">{t('pred.quarterfinals')}</div>
              <div className="match-list">
                {[27, 28].map(matchId => (
                  <MatchCard
                    key={matchId}
                    match={{ id: matchId, name: `QF${matchId - 24}` }}
                    teams={getMatchTeams(matchId)}
                    selectedWinner={predictions[matchId]}
                    onSelect={handleMatchSelect}
                    disabled={viewMode}
                    compact
                  />
                ))}
              </div>
            </div>

            <div className="bracket-column r16">
              <div className="round-label">{t('pred.roundof16')}</div>
              <div className="match-list">
                {[21, 22, 23, 24].map(matchId => (
                  <MatchCard
                    key={matchId}
                    match={{ id: matchId, name: `M${matchId}` }}
                    teams={getMatchTeams(matchId)}
                    selectedWinner={predictions[matchId]}
                    onSelect={handleMatchSelect}
                    disabled={viewMode}
                    compact
                  />
                ))}
              </div>
            </div>

            <div className="bracket-column r32">
              <div className="round-label">{t('pred.roundof32')}</div>
              <div className="match-list">
                {[9, 10, 11, 12, 13, 14, 15, 16].map(matchId => (
                  <MatchCard
                    key={matchId}
                    match={{ id: matchId, name: `M${matchId}` }}
                    teams={getMatchTeams(matchId)}
                    selectedWinner={predictions[matchId]}
                    onSelect={handleMatchSelect}
                    disabled={viewMode}
                    compact
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="knockout-footer">
        {!viewMode && (
          <>
            <Button onClick={onBack} variant="outline">
              ← {t('pred.backToThird')}
            </Button>
            
            {canSubmit() ? (
              <Button
                onClick={handleSubmit}
                loading={saving}
                size="large"
                variant="success"
              >
                🎯 {t('pred.submit')}
              </Button>
            ) : (
              <div className="completion-hint">
                {t('pred.knockout.complete', {number: Object.values(progress).reduce((sum, p) => sum + (p.total - p.completed), 0)})}
              </div>
            )}
          </>
        )}
        {viewMode && (
          <div className="view-mode-notice">
            <p>✓ {t('pred.knockout.locked')}</p>
          </div>
        )}
        {viewMode && (
          <Button 
            onClick={exportAsImage} 
            loading={exporting}
            variant="outline"
            className="export-btn"
          >
            📸 {t('pred.knockout.export')}
          </Button>
        )}
      </div>
    </div>
  );
};
