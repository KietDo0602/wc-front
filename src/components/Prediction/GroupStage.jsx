import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { predictionAPI } from '../../api/api';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import './GroupStage.css';

const SortableTeam = ({ team, position }) => {
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
      className={`sortable-team position-${position}`}
    >
      <span className="position-badge">{getPositionLabel(position)}</span>
      <span className="team-flag">{team.fifa_code}</span>
      <span className="team-name">{team.name}</span>
      <span className="drag-handle">⋮⋮</span>
    </div>
  );
};

const GroupCard = ({ group, teams, onRankingChange, savedRanking, viewMode }) => {
  const [rankedTeams, setRankedTeams] = useState(savedRanking || teams);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!savedRanking);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (savedRanking) {
      setRankedTeams(savedRanking);
      setSaved(true);
    }
  }, [savedRanking]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event) => {
    if (viewMode || (!isEditing && saved)) return;
    
    const { active, over } = event;

    if (active.id !== over.id) {
      setRankedTeams((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setSaved(false);
    }
  };

  const handleSave = async () => {
    if (viewMode) return;
    
    setSaving(true);
    try {
      await predictionAPI.submitGroupRankings(
        group.id,
        rankedTeams.map(t => t.id)
      );
      onRankingChange(group.id, rankedTeams);
      setSaved(true);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save ranking:', error);
      alert(error.response?.data?.error || 'Failed to save ranking');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setSaved(false);
  };

  const handleCancel = () => {
    setRankedTeams(savedRanking || teams);
    setIsEditing(false);
    setSaved(!!savedRanking);
  };

  const canDrag = !viewMode && (isEditing || !saved);

  return (
    <Card className="group-card">
      <div className="group-header">
        <h3>Group {group.code}</h3>
        {saved && !isEditing && <span className="saved-badge">✓ Saved</span>}
        {isEditing && <span className="editing-badge">✏️ Editing</span>}
      </div>
      
      {viewMode ? (
        <div className="teams-list">
          {rankedTeams.map((team, index) => (
            <div key={team.id} className={`sortable-team view-mode position-${index + 1}`}>
              <span className="position-badge">{['🥇 1st', '🥈 2nd', '🥉 3rd', '4th'][index]}</span>
              <span className="team-flag">{team.fifa_code}</span>
              <span className="team-name">{team.name}</span>
            </div>
          ))}
        </div>
      ) : canDrag ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={rankedTeams.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="teams-list">
              {rankedTeams.map((team, index) => (
                <SortableTeam key={team.id} team={team} position={index + 1} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="teams-list">
          {rankedTeams.map((team, index) => (
            <div key={team.id} className={`sortable-team locked position-${index + 1}`}>
              <span className="position-badge">{['🥇 1st', '🥈 2nd', '🥉 3rd', '4th'][index]}</span>
              <span className="team-flag">{team.fifa_code}</span>
              <span className="team-name">{team.name}</span>
            </div>
          ))}
        </div>
      )}

      {!viewMode && (
        <div className="card-actions">
          {saved && !isEditing ? (
            <Button 
              onClick={handleEdit} 
              size="small"
              variant="outline"
              className="edit-btn"
            >
              ✏️ Edit
            </Button>
          ) : (
            <>
              <Button 
                onClick={handleSave} 
                loading={saving}
                disabled={saved && !isEditing}
                size="small"
                variant="primary"
                className="save-btn"
              >
                💾 Save
              </Button>
              {isEditing && (
                <Button 
                  onClick={handleCancel} 
                  size="small"
                  variant="outline"
                  className="cancel-btn"
                >
                  ✕ Cancel
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
};

export const GroupStage = ({ onComplete, savedPredictions, viewMode }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rankings, setRankings] = useState({});

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (savedPredictions?.groupRankings) {
      const savedRankings = {};
      savedPredictions.groupRankings.forEach(ranking => {
        if (!savedRankings[ranking.group_id]) {
          savedRankings[ranking.group_id] = [];
        }
        savedRankings[ranking.group_id][ranking.position - 1] = {
          id: ranking.team_id,
          name: ranking.team_name,
          fifa_code: ranking.fifa_code
        };
      });
      setRankings(savedRankings);
    }
  }, [savedPredictions]);

  const loadGroups = async () => {
    try {
      const response = await predictionAPI.getTeams();
      const teamsData = response.data.teams;

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
          groupedTeams[team.group_id].teams.push({
            id: team.id,
            name: team.name,
            fifa_code: team.fifa_code
          });
        }
      });

      setGroups(Object.values(groupedTeams).sort((a, b) => a.id - b.id));
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRankingChange = (groupId, rankedTeams) => {
    setRankings(prev => ({
      ...prev,
      [groupId]: rankedTeams
    }));
  };

  const allGroupsRanked = groups.length > 0 && groups.every(group => rankings[group.id]);

  if (loading) {
    return <div className="loading-state">Loading groups...</div>;
  }

  return (
    <div className="group-stage">
      <div className="stage-header">
        <h2>Group Stage Predictions</h2>
        <p>
          {viewMode 
            ? 'Your group stage predictions' 
            : 'Drag and drop teams to predict the final ranking for each group'}
        </p>
      </div>

      <div className="groups-grid">
        {groups.map(group => (
          <GroupCard
            key={group.id}
            group={group}
            teams={group.teams}
            onRankingChange={handleRankingChange}
            savedRanking={rankings[group.id]}
            viewMode={viewMode}
          />
        ))}
      </div>

      {!viewMode && (
        <div className="stage-footer">
          <Button
            onClick={onComplete}
            disabled={!allGroupsRanked}
            size="large"
          >
            Continue to Third Place Selection →
          </Button>
          {!allGroupsRanked && (
            <p className="help-text">
              Complete all {groups.length} groups to continue
            </p>
          )}
        </div>
      )}
    </div>
  );
};
