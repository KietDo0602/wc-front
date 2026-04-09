import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { resultsAPI, predictionAPI } from '../api/api';
import { Card } from '../components/UI/Card';
import { FlagIcon, getLocalFlagUrl } from '../utils/helpers';
import './MatchResultsPage.css';

export const MatchResultsPage = () => {
  const [groupResults, setGroupResults] = useState([]);
  const [thirdPlaceResults, setThirdPlaceResults] = useState([]);
  const [knockoutBracket, setKnockoutBracket] = useState({});
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('groups');
  const { t } = useTranslation();

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      // Load teams first
      const teamsRes = await predictionAPI.getTeams();
      setTeams(teamsRes.data.teams || []);

      // Load group results (using public API)
      try {
        const groupRes = await resultsAPI.getOfficialGroupRankings();
        if (groupRes.data.rankings) {
          // Group by group_id
          const grouped = groupRes.data.rankings.reduce((acc, ranking) => {
            if (!acc[ranking.group_id]) {
              acc[ranking.group_id] = {
                group_id: ranking.group_id,
                group_code: ranking.group_code,
                rankings: []
              };
            }
            acc[ranking.group_id].rankings.push(ranking);
            return acc;
          }, {});

          // Sort rankings within each group
          Object.values(grouped).forEach(group => {
            group.rankings.sort((a, b) => a.position - b.position);
          });

          setGroupResults(Object.values(grouped).sort((a, b) => a.group_id - b.group_id));
        }
      } catch (error) {
        console.log('No group results yet');
      }

      // Load third place results (using public API)
      try {
        const thirdRes = await resultsAPI.getOfficialThirdPlace();
        if (thirdRes.data.teams) {
          setThirdPlaceResults(thirdRes.data.teams);
        }
      } catch (error) {
        console.log('No third place results yet');
      }

      // Load knockout bracket (using public API)
      try {
        const bracketRes = await resultsAPI.getOfficialKnockoutBracket();
        if (bracketRes.data.bracket) {
          setKnockoutBracket(bracketRes.data.bracket);
        }
      } catch (error) {
        console.log('No knockout results yet');
      }

    } catch (error) {
      console.error('Failed to load results:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPositionBadge = (position) => {
    const badges = {
      1: { emoji: '🥇', label: '1st', class: 'gold' },
      2: { emoji: '🥈', label: '2nd', class: 'silver' },
      3: { emoji: '🥉', label: '3rd', class: 'bronze' },
      4: { emoji: '', label: '4th', class: 'fourth' }
    };
    return badges[position] || { emoji: '', label: position, class: '' };
  };

  const getTeamById = (teamId) => {
    return teams.find(t => t.id === teamId);
  };

  if (loading) {
    return (
      <div className="match-results-page loading">
        <div className="spinner-icon"></div>
        <p>Loading official results...</p>
      </div>
    );
  }

  return (
    <div className="match-results-page">
      <div className="results-header">
        <h1>📋 {t('matchResults.header')}</h1>
        <p className="subtitle">{t('matchResults.viewAll')}</p>
      </div>

      <div className="results-tabs">
        <button
          className={`results-tab ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          📊 {t('home.groupStage')}
        </button>
        <button
          className={`results-tab ${activeTab === 'third-place' ? 'active' : ''}`}
          onClick={() => setActiveTab('third-place')}
        >
          🥉 {t('pred.thirdPlace')}
        </button>
        <button
          className={`results-tab ${activeTab === 'knockout' ? 'active' : ''}`}
          onClick={() => setActiveTab('knockout')}
        >
          🏆 {t('pred.knockout')}
        </button>
      </div>

      <div className="results-content">
        {activeTab === 'groups' && (
          <GroupStageResults 
            groupResults={groupResults} 
            getPositionBadge={getPositionBadge}
          />
        )}

        {activeTab === 'third-place' && (
          <ThirdPlaceResults 
            thirdPlaceResults={thirdPlaceResults}
            getTeamById={getTeamById}
          />
        )}

        {activeTab === 'knockout' && (
          <KnockoutResults 
            bracket={knockoutBracket}
            teams={teams}
          />
        )}
      </div>
    </div>
  );
};

// Group Stage Results Component
const GroupStageResults = ({ groupResults, getPositionBadge }) => {
  const { t } = useTranslation();

  if (groupResults.length === 0) {
    return (
      <Card className="empty-state">
        <p>⏳ {t("matchResults.notPublished")}</p>
      </Card>
    );
  }

  return (
    <div className="group-results-grid">
      {groupResults.map(group => (
        <Card key={group.group_id} className="group-result-card">
          <h3 className="group-title">{t('pred.groupStage.group', {group: group.group_code})}</h3>
          <div className="group-rankings">
            {group.rankings.map(ranking => {
              const badge = getPositionBadge(ranking.position);
              return (
                <div key={ranking.position} className={`ranking-row ${badge.class}`}>
                  <div className="position-indicator">
                    <span className="position-emoji">{badge.emoji}</span>
                    <span className="position-label">{badge.label}</span>
                  </div>
                  <div className="team-info">
                    <FlagIcon fifaCode={ranking.fifa_code} size="normal" />
                    <span className="team-name">{t(ranking.fifa_code)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
};

// Third Place Results Component
const ThirdPlaceResults = ({ thirdPlaceResults, getTeamById }) => {
  const { t } = useTranslation();

  if (thirdPlaceResults.length === 0) {
    return (
      <Card className="empty-state">
        <p>⏳ {t('matchResults.third.notPublished')}</p>
      </Card>
    );
  }

  return (
    <div className="results-third-place-container">
      <Card className="results-third-place-card">
        <h3>{t('matchResults.third.advance.2')}</h3>
        <p className="description">
          {t("matchResults.third.advance")}
        </p>
        <div className="results-third-place-grid">
          {thirdPlaceResults.map((team, index) => (
            <div key={team.id} className="results-third-place-team">
              <div className="team-number">{index + 1}</div>
              <div className="team-details">
                <FlagIcon fifaCode={team.fifa_code} size="large" />
                <div className="team-text">
                  <h4>{t(team.fifa_code)}</h4>
                  <p className="team-position">{t('matchResults.third.finisher')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// Knockout Results Component with Bracket Layout
const KnockoutResults = ({ bracket, teams }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [camera, setCamera] = useState(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [flagImages, setFlagImages] = useState({});
  const { t } = useTranslation();

  const matches = Object.values(bracket);

  // Preload flag images
  useEffect(() => {
    const loadFlags = async () => {
      const uniqueCodes = new Set(teams.map(t => t.fifa_code));
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
    };

    if (teams.length > 0) {
      loadFlags();
    }
  }, [teams]);

  const drawBracket = useCallback(() => {
    if (!camera) return;

    const canvas = canvasRef.current;
    if (!canvas || matches.length === 0) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--background') || '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Apply camera transform
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    // Layout parameters
    const baseX = 100;
    const baseY = 100;
    const cardW = 220;
    const cardH = 140;
    const colGap = 240;
    const rowGap = 180;

    const drawMatch = (x, y, match, label, isFinal = false) => {
      const team1 = teams.find(t => t.id === match.team1_id);
      const team2 = teams.find(t => t.id === match.team2_id);
      const hasTeams = team1 && team2;
      const h = hasTeams ? cardH : 100;

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
      ctx.fillStyle = isFinal ? '#f59e0b' : (match.winner_id ? getComputedStyle(document.documentElement).getPropertyValue('--primary') : '#667eea');
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + cardW / 2, y + 24);

      if (!hasTeams) {
        ctx.fillStyle = '#9ca3af';
        ctx.font = '16px Arial';
        ctx.fillText('TBD', x + cardW / 2, y + 60);
      } else {
        [team1, team2].forEach((team, idx) => {
          const ty = y + 54 + idx * 44;
          const isWinner = team.id === match.winner_id;

          // Team background
          if (isWinner) {
            ctx.fillStyle = '#d1fae5';
            ctx.strokeStyle = '#10b981';
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
            ctx.arc(x + 24, ty, 10, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(flag, x + 14, ty - 10, 20, 20);
            ctx.restore();
          }

          // Team name
          const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text') || '#1f2937';
          ctx.fillStyle = isWinner ? '#065f46' : textColor;
          ctx.font = isWinner ? 'bold 15px Arial' : '15px Arial';
          ctx.textAlign = 'left';
          const name = team.name.length > 16 ? team.name.slice(0, 14) + '...' : t(team.fifa_code);
          ctx.fillText(name, x + 40, ty + 4);

          // Checkmark
          if (isWinner) {
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText('✓', x + cardW - 14, ty);
            ctx.textBaseline = 'alphabetic';
          }
        });
      }

      return { x, y, w: cardW, h };
    };

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

    // Get matches by ID
    const getMatch = (id) => matches.find(m => m.match_id === id) || null;

    const drawMatchSafe = (x, y, match, label, isFinal = false) => {
      if (match) {
        return drawMatch(x, y, match, label, isFinal);
      }
      // Draw empty TBD card
      const h = 100;
      ctx.fillStyle = isFinal ? 'rgba(245,158,11,0.15)' : (getComputedStyle(document.documentElement).getPropertyValue('--surface') || '#ffffff');
      ctx.strokeStyle = isFinal ? '#f59e0b' : '#d1d5db';
      ctx.lineWidth = isFinal ? 3 : 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.roundRect(x, y, cardW, h, 8);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = isFinal ? '#f59e0b' : '#667eea';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + cardW / 2, y + 24);

      ctx.fillStyle = '#9ca3af';
      ctx.font = '16px Arial';
      ctx.fillText('TBD', x + cardW / 2, y + 60);

      return { x, y, w: cardW, h };
    };

    // LEFT SIDE - R32 (Matches 1-8)
    let y = baseY;
    const r32LeftPos = [];
    for (let i = 1; i <= 8; i++) {
      drawMatchSafe(baseX, y, getMatch(i), `M${i}`);
      r32LeftPos.push({ x: baseX + cardW, y: y + cardH / 2 });
      y += rowGap;
    }

    // LEFT - R16 (Matches 17-20)
    y = baseY + rowGap / 2;
    const r16LeftPos = [];
    for (let i = 17; i <= 20; i++) {
      drawMatchSafe(baseX + colGap, y, getMatch(i), `M${i}`);
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

    // LEFT - QF (Matches 25-26)
    y = baseY + rowGap * 1.5;
    const qfLeftPos = [];
    for (let i = 25; i <= 26; i++) {
      drawMatchSafe(baseX + colGap * 2, y, getMatch(i), `QF${i - 24}`);
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

    // LEFT - SF (Match 29)
    const sf1Y = baseY + rowGap * 3.5;
    drawMatchSafe(baseX + colGap * 3, sf1Y, getMatch(29), 'SF1');
    const sf1Pos = { x: baseX + colGap * 3 + cardW, y: sf1Y + cardH / 2 };

    drawConnection(qfLeftPos[0].x, qfLeftPos[0].y, sf1Pos.x - cardW, sf1Pos.y);
    drawConnection(qfLeftPos[1].x, qfLeftPos[1].y, sf1Pos.x - cardW, sf1Pos.y);

    // CENTER - FINAL
    const finalX = baseX + colGap * 4;
    const finalY = baseY + rowGap * 3.5;
    const match31 = getMatch(31);

    if (match31) {
      const champion = teams.find(t => t.id === match31.winner_id);
      if (champion) {
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🏆 CHAMPION', finalX + cardW / 2, finalY - 45);
        ctx.font = 'bold 20px Arial';
        ctx.fillText(t(champion.fifa_code), finalX + cardW / 2, finalY - 18);
      }
    }

    drawMatchSafe(finalX, finalY, match31, 'FINAL', true);
    const finalPos = { x: finalX + cardW, y: finalY + cardH / 2 };

    drawConnection(sf1Pos.x, sf1Pos.y, finalX, finalPos.y);

    // RIGHT - SF2 (Match 30)
    drawMatchSafe(baseX + colGap * 5, sf1Y, getMatch(30), 'SF2');
    const sf2Pos = { x: baseX + colGap * 5, y: sf1Y + cardH / 2 };

    drawConnection(finalPos.x, finalPos.y, sf2Pos.x, sf2Pos.y);

    // RIGHT - QF (Matches 27-28)
    y = baseY + rowGap * 1.5;
    const qfRightPos = [];
    for (let i = 27; i <= 28; i++) {
      drawMatchSafe(baseX + colGap * 6, y, getMatch(i), `QF${i - 24}`);
      qfRightPos.push({ x: baseX + colGap * 6, y: y + cardH / 2 });
      y += rowGap * 4;
    }

    drawConnection(sf2Pos.x + cardW, sf2Pos.y, qfRightPos[0].x, qfRightPos[0].y);
    drawConnection(sf2Pos.x + cardW, sf2Pos.y, qfRightPos[1].x, qfRightPos[1].y);

    // RIGHT - R16 (Matches 21-24)
    y = baseY + rowGap / 2;
    const r16RightPos = [];
    for (let i = 21; i <= 24; i++) {
      drawMatchSafe(baseX + colGap * 7, y, getMatch(i), `M${i}`);
      r16RightPos.push({ x: baseX + colGap * 7, y: y + cardH / 2 });
      y += rowGap * 2;
    }

    for (let i = 0; i < 2; i++) {
      const p1 = r16RightPos[i * 2];
      const p2 = r16RightPos[i * 2 + 1];
      const target = qfRightPos[i];
      drawConnection(target.x + cardW, target.y, p1.x, p1.y);
      drawConnection(target.x + cardW, target.y, p2.x, p2.y);
    }

    // RIGHT - R32 (Matches 9-16)
    y = baseY;
    const r32RightPos = [];
    for (let i = 9; i <= 16; i++) {
      drawMatchSafe(baseX + colGap * 8, y, getMatch(i), `M${i}`);
      r32RightPos.push({ x: baseX + colGap * 8, y: y + cardH / 2 });
      y += rowGap;
    }

    for (let i = 0; i < 4; i++) {
      const p1 = r32RightPos[i * 2];
      const p2 = r32RightPos[i * 2 + 1];
      const target = r16RightPos[i];
      drawConnection(target.x + cardW, target.y, p1.x, p1.y);
      drawConnection(target.x + cardW, target.y, p2.x, p2.y);
    }

    ctx.restore();

  }, [camera, matches, teams, flagImages]);

  useEffect(() => {
    if (matches.length > 0) {
      drawBracket();
    }
  }, [drawBracket]);

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
  }, [camera, matches]);

  // Mouse handlers
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
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e) => {
      e.preventDefault();
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

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [camera]);

  const handleZoomIn = () => {
    setCamera(prev => ({ ...prev, zoom: Math.min(3, prev.zoom * 1.2) }));
  };

  const handleZoomOut = () => {
    setCamera(prev => ({ ...prev, zoom: Math.max(0.1, prev.zoom / 1.2) }));
  };

  const handleResetView = () => {
    const container = containerRef.current;
    if (!container) {
      setCamera({ x: 0, y: 0, zoom: 1 });
      return;
    }

    const baseX = 100;
    const baseY = 100;
    const cardW = 220;
    const cardH = 140;
    const colGap = 240;
    const rowGap = 180;

    const padding = 40;
    const contentLeft = baseX - padding;
    const contentTop = baseY - padding - 60;
    const contentRight = baseX + colGap * 8 + cardW + padding;
    const contentBottom = baseY + rowGap * 7 + cardH + padding;

    const contentW = contentRight - contentLeft;
    const contentH = contentBottom - contentTop;

    const viewW = container.clientWidth;
    const viewH = container.clientHeight;

    const zoom = Math.max(0.1, Math.min(3, Math.min(viewW / contentW, viewH / contentH)));

    const x = (viewW - contentW * zoom) / 2 - contentLeft * zoom;
    const y = (viewH - contentH * zoom) / 2 - contentTop * zoom;

    setCamera({ x, y, zoom });
  };

  if (matches.length === 0) {
    return (
      <Card className="empty-state">
        <p>⏳ {t('matchResults.knockout.notPublished')}</p>
      </Card>
    );
  }

  return (
    <div className="knockout-bracket-container">
      <div className="bracket-canvas-wrapper" ref={containerRef}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setIsDragging(false)}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        />
        <div className="bracket-controls">
          <button onClick={handleZoomIn} title={t('pred.zoomIn')}>+</button>
          <button onClick={handleZoomOut} title={t('pred.zoomOut')}>−</button>
          <button onClick={handleResetView} title={t('pred.resetView')}>⟲</button>
          <span className="zoom-level">{Math.round((camera?.zoom ?? 1) * 100)}%</span>
        </div>
      </div>
    </div>
  );
};

