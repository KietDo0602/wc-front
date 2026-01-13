import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api/adminApi';
import { predictionAPI } from '../../api/api';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { FlagIcon } from '../../utils/helpers';
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
const KnockoutResults = ({ bracket, teams, onUpdate }) => {
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [winnerId, setWinnerId] = useState('');
  const [loading, setLoading] = useState(false);

  // Convert bracket object to array and group by round
  const matches = Object.values(bracket);
  
  const groupedMatches = matches.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {});

  const roundOrder = ['R32', 'R16', 'QF', 'SF', 'F'];
  const roundNames = {
    'R32': 'Round of 32',
    'R16': 'Round of 16',
    'QF': 'Quarter Finals',
    'SF': 'Semi Finals',
    'F': 'Final'
  };

  const handleMatchSelect = (match) => {
    setSelectedMatch(match);
    setWinnerId(match.winner_id?.toString() || '');
  };

  const handleSave = async () => {
    if (!selectedMatch || !winnerId) {
      alert('Please select a winner');
      return;
    }

    setLoading(true);
    try {
      await adminAPI.updateActualKnockoutResult(selectedMatch.match_id, parseInt(winnerId));
      alert('Match result saved successfully!');
      
      // Reload bracket to show updated matches
      await onUpdate();
      
      setSelectedMatch(null);
      setWinnerId('');
    } catch (error) {
      console.error('Failed to save knockout result:', error);
      alert(error.response?.data?.error || 'Failed to save knockout result');
    } finally {
      setLoading(false);
    }
  };

  if (matches.length === 0) {
    return (
      <div className="knockout-results">
        <Card>
          <h3>⚠️ No Knockout Bracket Generated</h3>
          <p className="error-message">
            Please complete group stage and third place selections, then click "Generate Knockout Bracket" button above.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="knockout-results">
      <div className="rounds-list">
        {roundOrder.map(round => {
          const roundMatches = groupedMatches[round] || [];
          if (roundMatches.length === 0) return null;

          return (
            <Card key={round} className="round-card">
              <h3>{roundNames[round]}</h3>
              <div className="matches-grid">
                {roundMatches.sort((a, b) => a.match_id - b.match_id).map(match => (
                  <button
                    key={match.match_id}
                    className={`match-button ${selectedMatch?.match_id === match.match_id ? 'active' : ''} ${match.winner_id ? 'completed' : ''}`}
                    onClick={() => handleMatchSelect(match)}
                  >
                    <div className="match-info">
                      <div className="match-number">Match {match.match_id}</div>
                      <div className="match-teams">
                        <div className="match-team">
                          <FlagIcon fifaCode={match.team1_fifa_code} size="small" />
                          <span>{match.team1_name}</span>
                        </div>
                        <span className="vs">vs</span>
                        <div className="match-team">
                          <FlagIcon fifaCode={match.team2_fifa_code} size="small" />
                          <span>{match.team2_name}</span>
                        </div>
                      </div>
                      {match.winner_id && <span className="completed-badge">✓</span>}
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {selectedMatch && (
        <Card className="match-result-card">
          <h3>Match {selectedMatch.match_id} - {roundNames[selectedMatch.round]}</h3>
          <div className="match-teams-display">
            <div className="team-display">
              <FlagIcon fifaCode={selectedMatch.team1_fifa_code} size="large" />
              <span>{selectedMatch.team1_name}</span>
            </div>
            <span className="vs-large">VS</span>
            <div className="team-display">
              <FlagIcon fifaCode={selectedMatch.team2_fifa_code} size="large" />
              <span>{selectedMatch.team2_name}</span>
            </div>
          </div>
          
          <p className="instruction">Select the winning team</p>

          <div className="winner-selector">
            <label className={`team-radio ${winnerId === selectedMatch.team1_id.toString() ? 'selected' : ''}`}>
              <input
                type="radio"
                name="winner"
                value={selectedMatch.team1_id}
                checked={winnerId === selectedMatch.team1_id.toString()}
                onChange={(e) => setWinnerId(e.target.value)}
              />
              <FlagIcon fifaCode={selectedMatch.team1_fifa_code} size="normal" />
              <span>{selectedMatch.team1_name}</span>
            </label>

            <label className={`team-radio ${winnerId === selectedMatch.team2_id.toString() ? 'selected' : ''}`}>
              <input
                type="radio"
                name="winner"
                value={selectedMatch.team2_id}
                checked={winnerId === selectedMatch.team2_id.toString()}
                onChange={(e) => setWinnerId(e.target.value)}
              />
              <FlagIcon fifaCode={selectedMatch.team2_fifa_code} size="normal" />
              <span>{selectedMatch.team2_name}</span>
            </label>
          </div>

          <div className="card-actions">
            <Button onClick={handleSave} disabled={!winnerId || loading} loading={loading}>
              💾 Save Match Result
            </Button>
            <Button variant="outline" onClick={() => setSelectedMatch(null)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
