import React, { useState, useEffect, useRef, useCallback } from 'react';
import { adminAPI } from '../../api/adminApi';
import { predictionAPI } from '../../api/api';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { findMatchingElement, getLocalFlagUrl, FlagIcon } from '../../utils/helpers';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './ActualResults.css';

export const ActualResults = () => {
  const [activeTab, setActiveTab] = useState('groups');
  const [groups, setGroups] = useState([]);
  const [teams, setTeams] = useState([]);
  const [knockoutBracket, setKnockoutBracket] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load teams
      const teamsRes = await predictionAPI.getTeams();
      const teamsData = teamsRes.data.teams;
      
      // Group teams by group_id
      const groupedTeams = {};
      teamsData.forEach(team => {
        if (team.group_id) {
          if (!groupedTeams[team.group_id]) {
            groupedTeams[team.group_id] = {
              id: team.group_id,
              code: team.group_code,
              teams: []
            };
          }
          groupedTeams[team.group_id].teams.push(team);
        }
      });

      setGroups(Object.values(groupedTeams).sort((a, b) => a.id - b.id));
      setTeams(teamsData);
      
      // Load generated knockout bracket
      try {
        const bracketRes = await adminAPI.getGeneratedBracket();
        setKnockoutBracket(bracketRes.data?.bracket || {});
        console.log('Loaded bracket:', Object.keys(bracketRes.data?.bracket || {}).length, 'matches');
      } catch (bracketError) {
        console.warn('Could not load bracket:', bracketError);
        setKnockoutBracket({});
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load teams data');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async (stage) => {
    const stageNames = {
      'groups': 'Group Stage',
      'third_place': 'Third Place',
      'knockout': 'Knockout Stage',
      'all': 'ALL'
    };

    const confirmMessage = stage === 'all' 
      ? '⚠️ WARNING: This will delete ALL official results (Groups, Third Place, and Knockout). This action cannot be undone!\n\nAre you absolutely sure?'
      : `Are you sure you want to clear all ${stageNames[stage]} results? This action cannot be undone.`;

    if (!window.confirm(confirmMessage)) return;

    // Extra confirmation for clearing all
    if (stage === 'all') {
      if (!window.confirm('Final confirmation: Delete EVERYTHING?')) return;
    }

    try {
      await adminAPI.clearOfficialResults(stage);
      alert(`${stageNames[stage]} results cleared successfully!`);
      
      // Reload data
      await loadData();
    } catch (error) {
      console.error('Failed to clear results:', error);
      alert(error.response?.data?.error || 'Failed to clear results');
    }
  };

  const handleGenerateBracket = async () => {
    try {
      const response = await adminAPI.generateKnockoutBracket();
      alert('Knockout bracket generated successfully!');
      
      // Reload data to show the generated bracket
      await loadData();
    } catch (error) {
      console.error('Failed to generate bracket:', error);
      alert(error.response?.data?.error || 'Failed to generate bracket');
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner-icon"></div>
        <p>Loading data...</p>
      </div>
    );
  }

  return (
    <div className="actual-results">
      <div className="management-header">
        <h2>🏆 Actual Results Management</h2>
        <p className="subtitle">Enter real match results for scoring predictions</p>

        <div className="bracket-generation">
          <Button 
            onClick={handleGenerateBracket}
            variant="primary"
          >
            🎯 Generate Knockout Bracket
          </Button>
        </div>
        
        <div className="danger-zone">
          <h3>⚠️ Danger Zone</h3>
          <div className="clear-buttons">
            <Button 
              variant="danger"
              size="small"
              onClick={() => handleClear('groups')}
            >
              Clear Group Results
            </Button>
            <Button 
              variant="danger"
              size="small"
              onClick={() => handleClear('third_place')}
            >
              Clear Third Place
            </Button>
            <Button 
              variant="danger"
              size="small"
              onClick={() => handleClear('knockout')}
            >
              Clear Knockout
            </Button>
            <Button 
              variant="danger"
              size="small"
              onClick={() => handleClear('all')}
            >
              🔥 Clear EVERYTHING
            </Button>
          </div>
        </div>
      </div>

      <div className="results-tabs">
        <button
          className={`results-tab ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          📊 Group Stage
        </button>
        <button
          className={`results-tab ${activeTab === 'third-place' ? 'active' : ''}`}
          onClick={() => setActiveTab('third-place')}
        >
          🥉 Third Place
        </button>
        <button
          className={`results-tab ${activeTab === 'knockout' ? 'active' : ''}`}
          onClick={() => setActiveTab('knockout')}
        >
          🏆 Knockout Stage
        </button>
      </div>

      <div className="results-content">
        {activeTab === 'groups' && <GroupStageResults groups={groups} />}
        {activeTab === 'third-place' && <ThirdPlaceResults teams={teams} />}
        {activeTab === 'knockout' && <KnockoutResults bracket={knockoutBracket} teams={teams} onUpdate={loadData} />}
      </div>
    </div>
  );
};

const SortableTeamItem = ({ team, position, onPositionChange }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: team.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPositionLabel = (pos) => {
    const labels = ['🥇 1st', '🥈 2nd', '🥉 3rd', '4th'];
    return labels[pos - 1];
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`ranking-item position-${position}`}
    >
      <div className="position-badge">
        {getPositionLabel(position)}
      </div>
      <div className="team-info">
        <FlagIcon fifaCode={team.fifa_code} size="normal" />
        <span className="team-name">{team.name}</span>
      </div>
      <span className="drag-handle">⋮⋮</span>
    </div>
  );
};

// Group Stage Results Sub-component
const GroupStageResults = ({ groups }) => {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [rankedTeams, setRankedTeams] = useState([]);
  const [loading, setLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (selectedGroup) {
      loadGroupRankings();
    }
  }, [selectedGroup]);

  const loadGroupRankings = async () => {
    if (!selectedGroup) return;

    setLoading(true);
    try {
      // Try to load existing official results
      const response = await adminAPI.getActualGroupRankings?.(selectedGroup.id);
      
      if (response?.data?.rankings && response.data.rankings.length > 0) {
        // Use official rankings if they exist
        const officialRankings = response.data.rankings
          .sort((a, b) => a.position - b.position)
          .map(r => {
            const team = selectedGroup.teams.find(t => t.id === r.team_id);
            return { ...team, position: r.position };
          });
        setRankedTeams(officialRankings);
      } else {
        // Use default team order if no official rankings
        setRankedTeams(selectedGroup.teams.map((team, idx) => ({
          ...team,
          position: idx + 1
        })));
      }
    } catch (error) {
      console.warn('No official rankings yet, using default order');
      // Default to team order
      setRankedTeams(selectedGroup.teams.map((team, idx) => ({
        ...team,
        position: idx + 1
      })));
    } finally {
      setLoading(false);
    }
  };

  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setRankedTeams((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update positions
        return newItems.map((item, idx) => ({
          ...item,
          position: idx + 1
        }));
      });
    }
  };

  const handleSave = async () => {
    if (!selectedGroup) return;

    try {
      const rankings = rankedTeams.map((team, idx) => ({
        team_id: team.id,
        position: idx + 1
      }));

      await adminAPI.updateActualGroupRankings(selectedGroup.id, rankings);
      alert(`Group ${selectedGroup.code} rankings saved successfully!`);
    } catch (error) {
      console.error('Failed to save rankings:', error);
      alert(error.response?.data?.error || 'Failed to save rankings');
    }
  };

  return (
    <div className="group-stage-results">
      <div className="groups-selector">
        {groups.map(group => (
          <button
            key={group.id}
            className={`group-button ${selectedGroup?.id === group.id ? 'active' : ''}`}
            onClick={() => handleGroupSelect(group)}
          >
            Group {group.code}
          </button>
        ))}
      </div>

      {selectedGroup && (
        <Card className="rankings-card">
          <h3>Group {selectedGroup.code} - Final Rankings</h3>
          <p className="instruction">Drag teams to reorder their positions</p>

          {loading ? (
            <div className="loading-state">
              <div className="spinner-icon"></div>
              <p>Loading rankings...</p>
            </div>
          ) : (
            <>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={rankedTeams.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="rankings-list">
                    {rankedTeams.map((team, index) => (
                      <SortableTeamItem
                        key={team.id}
                        team={team}
                        position={index + 1}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              <div className="card-actions">
                <Button onClick={handleSave}>
                  💾 Save Group {selectedGroup.code} Rankings
                </Button>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

// Third Place Results Sub-component
const ThirdPlaceResults = ({ teams }) => {
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [thirdPlaceTeams, setThirdPlaceTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadThirdPlaceTeams();
  }, []);

  const loadThirdPlaceTeams = async () => {
    setLoading(true);
    try {
      // Get official group rankings
      const response = await adminAPI.getAllActualGroupRankings();
      
      if (!response?.data?.rankings || response.data.rankings.length === 0) {
        alert('Please complete all group stage rankings first');
        setThirdPlaceTeams([]);
        setLoading(false);
        return;
      }

      // Extract teams in 3rd position
      const thirdPlaceList = response.data.rankings
        .filter(ranking => ranking.position === 3)
        .map(ranking => {
          const team = teams.find(t => t.id === ranking.team_id);
          return {
            ...team,
            groupId: ranking.group_id,
            groupCode: ranking.group_code
          };
        })
        .sort((a, b) => a.groupId - b.groupId);

      if (thirdPlaceList.length !== 12) {
        alert(`Expected 12 third-place teams, but found ${thirdPlaceList.length}. Please complete all group rankings.`);
      }

      setThirdPlaceTeams(thirdPlaceList);

      // Load existing official third place selections if any
      try {
        const thirdResponse = await adminAPI.getActualThirdPlace();
        if (thirdResponse?.data?.teams) {
          setSelectedTeams(thirdResponse.data.teams.map(t => t.id));
        }
      } catch (error) {
        console.log('No existing third place selections');
      }

    } catch (error) {
      console.error('Failed to load third place teams:', error);
      alert('Failed to load third place teams. Please ensure group rankings are complete.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTeam = (teamId) => {
    if (selectedTeams.includes(teamId)) {
      setSelectedTeams(selectedTeams.filter(id => id !== teamId));
    } else if (selectedTeams.length < 8) {
      setSelectedTeams([...selectedTeams, teamId]);
    } else {
      alert('You can only select 8 teams');
    }
  };

  const handleSave = async () => {
    if (selectedTeams.length !== 8) {
      alert('You must select exactly 8 teams');
      return;
    }

    try {
      await adminAPI.updateActualThirdPlace(selectedTeams);
      alert('Third place selections saved successfully!');
    } catch (error) {
      console.error('Failed to save third place:', error);
      alert(error.response?.data?.error || 'Failed to save third place selections');
    }
  };

  if (loading) {
    return (
      <div className="third-place-results">
        <Card>
          <div className="loading-state">
            <div className="spinner-icon"></div>
            <p>Loading third place teams...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (thirdPlaceTeams.length === 0) {
    return (
      <div className="third-place-results">
        <Card>
          <h3>⚠️ Group Stage Not Complete</h3>
          <p className="error-message">
            Please complete all 12 group stage rankings before selecting third place advancers.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="third-place-results">
      <Card>
        <h3>Select the 8 Third-Place Teams that Advanced</h3>
        <p className="instruction">
          Select exactly 8 teams from the 12 third-place finishers (one from each group)
        </p>

        <div className="selection-counter">
          <span className="counter">{selectedTeams.length} / 8 teams selected</span>
        </div>

        <div className="third-place-grid">
          {thirdPlaceTeams.map(team => {
            const isSelected = selectedTeams.includes(team.id);
            const canSelect = selectedTeams.length < 8 || isSelected;

            return (
              <div
                key={team.id}
                className={`third-place-card ${isSelected ? 'selected' : ''} ${!canSelect ? 'disabled' : ''}`}
                onClick={() => canSelect && toggleTeam(team.id)}
                style={{ cursor: canSelect ? 'pointer' : 'not-allowed' }}
              >
                {isSelected && <div className="selection-badge">✓</div>}
                
                <div className="team-group-badge">Group {team.groupCode}</div>
                
                <div className="team-info">
                  <div className="team-flag-large">
                    <FlagIcon fifaCode={team.fifa_code} size="large" />
                  </div>
                  <h4 className="team-name-large">{team.name}</h4>
                </div>

                <div className="team-position-label">3rd Place - Group {team.groupCode}</div>
              </div>
            );
          })}
        </div>

        <div className="card-actions">
          <Button 
            onClick={handleSave}
            disabled={selectedTeams.length !== 8}
          >
            💾 Save Third Place Selections ({selectedTeams.length}/8)
          </Button>
        </div>
      </Card>
    </div>
  );
};

// Knockout Results Sub-component
const KnockoutResults = ({ teams, onUpdate }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragDistance, setDragDistance] = useState(0);
  const [flagImages, setFlagImages] = useState({});
  const [hoveredTeam, setHoveredTeam] = useState(null);
  const matchBoxesRef = useRef([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [winnerId, setWinnerId] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Same state as KnockoutCanvas
  const [roundOf32Teams, setRoundOf32Teams] = useState([]);
  const [predictions, setPredictions] = useState({}); // actual results stored like predictions

  useEffect(() => {
    initializeKnockoutTeams();
  }, []);

  const initializeKnockoutTeams = async () => {
    setLoading(true);
    try {
      // Load actual group rankings
      const rankingsRes = await adminAPI.getAllActualGroupRankings();
      const groupRankings = rankingsRes.data?.rankings || [];
      const thirdResponse = await adminAPI.getActualThirdPlace();
      const thirdPlaceSelections = thirdResponse.data.teams;

      if (!groupRankings || groupRankings.length === 0) {
        console.warn('No actual group rankings found');
        setLoading(false);
        return;
      }

      // Build teams array (same logic as KnockoutCanvas)
      const teamsArr = [];
      const groupsMap = {};

      groupRankings.forEach(ranking => {
        const gId = ranking.group_id;
        if (!groupsMap[gId]) groupsMap[gId] = [];

        groupsMap[gId][ranking.position - 1] = {
          id: ranking.team_id,
          name: ranking.team_name,
          fifa_code: ranking.fifa_code
        };
      });

      const sortedGroups = Object.keys(groupsMap).sort((a, b) => parseInt(a) - parseInt(b));

      sortedGroups.forEach(groupId => {
        const ranking = groupsMap[groupId];
        if (ranking && ranking.length >= 3) {
          if (ranking[0]) teamsArr.push({ ...ranking[0], groupId: parseInt(groupId), position: 1 });
          if (ranking[1]) teamsArr.push({ ...ranking[1], groupId: parseInt(groupId), position: 2 });
          if (ranking[2]) teamsArr.push({ ...ranking[2], groupId: parseInt(groupId), position: 3 });
        }
      });

      let result = [];
      if (thirdPlaceSelections && thirdPlaceSelections.length === 8) {
        const idsThirdPlace = new Set(thirdPlaceSelections.map(team => team.team_id));
        result = teamsArr.filter(team => team.position < 3 || idsThirdPlace.has(team.id));
      }

      setRoundOf32Teams(result);

      // Load existing actual knockout results
      try {
        const bracketRes = await adminAPI.getGeneratedBracket();
        const bracket = bracketRes.data?.bracket || {};
        const actuals = {};
        Object.values(bracket).forEach(match => {
          if (match.winner_id) {
            actuals[match.match_id] = match.winner_id;
          }
        });
        setPredictions(actuals);
      } catch {
        console.warn('No existing knockout results');
      }

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
    } finally {
      setLoading(false);
    }
  };

  // --- Same helper functions as KnockoutCanvas ---
  const helperGetTeam = (teamsArr, groupId, position) => {
    return teamsArr.find(team => team.groupId === groupId && team.position === position);
  };

  const getWinnerOfMatch = (matchId) => {
    const winId = predictions[matchId];
    if (!winId) return null;
    return roundOf32Teams.find(team => team.id === winId);
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

  // --- Handle admin setting a winner ---
  const handleMatchSelect = async (matchId, teamId) => {
    setPredictions(prev => ({ ...prev, [matchId]: teamId }));

    try {
      await adminAPI.updateActualKnockoutResult(matchId, teamId);
    } catch (error) {
      console.error('Failed to save knockout result:', error);
      // Revert
      setPredictions(prev => {
        const copy = { ...prev };
        delete copy[matchId];
        return copy;
      });
      alert(error.response?.data?.error || 'Failed to save knockout result');
    }
  };

  // --- Canvas drawing (same as KnockoutCanvas) ---
  const drawBracket = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || roundOf32Teams.length === 0) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    const baseX = 100;
    const baseY = 100;
    const cardW = 220;
    const cardH = 140;
    const colGap = 240;
    const rowGap = 180;

    const boxes = [];

    const drawMatch = (x, y, matchId, label, teams, winnerId, isFinal = false) => {
      const h = teams.length > 0 ? cardH : 100;

      if (isFinal) {
        ctx.fillStyle = 'rgba(245,158,11,0.15)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
      } else if (winnerId) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 2;
      }

      ctx.beginPath();
      ctx.roundRect(x, y, cardW, h, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isFinal ? '#f59e0b' : (winnerId ? '#10b981' : '#667eea');
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

          if (isWinner) {
            ctx.fillStyle = '#d1fae5';
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(x + 10, ty - 20, cardW - 20, 40, 6);
            ctx.fill();
            ctx.stroke();
          } else if (isHovered) {
            ctx.fillStyle = '#e0f2fe';
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(x + 10, ty - 20, cardW - 20, 40, 6);
            ctx.fill();
            ctx.stroke();
          }

          const flag = flagImages[team.fifa_code];
          if (flag) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(x + 24, ty, 10, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(flag, x + 14, ty - 10, 20, 20);
            ctx.restore();
          }

          ctx.fillStyle = isWinner ? '#065f46' : (isHovered ? '#0369a1' : '#1f2937');
          ctx.font = isWinner || isHovered ? 'bold 15px Arial' : '15px Arial';
          ctx.textAlign = 'left';
          const name = team.name.length > 16 ? team.name.slice(0, 14) + '...' : team.name;
          ctx.fillText(name, x + 40, ty + 4);

          if (isWinner) {
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText('✓', x + cardW - 14, ty);
            ctx.textBaseline = 'alphabetic';
          }

          boxes.push({ matchId, teamId: team.id, x: x + 10, y: ty - 20, w: cardW - 20, h: 40 });
        });
      }

      boxes.push({ matchId, x, y, w: cardW, h, isCard: true });
    };

    const drawConnection = (x1, y1, x2, y2) => {
      const midX = (x1 + x2) / 2;
      ctx.strokeStyle = '#9ca3af';
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
      const t = getMatchTeams(i);
      drawMatch(baseX, y, i, `M${i}`, t, predictions[i]);
      r32LeftPos.push({ x: baseX + cardW, y: y + cardH / 2 });
      y += rowGap;
    }

    // LEFT - R16
    y = baseY + rowGap / 2;
    const r16LeftPos = [];
    for (let i = 17; i <= 20; i++) {
      const t = getMatchTeams(i);
      drawMatch(baseX + colGap, y, i, `M${i}`, t, predictions[i]);
      r16LeftPos.push({ x: baseX + colGap + cardW, y: y + cardH / 2 });
      y += rowGap * 2;
    }

    for (let i = 0; i < 4; i++) {
      drawConnection(r32LeftPos[i * 2].x, r32LeftPos[i * 2].y, r16LeftPos[i].x - cardW, r16LeftPos[i].y);
      drawConnection(r32LeftPos[i * 2 + 1].x, r32LeftPos[i * 2 + 1].y, r16LeftPos[i].x - cardW, r16LeftPos[i].y);
    }

    // LEFT - QF
    y = baseY + rowGap * 1.5;
    const qfLeftPos = [];
    for (let i = 25; i <= 26; i++) {
      const t = getMatchTeams(i);
      drawMatch(baseX + colGap * 2, y, i, `QF${i - 24}`, t, predictions[i]);
      qfLeftPos.push({ x: baseX + colGap * 2 + cardW, y: y + cardH / 2 });
      y += rowGap * 4;
    }

    for (let i = 0; i < 2; i++) {
      drawConnection(r16LeftPos[i * 2].x, r16LeftPos[i * 2].y, qfLeftPos[i].x - cardW, qfLeftPos[i].y);
      drawConnection(r16LeftPos[i * 2 + 1].x, r16LeftPos[i * 2 + 1].y, qfLeftPos[i].x - cardW, qfLeftPos[i].y);
    }

    // LEFT - SF
    const sf1Y = baseY + rowGap * 3.5;
    const teams29 = getMatchTeams(29);
    drawMatch(baseX + colGap * 3, sf1Y, 29, 'SF1', teams29, predictions[29]);
    const sf1Pos = { x: baseX + colGap * 3 + cardW, y: sf1Y + cardH / 2 };
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
      ctx.fillText('🏆 CHAMPION', finalX + cardW / 2, finalY - 45);
      ctx.font = 'bold 20px Arial';
      ctx.fillText(finalWinner.name, finalX + cardW / 2, finalY - 18);
    }

    drawMatch(finalX, finalY, 31, 'FINAL', finalTeams, predictions[31], true);
    const finalPos = { x: finalX + cardW, y: finalY + cardH / 2 };
    drawConnection(sf1Pos.x, sf1Pos.y, finalX, finalPos.y);

    // RIGHT - SF2
    const sf2Y = baseY + rowGap * 3.5;
    const teams30 = getMatchTeams(30);
    drawMatch(baseX + colGap * 5, sf2Y, 30, 'SF2', teams30, predictions[30]);
    const sf2Pos = { x: baseX + colGap * 5, y: sf2Y + cardH / 2 };
    drawConnection(finalPos.x, finalPos.y, sf2Pos.x, sf2Pos.y);

    // RIGHT - QF
    y = baseY + rowGap * 1.5;
    const qfRightPos = [];
    for (let i = 27; i <= 28; i++) {
      const t = getMatchTeams(i);
      drawMatch(baseX + colGap * 6, y, i, `QF${i - 24}`, t, predictions[i]);
      qfRightPos.push({ x: baseX + colGap * 6, y: y + cardH / 2 });
      y += rowGap * 4;
    }
    drawConnection(sf2Pos.x + cardW, sf2Pos.y, qfRightPos[0].x, qfRightPos[0].y);
    drawConnection(sf2Pos.x + cardW, sf2Pos.y, qfRightPos[1].x, qfRightPos[1].y);

    // RIGHT - R16
    y = baseY + rowGap / 2;
    const r16RightPos = [];
    for (let i = 21; i <= 24; i++) {
      const t = getMatchTeams(i);
      drawMatch(baseX + colGap * 7, y, i, `M${i}`, t, predictions[i]);
      r16RightPos.push({ x: baseX + colGap * 7, y: y + cardH / 2 });
      y += rowGap * 2;
    }

    for (let i = 0; i < 2; i++) {
      drawConnection(qfRightPos[i].x + cardW, qfRightPos[i].y, r16RightPos[i * 2].x, r16RightPos[i * 2].y);
      drawConnection(qfRightPos[i].x + cardW, qfRightPos[i].y, r16RightPos[i * 2 + 1].x, r16RightPos[i * 2 + 1].y);
    }

    // RIGHT - R32
    y = baseY;
    const r32RightPos = [];
    for (let i = 9; i <= 16; i++) {
      const t = getMatchTeams(i);
      drawMatch(baseX + colGap * 8, y, i, `M${i}`, t, predictions[i]);
      r32RightPos.push({ x: baseX + colGap * 8, y: y + cardH / 2 });
      y += rowGap;
    }

    for (let i = 0; i < 4; i++) {
      drawConnection(r16RightPos[i].x + cardW, r16RightPos[i].y, r32RightPos[i * 2].x, r32RightPos[i * 2].y);
      drawConnection(r16RightPos[i].x + cardW, r16RightPos[i].y, r32RightPos[i * 2 + 1].x, r32RightPos[i * 2 + 1].y);
    }

    ctx.restore();
    matchBoxesRef.current = boxes;
  }, [camera, predictions, roundOf32Teams, hoveredTeam, flagImages]);

  useEffect(() => {
    if (!loading) drawBracket();
  }, [drawBracket, loading]);

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
    setDragDistance(0);
    setDragStart({ x: e.clientX - camera.x, y: e.clientY - camera.y });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setDragDistance(Math.sqrt(Math.pow(newX - camera.x, 2) + Math.pow(newY - camera.y, 2)));
      setCamera(prev => ({ ...prev, x: newX, y: newY }));
    } else {
      const pos = getMousePos(e);
      let foundTeam = null;
      for (const box of matchBoxesRef.current) {
        if (pos.x >= box.x && pos.x <= box.x + box.w &&
            pos.y >= box.y && pos.y <= box.y + box.h && box.teamId) {
          foundTeam = { matchId: box.matchId, teamId: box.teamId };
          break;
        }
      }
      setHoveredTeam(foundTeam);
      canvasRef.current.style.cursor = foundTeam ? 'pointer' : (isDragging ? 'grabbing' : 'grab');
    }
  };

  const handleMouseUp = (e) => {
    const wasDragging = dragDistance > 5;
    setIsDragging(false);
    setDragDistance(0);
    if (wasDragging) return;

    const pos = getMousePos(e);
    for (const box of matchBoxesRef.current) {
      if (box.teamId &&
          pos.x >= box.x && pos.x <= box.x + box.w &&
          pos.y >= box.y && pos.y <= box.y + box.h) {
        handleMatchSelect(box.matchId, box.teamId);
        break;
      }
    }
  };

  // Wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.4, Math.min(3, camera.zoom * delta));
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldX = (mouseX - camera.x) / camera.zoom;
      const worldY = (mouseY - camera.y) / camera.zoom;
      setCamera({ x: mouseX - worldX * newZoom, y: mouseY - worldY * newZoom, zoom: newZoom });
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [camera]);

  const handleZoomIn = () => setCamera(prev => ({ ...prev, zoom: Math.min(3, prev.zoom * 1.2) }));
  const handleZoomOut = () => setCamera(prev => ({ ...prev, zoom: Math.max(0.4, prev.zoom / 1.2) }));
  const handleResetView = () => setCamera({ x: 0, y: 0, zoom: 1 });

  if (loading) {
    return (
      <div className="knockout-results">
        <Card>
          <div className="loading-state">
            <div className="spinner-icon"></div>
            <p>Loading knockout bracket...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (roundOf32Teams.length === 0) {
    return (
      <div className="knockout-results">
        <Card>
          <h3>⚠️ Prerequisites Not Complete</h3>
          <p className="error-message">
            Please complete all 12 group stage rankings and select 8 third-place advancers before viewing the knockout bracket.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="knockout-results">
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
            <button onClick={handleZoomIn} title="Zoom In">+</button>
            <button onClick={handleZoomOut} title="Zoom Out">−</button>
            <button onClick={handleResetView} title="Reset View">⟲</button>
            <span className="zoom-level">{Math.round(camera.zoom * 100)}%</span>
          </div>
        </div>
        <div className="bracket-instructions">
          <p>🖱️ Click a team to set as winner | 🖐️ Drag to pan | 🔍 Scroll to zoom</p>
        </div>
      </div>
    </div>
  );
};
