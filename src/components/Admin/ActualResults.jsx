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
  const [knockoutMatches, setKnockoutMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Only load teams for now
      const teamsRes = await predictionAPI.getTeams();

      // Group teams by group_id
      const teamsData = teamsRes.data.teams;
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
      
      // Try to load matches, but don't fail if they don't work
      try {
        const matchesRes = await predictionAPI.getKnockoutMatches();
        const matches = matchesRes.data?.matches || matchesRes.data || [];
        setKnockoutMatches(matches);
      } catch (matchError) {
        console.warn('Could not load matches:', matchError);
        // Set empty array so knockout tab can still be accessed
        setKnockoutMatches([]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load teams data');
    } finally {
      setLoading(false);
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
        {activeTab === 'knockout' && <KnockoutResults matches={knockoutMatches} teams={teams} />}
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
  const thirdPlaceTeams = teams.filter(t => t.group_id); // Teams in groups

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
      alert('Failed to save third place selections');
    }
  };

  return (
    <div className="third-place-results">
      <Card>
        <h3>Select the 8 Third-Place Teams that Advanced</h3>
        <p className="instruction">
          Select exactly 8 teams (one 3rd place team from each group that advanced to Round of 16)
        </p>

        <div className="selection-counter">
          <span className="counter">{selectedTeams.length} / 8 teams selected</span>
        </div>

        <div className="teams-grid">
          {Object.entries(
            thirdPlaceTeams.reduce((acc, team) => {
              const groupCode = team.group_code;
              if (!acc[groupCode]) acc[groupCode] = [];
              acc[groupCode].push(team);
              return acc;
            }, {})
          ).sort().map(([groupCode, groupTeams]) => (
            <div key={groupCode} className="group-teams">
              <h4>Group {groupCode}</h4>
              <div className="team-options">
                {groupTeams.map(team => (
                  <div
                    key={team.id}
                    className={`team-option ${selectedTeams.includes(team.id) ? 'selected' : ''}`}
                    onClick={() => toggleTeam(team.id)}
                  >
                    <FlagIcon fifaCode={team.fifa_code} size="small" />
                    <span>{team.name}</span>
                    {selectedTeams.includes(team.id) && <span className="check-mark">✓</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="card-actions">
          <Button 
            onClick={handleSave}
            disabled={selectedTeams.length !== 8}
          >
            💾 Save Third Place Selections
          </Button>
        </div>
      </Card>
    </div>
  );
};

// Knockout Results Sub-component
const KnockoutResults = ({ matches, teams }) => {
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [winnerId, setWinnerId] = useState('');

  const groupedMatches = matches.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {});

  const roundOrder = ['round_of_16', 'quarter_finals', 'semi_finals', 'third_place', 'final'];

  const handleMatchSelect = (match) => {
    setSelectedMatch(match);
    setWinnerId('');
  };
  const handleSave = async () => {
    if (!selectedMatch || !winnerId) {
      alert('Please select a winner');
      return;
    }
    try {
      await adminAPI.updateActualKnockoutResult(selectedMatch.id, parseInt(winnerId));
      alert('Match result saved successfully!');
      setSelectedMatch(null);
      setWinnerId('');
    } catch (error) {
      console.error('Failed to save knockout result:', error);
      alert('Failed to save knockout result');
    }
  };

  return (
  <div className="knockout-results">
  <div className="rounds-list">
  {roundOrder.map(round => {
  const roundMatches = groupedMatches[round] || [];
  if (roundMatches.length === 0) return null;
        return (
          <Card key={round} className="round-card">
            <h3>{round.replace(/_/g, ' ').toUpperCase()}</h3>
            <div className="matches-grid">
              {roundMatches.sort((a, b) => a.match_number - b.match_number).map(match => (
                <button
                  key={match.id}
                  className={`match-button ${selectedMatch?.id === match.id ? 'active' : ''}`}
                  onClick={() => handleMatchSelect(match)}
                >
                  Match {match.match_number}
                </button>
              ))}
            </div>
          </Card>
        );
      })}
    </div>

    {selectedMatch && (
      <Card className="match-result-card">
        <h3>
          {selectedMatch.round.replace(/_/g, ' ').toUpperCase()} - Match {selectedMatch.match_number}
        </h3>
        <p className="instruction">Select the winning team</p>

        <div className="winner-selector">
          <div className="teams-selection">
            {teams.map(team => (
              <label key={team.id} className="team-radio">
                <input
                  type="radio"
                  name="winner"
                  value={team.id}
                  checked={winnerId === team.id.toString()}
                  onChange={(e) => setWinnerId(e.target.value)}
                />
                <FlagIcon fifaCode={team.fifa_code} size="normal" />
                <span>{team.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="card-actions">
          <Button onClick={handleSave} disabled={!winnerId}>
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
