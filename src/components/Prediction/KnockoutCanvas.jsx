import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getFlagCode } from '../../utils/helpers';
import { predictionAPI } from '../../api/api';
import { Button } from '../UI/Button';
import { findMatchingElement } from '../../utils/helpers';
import './KnockoutCanvas.css';

export const KnockoutCanvas = ({ onBack, onSubmit, savedPredictions, viewMode, user }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [predictions, setPredictions] = useState({});
  const [roundOf32Teams, setRoundOf32Teams] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { t } = useTranslation();

  // Canvas state
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
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
          const iso = getFlagCode(fifaCode);
          if (!iso) return;
          
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = `https://flagcdn.com/w40/${iso}.png`;
          
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
        alert(error.response?.data?.error || t('error.failedSavePred'));
      }
    }
  };

  // Canvas drawing
  const drawBracket = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || roundOf32Teams.length === 0) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    // Clear
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, width, height);

    // Apply camera transform
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    // Layout parameters
    const baseX = 100;
    const baseY = 100;
    const cardW = 180;
    const cardH = 100;
    const colGap = 200;
    const rowGap = 140;

    const boxes = [];

    // Draw function for match card
    const drawMatch = (x, y, matchId, label, teams, winnerId, isFinal = false) => {
      const h = teams.length > 0 ? cardH : 80;

      // Background
      if (isFinal) {
        ctx.fillStyle = 'rgba(245,158,11,0.15)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
      } else if (hoveredMatch === matchId) {
        ctx.fillStyle = '#e0e7ff';
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 3;
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 2;
      }

      ctx.beginPath();
      ctx.roundRect(x, y, cardW, h, 8);
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.fillStyle = isFinal ? '#f59e0b' : '#667eea';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + cardW / 2, y + 20);

      if (teams.length === 0) {
        ctx.fillStyle = '#9ca3af';
        ctx.font = '14px Arial';
        ctx.fillText('TBD', x + cardW / 2, y + 50);
      } else {
        teams.forEach((team, idx) => {
          const ty = y + 40 + idx * 36;
          const isWinner = team.id === winnerId;
          const isHovered = hoveredTeam?.matchId === matchId && hoveredTeam?.teamId === team.id;

          // Team background
          if (isWinner) {
            ctx.fillStyle = '#d1fae5';
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(x + 8, ty - 16, cardW - 16, 28, 6);
            ctx.fill();
            ctx.stroke();
          } else if (isHovered && !viewMode) {
            ctx.fillStyle = '#e0f2fe';
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(x + 8, ty - 16, cardW - 16, 28, 6);
            ctx.fill();
            ctx.stroke();
          }

          // Flag
          const flag = flagImages[team.fifa_code];
          if (flag) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(x + 20, ty - 2, 8, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(flag, x + 12, ty - 10, 16, 16);
            ctx.restore();
          }

          // Team name
          ctx.fillStyle = isWinner ? '#065f46' : '#1f2937';
          ctx.font = isWinner ? 'bold 13px Arial' : '13px Arial';
          ctx.textAlign = 'left';
          const name = team.name.length > 14 ? team.name.slice(0, 12) + '...' : team.name;
          ctx.fillText(name, x + 34, ty);

          // Checkmark
          if (isWinner) {
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'right';
            ctx.fillText('✓', x + cardW - 12, ty);
          }

          // Store box for hit detection
          boxes.push({
            matchId,
            teamId: team.id,
            x: x + 8,
            y: ty - 16,
            w: cardW - 16,
            h: 28
          });
        });
      }

      boxes.push({ matchId, x, y, w: cardW, h, isCard: true });
    };

    // Draw connection lines
    const drawConnection = (x1, y1, x2, y2) => {
      const midX = (x1 + x2) / 2;
      ctx.strokeStyle = '#cbd5e1';
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
      ctx.fillText('🏆 CHAMPION 🏆', finalX + cardW / 2, finalY - 40);
      ctx.font = 'bold 20px Arial';
      ctx.fillText(finalWinner.name, finalX + cardW / 2, finalY - 15);
    }

    drawMatch(finalX, finalY, 31, 'FINAL', finalTeams, predictions[31], true);
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

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      drawBracket();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawBracket]);

  // Mouse handlers
  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - camera.x) / camera.zoom,
      y: (e.clientY - rect.top - camera.y) / camera.zoom
    };
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - camera.x, y: e.clientY - camera.y });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setCamera(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    } else {
      // Hover detection
      const pos = getMousePos(e);
      let foundMatch = null;
      let foundTeam = null;

      for (const box of matchBoxes) {
        if (pos.x >= box.x && pos.x <= box.x + box.w &&
            pos.y >= box.y && pos.y <= box.y + box.h) {
          if (box.teamId) {
            foundTeam = { matchId: box.matchId, teamId: box.teamId };
          } else {
            foundMatch = box.matchId;
          }
        }
      }

      setHoveredMatch(foundMatch);
      setHoveredTeam(foundTeam);
      canvasRef.current.style.cursor = foundTeam && !viewMode ? 'pointer' : isDragging ? 'grabbing' : 'grab';
    }
  };

  const handleMouseUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
    } else {
      // Click detection
      const pos = getMousePos(e);
      
      for (const box of matchBoxes) {
        if (box.teamId &&
            pos.x >= box.x && pos.x <= box.x + box.w &&
            pos.y >= box.y && pos.y <= box.y + box.h) {
          handleMatchSelect(box.matchId, box.teamId);
          return;
        }
      }
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.3, Math.min(2, camera.zoom * delta));
    
    const canvas = canvasRef.current;
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

  const handleZoomIn = () => {
    setCamera(prev => ({ ...prev, zoom: Math.min(2, prev.zoom * 1.2) }));
  };

  const handleZoomOut = () => {
    setCamera(prev => ({ ...prev, zoom: Math.max(0.3, prev.zoom / 1.2) }));
  };

  const handleResetView = () => {
    setCamera({ x: 0, y: 0, zoom: 1 });
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
          onWheel={handleWheel}
        />
        <div className="canvas-controls">
          <button onClick={handleZoomIn} title="Zoom In">+</button>
          <button onClick={handleZoomOut} title="Zoom Out">−</button>
          <button onClick={handleResetView} title="Reset View">⟲</button>
          <span className="zoom-level">{Math.round(camera.zoom * 100)}%</span>
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
                {t('pred.knockout.complete', {
                  number: Object.values(progress).reduce(
                    (sum, p) => sum + (p.total - p.completed),
                    0
                  ),
                })}
              </div>
            )}
          </>
        )}
        {viewMode && (
          <div className="view-mode-notice">
            <p>✓ {t('pred.knockout.locked')}</p>
          </div>
        )}
      </div>
    </div>
  );
};
