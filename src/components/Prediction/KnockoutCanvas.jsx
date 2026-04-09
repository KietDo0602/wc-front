import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { predictionAPI } from '../../api/api';
import { Button } from '../UI/Button';
import { findMatchingElement, getLocalFlagUrl } from '../../utils/helpers';
import './KnockoutCanvas.css';

export const KnockoutCanvas = ({ onBack, onSubmit, savedPredictions, viewMode, user }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [predictions, setPredictions] = useState({});
  const [roundOf32Teams, setRoundOf32Teams] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  // Touch states
  const [touchStart, setTouchStart] = useState(null);
  const [lastTouchDistance, setLastTouchDistance] = useState(null);
  const [isTouching, setIsTouching] = useState(false);
  const { t } = useTranslation();

  // Canvas state
  const [camera, setCamera] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragDistance, setDragDistance] = useState(0);
  const [hoveredMatch, setHoveredMatch] = useState(null);
  const [hoveredTeam, setHoveredTeam] = useState(null);
  const [matchBoxes, setMatchBoxes] = useState([]);
  const [flagImages, setFlagImages] = useState({});

  // Load data
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
      
      // Preload flags
      const uniqueCodes = new Set(result.map(t => t.fifa_code));
      const flags = {};
      await Promise.all(
        Array.from(uniqueCodes).map(async (fifaCode) => {
          const src = getLocalFlagUrl(fifaCode);
          if (!src) return;

          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = src;
          
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
          
          if (img.naturalWidth > 0) {
            flags[fifaCode] = img;
          }
        })
      );
      setFlagImages(flags);
      
    } catch (error) {
      console.error('Failed to initialize knockout teams:', error);
      alert(t('alert.loadKnockoutFail'));
    } finally {
      setLoading(false);
    }
  };

  // Helper functions (same as before)
  const helperGetTeam = (teams, groupId, position) => {
    return teams.find(team => team.groupId === groupId && team.position === position);
  };

  const getWinnerOfMatch = (matchId) => {
    const winnerId = predictions[matchId];
    if (!winnerId) return null;
    return roundOf32Teams.find(team => team.id === winnerId);
  };

  const getMatchTeams = (matchId) => {
    if (matchId >= 1 && matchId <= 16) {
      const thirdPlaceTeams = roundOf32Teams.filter(team => team.position === 3);
      const matchups = findMatchingElement(thirdPlaceTeams);

      const teamLogic = {
        1: () => [helperGetTeam(roundOf32Teams, 5, 1), helperGetTeam(roundOf32Teams, matchups[5], 3)],
        2: () => [helperGetTeam(roundOf32Teams, 9, 1), helperGetTeam(roundOf32Teams, matchups[9], 3)],
        3: () => [helperGetTeam(roundOf32Teams, 1, 2), helperGetTeam(roundOf32Teams, 2, 2)],
        4: () => [helperGetTeam(roundOf32Teams, 6, 1), helperGetTeam(roundOf32Teams, 3, 2)],
        5: () => [helperGetTeam(roundOf32Teams, 11, 2), helperGetTeam(roundOf32Teams, 12, 2)],
        6: () => [helperGetTeam(roundOf32Teams, 8, 1), helperGetTeam(roundOf32Teams, 10, 2)],
        7: () => [helperGetTeam(roundOf32Teams, 4, 1), helperGetTeam(roundOf32Teams, matchups[4], 3)],
        8: () => [helperGetTeam(roundOf32Teams, 7, 1), helperGetTeam(roundOf32Teams, matchups[7], 3)],
        9: () => [helperGetTeam(roundOf32Teams, 3, 1), helperGetTeam(roundOf32Teams, 6, 2)],
        10: () => [helperGetTeam(roundOf32Teams, 5, 2), helperGetTeam(roundOf32Teams, 9, 2)],
        11: () => [helperGetTeam(roundOf32Teams, 1, 1), helperGetTeam(roundOf32Teams, matchups[1], 3)],
        12: () => [helperGetTeam(roundOf32Teams, 12, 1), helperGetTeam(roundOf32Teams, matchups[12], 3)],
        13: () => [helperGetTeam(roundOf32Teams, 10, 1), helperGetTeam(roundOf32Teams, 8, 2)],
        14: () => [helperGetTeam(roundOf32Teams, 4, 2), helperGetTeam(roundOf32Teams, 7, 2)],
        15: () => [helperGetTeam(roundOf32Teams, 2, 1), helperGetTeam(roundOf32Teams, matchups[2], 3)],
        16: () => [helperGetTeam(roundOf32Teams, 11, 1), helperGetTeam(roundOf32Teams, matchups[11], 3)],
      };

      return teamLogic[matchId]?.() || [];
    }

    if (matchId >= 17 && matchId <= 24) {
      const pairings = {
        17: [1, 2], 18: [3, 4], 19: [5, 6], 20: [7, 8],
        21: [9, 10], 22: [11, 12], 23: [13, 14], 24: [15, 16]
      };
      const [m1, m2] = pairings[matchId];
      return [getWinnerOfMatch(m1), getWinnerOfMatch(m2)].filter(t => t);
    }

    if (matchId >= 25 && matchId <= 28) {
      const pairings = { 25: [17, 18], 26: [19, 20], 27: [21, 22], 28: [23, 24] };
      const [m1, m2] = pairings[matchId];
      return [getWinnerOfMatch(m1), getWinnerOfMatch(m2)].filter(t => t);
    }

    if (matchId >= 29 && matchId <= 30) {
      const pairings = { 29: [25, 26], 30: [27, 28] };
      const [m1, m2] = pairings[matchId];
      return [getWinnerOfMatch(m1), getWinnerOfMatch(m2)].filter(t => t);
    }

    if (matchId === 31) {
      return [getWinnerOfMatch(29), getWinnerOfMatch(30)].filter(t => t);
    }

    return [];
  };

  const clearDependentMatches = async (changedMatchId) => {
    const matchDependencies = {
      1: [17], 2: [17], 3: [18], 4: [18], 5: [19], 6: [19], 7: [20], 8: [20],
      9: [21], 10: [21], 11: [22], 12: [22], 13: [23], 14: [23], 15: [24], 16: [24],
      17: [25], 18: [25], 19: [26], 20: [26], 21: [27], 22: [27], 23: [28], 24: [28],
      25: [29], 26: [29], 27: [30], 28: [30], 29: [31], 30: [31]
    };

    const getAllDependentMatches = (matchId) => {
      const direct = matchDependencies[matchId] || [];
      const all = [...direct];
      direct.forEach(dependentId => {
        all.push(...getAllDependentMatches(dependentId));
      });
      return [...new Set(all)];
    };

    const matchesToClear = getAllDependentMatches(changedMatchId);
    
    if (matchesToClear.length > 0) {
      setPredictions(prev => {
        const newPredictions = { ...prev };
        matchesToClear.forEach(matchId => {
          delete newPredictions[matchId];
        });
        return newPredictions;
      });

      try {
        await Promise.all(
          matchesToClear.map(matchId => 
            predictionAPI.deleteMatchPrediction(matchId).catch(err => {
              console.error(`Failed to delete prediction for match ${matchId}:`, err);
            })
          )
        );
      } catch (error) {
        console.error('Error clearing dependent matches:', error);
      }
    }
  };

  const handleMatchSelect = async (matchId, winnerId) => {
    if (viewMode) return;

    const isChangingPrediction = predictions[matchId] && predictions[matchId] !== winnerId;

    setPredictions(prev => ({ ...prev, [matchId]: winnerId }));

    try {
      await predictionAPI.submitMatchPrediction(matchId, winnerId);
      
      if (isChangingPrediction) {
        await clearDependentMatches(matchId);
      }
    } catch (error) {
      console.error(t('error.failedSavePred'), error);
      setPredictions(prev => {
        const newPredictions = { ...prev };
        if (isChangingPrediction) {
          newPredictions[matchId] = predictions[matchId];
        } else {
          delete newPredictions[matchId];
        }
        return newPredictions;
      });
      if (!viewMode) {
        alert(t(error.response?.data?.error) || t('error.failedSavePred'));
      }
    }
  };

  // Canvas drawing
  const drawBracket = useCallback(() => {
    if (!camera) return;

    const canvas = canvasRef.current;
    if (!canvas || roundOf32Teams.length === 0) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    // Clear with theme background
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--background') || '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Apply camera transform
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    // Layout parameters
    // Inside drawBracket function, update the layout parameters:
    const baseX = 100;
    const baseY = 100;
    const cardW = 220;
    const cardH = 140;
    const colGap = 240;
    const rowGap = 180;

    const boxes = [];

    // Update the drawMatch function:
    const drawMatch = (x, y, matchId, label, teams, winnerId, isFinal = false) => {
      const h = teams.length > 0 ? cardH : 100;

      // Background
      if (isFinal) {
        ctx.fillStyle = 'rgba(245,158,11,0.15)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
      } else {
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--surface') || '#ffffff';
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--text') || '#636363';
        ctx.lineWidth = 2;
      }

      ctx.beginPath();
      ctx.roundRect(x, y, cardW, h, 8);
      ctx.fill();
      ctx.stroke();

      // Label
      const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary') || '#667eea';
      ctx.fillStyle = isFinal ? '#f59e0b' : primaryColor;
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + cardW / 2, y + 24);

      if (teams.length === 0) {
        ctx.fillStyle = '#9ca3af';
        ctx.font = '16px Arial';
        ctx.fillText('TBD', x + cardW / 2, y + 60);
      } else {
        teams.forEach((team, idx) => {
          const ty = y + 54 + idx * 44;
          const isWinner = team.id === winnerId;
          const isHovered = hoveredTeam?.matchId === matchId && hoveredTeam?.teamId === team.id;

          // Team background - taller team boxes
          if (isWinner) {
            ctx.fillStyle = '#d1fae5';
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(x + 10, ty - 20, cardW - 20, 40, 6);
            ctx.fill();
            ctx.stroke();
          } else if (isHovered && !viewMode) {
            ctx.fillStyle = '#e0f2fe';
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(x + 10, ty - 20, cardW - 20, 40, 6);
            ctx.fill();
            ctx.stroke();
          }

          // Flag
          const flag = flagImages[team.fifa_code];
          if (flag) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(x + 24, ty, 10, 0, Math.PI * 2); // Centered vertically
            ctx.clip();
            ctx.drawImage(flag, x + 14, ty - 10, 20, 20);
            ctx.restore();
          }

          // Team name
          let textColor;
          if (isWinner) {
            textColor = '#065f46';
          } else if (isHovered && !viewMode) {
            textColor = '#0369a1';
          } else {
            textColor = getComputedStyle(document.documentElement).getPropertyValue('--text') || '#1f2937';
          }
          
          ctx.fillStyle = textColor;
          ctx.font = isWinner ? 'bold 15px Arial' : (isHovered && !viewMode ? 'bold 15px Arial' : '15px Arial');
          ctx.textAlign = 'left';
          const name = team.name.length > 16 ? team.name.slice(0, 14) + '...' : t(team.fifa_code);
          ctx.fillText(name, x + 40, ty + 4);

          // Checkmark - FIXED VERTICAL CENTERING
          if (isWinner) {
            ctx.fillStyle = '#10b981'; // Checkmark color
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle'; // Set baseline to middle for proper centering
            ctx.fillText('✓', x + cardW - 14, ty); // Use ty (center point) directly
            ctx.textBaseline = 'alphabetic'; // Reset to default
          }

          // Store box for hit detection
          boxes.push({
            matchId,
            teamId: team.id,
            x: x + 10,
            y: ty - 20,
            w: cardW - 20,
            h: 40 // Updated height
          });
        });
      }

      boxes.push({ matchId, x, y, w: cardW, h, isCard: true });
    };

    // Draw connection lines
    const drawConnection = (x1, y1, x2, y2) => {
      const midX = (x1 + x2) / 2;
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--text') || '#636363';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(midX, y1);
      ctx.lineTo(midX, y2);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };

    // LEFT SIDE - R32
    let y = baseY;
    const r32LeftPos = [];
    for (let i = 1; i <= 8; i++) {
      const teams = getMatchTeams(i);
      drawMatch(baseX, y, i, `M${i}`, teams, predictions[i]);
      r32LeftPos.push({ x: baseX + cardW, y: y + cardH / 2 });
      y += rowGap;
    }

    // LEFT - R16
    y = baseY + rowGap / 2;
    const r16LeftPos = [];
    for (let i = 17; i <= 20; i++) {
      const teams = getMatchTeams(i);
      drawMatch(baseX + colGap, y, i, `M${i}`, teams, predictions[i]);
      r16LeftPos.push({ x: baseX + colGap + cardW, y: y + cardH / 2 });
      y += rowGap * 2;
    }

    // Connections R32 -> R16 (left)
    for (let i = 0; i < 4; i++) {
      const p1 = r32LeftPos[i * 2];
      const p2 = r32LeftPos[i * 2 + 1];
      const target = r16LeftPos[i];
      drawConnection(p1.x, p1.y, target.x - cardW, target.y);
      drawConnection(p2.x, p2.y, target.x - cardW, target.y);
    }

    // LEFT - QF
    y = baseY + rowGap * 1.5;
    const qfLeftPos = [];
    for (let i = 25; i <= 26; i++) {
      const teams = getMatchTeams(i);
      drawMatch(baseX + colGap * 2, y, i, `QF${i - 24}`, teams, predictions[i]);
      qfLeftPos.push({ x: baseX + colGap * 2 + cardW, y: y + cardH / 2 });
      y += rowGap * 4;
    }

    // Connections R16 -> QF (left)
    for (let i = 0; i < 2; i++) {
      const p1 = r16LeftPos[i * 2];
      const p2 = r16LeftPos[i * 2 + 1];
      const target = qfLeftPos[i];
      drawConnection(p1.x, p1.y, target.x - cardW, target.y);
      drawConnection(p2.x, p2.y, target.x - cardW, target.y);
    }

    // LEFT - SF
    const sf1Y = baseY + rowGap * 3.5;
    const teams29 = getMatchTeams(29);
    drawMatch(baseX + colGap * 3, sf1Y, 29, 'SF1', teams29, predictions[29]);
    const sf1Pos = { x: baseX + colGap * 3 + cardW, y: sf1Y + cardH / 2 };

    // Connections QF -> SF1
    drawConnection(qfLeftPos[0].x, qfLeftPos[0].y, sf1Pos.x - cardW, sf1Pos.y);
    drawConnection(qfLeftPos[1].x, qfLeftPos[1].y, sf1Pos.x - cardW, sf1Pos.y);

    // CENTER - FINAL
    const finalX = baseX + colGap * 4;
    const finalY = baseY + rowGap * 3.5;
    const finalTeams = getMatchTeams(31);
    const finalWinner = finalTeams.find(t => t?.id === predictions[31]);

    if (finalWinner) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(t('pred.knockout.champion'), finalX + cardW / 2, finalY - 45);
      ctx.font = 'bold 20px Arial';
      ctx.fillText(t(finalWinner.fifa_code), finalX + cardW / 2, finalY - 18);
    }

    drawMatch(finalX, finalY, 31, t('pred.final'), finalTeams, predictions[31], true);
    const finalPos = { x: finalX + cardW, y: finalY + cardH / 2 };

    // Connection SF1 -> Final
    drawConnection(sf1Pos.x, sf1Pos.y, finalX, finalPos.y);

    // RIGHT - SF2
    const sf2Y = baseY + rowGap * 3.5;
    const teams30 = getMatchTeams(30);
    drawMatch(baseX + colGap * 5, sf2Y, 30, 'SF2', teams30, predictions[30]);
    const sf2Pos = { x: baseX + colGap * 5, y: sf2Y + cardH / 2 };

    // Connection Final -> SF2
    drawConnection(finalPos.x, finalPos.y, sf2Pos.x, sf2Pos.y);

    // RIGHT - QF
    y = baseY + rowGap * 1.5;
    const qfRightPos = [];
    for (let i = 27; i <= 28; i++) {
      const teams = getMatchTeams(i);
      drawMatch(baseX + colGap * 6, y, i, `QF${i - 24}`, teams, predictions[i]);
      qfRightPos.push({ x: baseX + colGap * 6, y: y + cardH / 2 });
      y += rowGap * 4;
    }

    // Connections SF2 -> QF (right)
    drawConnection(sf2Pos.x + cardW, sf2Pos.y, qfRightPos[0].x, qfRightPos[0].y);
    drawConnection(sf2Pos.x + cardW, sf2Pos.y, qfRightPos[1].x, qfRightPos[1].y);

    // RIGHT - R16
    y = baseY + rowGap / 2;
    const r16RightPos = [];
    for (let i = 21; i <= 24; i++) {
      const teams = getMatchTeams(i);
      drawMatch(baseX + colGap * 7, y, i, `M${i}`, teams, predictions[i]);
      r16RightPos.push({ x: baseX + colGap * 7, y: y + cardH / 2 });
      y += rowGap * 2;
    }

    // Connections QF -> R16 (right)
    for (let i = 0; i < 2; i++) {
      const p1 = r16RightPos[i * 2];
      const p2 = r16RightPos[i * 2 + 1];
      const target = qfRightPos[i];
      drawConnection(target.x + cardW, target.y, p1.x, p1.y);
      drawConnection(target.x + cardW, target.y, p2.x, p2.y);
    }

    // RIGHT - R32
    y = baseY;
    const r32RightPos = [];
    for (let i = 9; i <= 16; i++) {
      const teams = getMatchTeams(i);
      drawMatch(baseX + colGap * 8, y, i, `M${i}`, teams, predictions[i]);
      r32RightPos.push({ x: baseX + colGap * 8, y: y + cardH / 2 });
      y += rowGap;
    }

    // Connections R16 -> R32 (right)
    for (let i = 0; i < 4; i++) {
      const p1 = r32RightPos[i * 2];
      const p2 = r32RightPos[i * 2 + 1];
      const target = r16RightPos[i];
      drawConnection(target.x + cardW, target.y, p1.x, p1.y);
      drawConnection(target.x + cardW, target.y, p2.x, p2.y);
    }

    ctx.restore();
    setMatchBoxes(boxes);
  }, [camera, predictions, roundOf32Teams, hoveredMatch, hoveredTeam, flagImages, viewMode]);

  useEffect(() => {
    if (!loading) {
      drawBracket();
    }
  }, [drawBracket, loading]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';

      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      drawBracket();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawBracket]);

  // Auto-fit on first load
  useEffect(() => {
    if (camera === null && containerRef.current) {
      handleResetView();
    }
  }, [camera, loading]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheelEvent = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(3, camera.zoom * delta));
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const worldX = (mouseX - camera.x) / camera.zoom;
      const worldY = (mouseY - camera.y) / camera.zoom;
      
      setCamera({
        x: mouseX - worldX * newZoom,
        y: mouseY - worldY * newZoom,
        zoom: newZoom
      });
    };

    // Add with passive: false to allow preventDefault
    canvas.addEventListener('wheel', handleWheelEvent, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheelEvent);
    };
  }, [camera]); // Include camera in dependencies since we're using it

  useEffect(() => {
    if (user && user.username) {
      localStorage.setItem('username', user.username);
    }
  }, [user]);

  // Mouse handlers
  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const c = camera || { x: 0, y: 0, zoom: 1 };
    return {
      x: (e.clientX - rect.left - c.x) / c.zoom,
      y: (e.clientY - rect.top - c.y) / c.zoom
    };
  };

  const handleMouseDown = (e) => {
    const c = camera || { x: 0, y: 0, zoom: 1 };
    setIsDragging(true);
    setDragDistance(0);
    setDragStart({ x: e.clientX - c.x, y: e.clientY - c.y });
  };

  // Update handleMouseMove hover detection:
  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      const distance = Math.sqrt(
        Math.pow(newX - camera.x, 2) + Math.pow(newY - camera.y, 2)
      );
      setDragDistance(distance);
      
      setCamera(prev => ({
        ...prev,
        x: newX,
        y: newY
      }));
    } else {
      // Hover detection - ONLY FOR TEAMS, NOT MATCH CARDS
      const pos = getMousePos(e);
      let foundTeam = null;

      for (const box of matchBoxes) {
        if (pos.x >= box.x && pos.x <= box.x + box.w &&
            pos.y >= box.y && pos.y <= box.y + box.h) {
          if (box.teamId) {
            foundTeam = { matchId: box.matchId, teamId: box.teamId };
            break; // Found a team, stop searching
          }
        }
      }

      setHoveredMatch(null); // Never highlight match cards
      setHoveredTeam(foundTeam);
      canvasRef.current.style.cursor = foundTeam && !viewMode ? 'pointer' : isDragging ? 'grabbing' : 'grab';
    }
  };

  // Update the handleMouseUp function to fix team selection:
  const handleMouseUp = (e) => {
    const wasDragging = dragDistance > 5; // Threshold for click vs drag
    
    setIsDragging(false);
    setDragDistance(0);
    
    if (wasDragging) {
      return; // Was a drag, not a click
    }
    
    // Click detection - only if not dragging
    const pos = getMousePos(e);
    
    for (const box of matchBoxes) {
      if (box.teamId &&
          pos.x >= box.x && pos.x <= box.x + box.w &&
          pos.y >= box.y && pos.y <= box.y + box.h) {
        handleMatchSelect(box.matchId, box.teamId);
        break;
      }
    }
  };

  const handleZoomIn = () => {
    setCamera(prev => ({ ...prev, zoom: Math.min(3, prev.zoom * 1.2) }));
  };

  const handleZoomOut = () => {
    setCamera(prev => ({ ...prev, zoom: Math.max(0.1, prev.zoom / 1.2) }));
  };

  // Reset view
  const handleResetView = () => {
    const container = containerRef.current;
    if (!container) {
      setCamera({ x: 0, y: 0, zoom: 1 });
      return;
    }

    // Bracket bounding box (matches the layout constants in drawBracket)
    const baseX = 100;
    const baseY = 100;
    const cardW = 220;
    const cardH = 140;
    const colGap = 240;
    const rowGap = 180;

    const padding = 40;
    const contentLeft = baseX - padding;
    const contentTop = baseY - padding - 60; // extra for champion text
    const contentRight = baseX + colGap * 8 + cardW + padding;
    const contentBottom = baseY + rowGap * 7 + cardH + padding;

    const contentW = contentRight - contentLeft;
    const contentH = contentBottom - contentTop;

    const viewW = container.clientWidth;
    const viewH = container.clientHeight;

    const zoom = Math.max(0.1, Math.min(3, Math.min(viewW / contentW, viewH / contentH)));

    // Center the content
    const x = (viewW - contentW * zoom) / 2 - contentLeft * zoom;
    const y = (viewH - contentH * zoom) / 2 - contentTop * zoom;

    setCamera({ x, y, zoom });
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
      alert(t(error.response?.data?.error) || t('error.failedSubmitPred'));
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
      const storedUsername = localStorage.getItem('username');
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
      const dpr = window.devicePixelRatio || 1;
      const baseW = 3000;
      const baseH = 1650;

      const canvas = document.createElement('canvas');
      canvas.width = baseW * dpr;
      canvas.height = baseH * dpr;

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      ctx.fillStyle = '#f9fafb';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      /* =============================
         Header
      ============================== */
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 60px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 World Cup Brackets', 1500, 80);

      ctx.font = '36px Arial';
      ctx.fillStyle = '#6b7280';
      const displayName = storedUsername || 'My Predictions';
      ctx.fillText(`${t('username')}: ${displayName}`, 1500, 130);

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
        const src = getLocalFlagUrl(fifaCode);
        if (!src) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;

        await new Promise((res) => {
          img.onload = res;
          img.onerror = res;
        });

        if (!img.naturalWidth) return;

        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
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
        ctx.strokeStyle = isFinal ? '#f59e0b' : '#636363';
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
      
      ctx.fillText(t('pred.roundof32'), 280, startY - 20);
      ctx.fillText(t('pred.roundof16'), 600, startY - 20);
      ctx.fillText(t('pred.quarterfinals'), 920, startY - 20);
      ctx.fillText(t('pred.semifinals'), 1240, startY - 20);
      ctx.fillText(t('pred.final'), 1500, startY - 20);
      ctx.fillText(t('pred.semifinals'), 1760, startY - 20);
      ctx.fillText(t('pred.quarterfinals'), 2080, startY - 20);
      ctx.fillText(t('pred.roundof16'), 2400, startY - 20);
      ctx.fillText(t('pred.roundof32'), 2720, startY - 20);

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
        ctx.fillText(t('pred.knockout.champion'), 1500, startY + 290);
        ctx.font = 'bold 28px Arial';
        ctx.fillText(t(finalWinner.fifa_code), 1500, startY + 325);
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
      ctx.strokeStyle = '#636363';
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
      }, 'image/png');

    } catch (err) {
      console.error(err);
      alert(t('pred.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  // Helper function to get distance between two touch points
  const getTouchDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Helper function to get midpoint between two touches
  const getTouchMidpoint = (touch1, touch2) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  // Touch handlers
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      // Single touch - pan
      setIsTouching(true);
      setDragDistance(0);
      setTouchStart({
        x: e.touches[0].clientX - camera.x,
        y: e.touches[0].clientY - camera.y
      });
    } else if (e.touches.length === 2) {
      // Two finger - pinch zoom
      e.preventDefault();
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      setLastTouchDistance(distance);
      
      const midpoint = getTouchMidpoint(e.touches[0], e.touches[1]);
      setTouchStart(midpoint);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && touchStart) {
      // Single touch - pan
      const newX = e.touches[0].clientX - touchStart.x;
      const newY = e.touches[0].clientY - touchStart.y;
      
      const distance = Math.sqrt(
        Math.pow(newX - camera.x, 2) + Math.pow(newY - camera.y, 2)
      );
      setDragDistance(distance);
      
      setCamera(prev => ({
        ...prev,
        x: newX,
        y: newY
      }));
    } else if (e.touches.length === 2 && lastTouchDistance !== null) {
      // Two finger - pinch zoom
      e.preventDefault();
      
      const newDistance = getTouchDistance(e.touches[0], e.touches[1]);
      const scale = newDistance / lastTouchDistance;
      
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const midpoint = getTouchMidpoint(e.touches[0], e.touches[1]);
      
      // Calculate zoom center point
      const zoomCenterX = midpoint.x - rect.left;
      const zoomCenterY = midpoint.y - rect.top;
      
      const worldX = (zoomCenterX - camera.x) / camera.zoom;
      const worldY = (zoomCenterY - camera.y) / camera.zoom;
      
      const newZoom = Math.max(0.1, Math.min(3, camera.zoom * scale));
      
      setCamera({
        x: zoomCenterX - worldX * newZoom,
        y: zoomCenterY - worldY * newZoom,
        zoom: newZoom
      });
      
      setLastTouchDistance(newDistance);
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length === 0) {
      // All touches released
      const wasDragging = dragDistance > 5;
      
      if (!wasDragging && touchStart && !lastTouchDistance) {
        // Was a tap, not a drag or pinch
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        // Use the touch start position for tap detection
        const pos = {
          x: (touchStart.x + camera.x - rect.left - camera.x) / camera.zoom,
          y: (touchStart.y + camera.y - rect.top - camera.y) / camera.zoom
        };
        
        // Check if tap hit a team
        for (const box of matchBoxes) {
          if (box.teamId &&
              pos.x >= box.x && pos.x <= box.x + box.w &&
              pos.y >= box.y && pos.y <= box.y + box.h) {
            handleMatchSelect(box.matchId, box.teamId);
            break;
          }
        }
      }
      
      setIsTouching(false);
      setTouchStart(null);
      setLastTouchDistance(null);
      setDragDistance(0);
    } else if (e.touches.length === 1) {
      // One finger remaining, switch to pan mode
      setLastTouchDistance(null);
      setTouchStart({
        x: e.touches[0].clientX - camera.x,
        y: e.touches[0].clientY - camera.y
      });
    }
  };

  if (loading) {
    return (
      <div className="knockout-canvas-container">
        <div className="loading-spinner">
          <div className="spinner-icon"></div>
          <p>{t('pred.knockout.loading')}</p>
        </div>
      </div>
    );
  }
  const progress = calculateProgress();

  return (
    <div className="knockout-canvas-container">
      <div className="knockout-header">
        <h2>🏆 {t('pred.knockout')}</h2>
        <div className="progress-summary">
          {Object.entries(progress).map(([key, p]) => (
            <div
              key={key}
              className={`progress-item ${p.completed === p.total ? 'complete' : ''}`}
            >
              <span className="progress-label">{p.label}</span>
              <span className="progress-count">{p.completed}/{p.total}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="canvas-wrapper" ref={containerRef}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setIsDragging(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          style={{ touchAction: 'none' }}
        />
        <div className="canvas-controls">
          <button onClick={handleZoomIn} title={t("pred.zoomIn")}>+</button>
          <button onClick={handleZoomOut} title={t("pred.zoomOut")}>−</button>
          <button onClick={handleResetView} title={t("pred.resetView")}>⟲</button>
          <span className="zoom-level">{Math.round((camera?.zoom ?? 1) * 100)}%</span>
        </div>
      </div>

      {viewMode && (
        <div className="view-mode-notice">
          <p>✓ {t('pred.knockout.locked')}</p>
        </div>
      )}

      <div className="knockout-footer">
        {!viewMode ? (
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
                {t('pred.knockout.complete', {
                  number: Object.values(progress).reduce(
                    (sum, p) => sum + (p.total - p.completed),
                    0
                  ),
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <Button onClick={onBack} variant="outline">
              ← {t('pred.backToThird')}
            </Button>
            
            <Button 
              onClick={exportAsImage} 
              loading={exporting}
              variant="primary"
              size="large"
            >
              📸 {t('pred.knockout.export')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
