import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api/adminApi';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { FlagIcon } from '../../utils/helpers';
import './TeamManagement.css';

export const TeamManagement = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTeam, setEditingTeam] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getAllTeams();
      setTeams(response.data.teams);
    } catch (error) {
      console.error('Failed to load teams:', error);
      alert('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (team) => {
    setEditingTeam(team.id);
    setFormData({
      name: team.name,
      fifa_code: team.fifa_code,
      group_id: team.group_id,
      eliminated: team.eliminated
    });
  };

  const handleCancel = () => {
    setEditingTeam(null);
    setFormData({});
  };

  const handleSave = async (teamId) => {
    try {
      await adminAPI.updateTeam(teamId, formData);
      alert('Team updated successfully');
      setEditingTeam(null);
      setFormData({});
      loadTeams();
    } catch (error) {
      console.error('Failed to update team:', error);
      alert('Failed to update team');
    }
  };

  const groupedTeams = teams.reduce((acc, team) => {
    const groupCode = team.group_code || 'No Group';
    if (!acc[groupCode]) acc[groupCode] = [];
    acc[groupCode].push(team);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner-icon"></div>
        <p>Loading teams...</p>
      </div>
    );
  }

  return (
    <div className="team-management">
      <div className="management-header">
        <h2>⚽ Team Management</h2>
        <p className="subtitle">Update team information and elimination status</p>
      </div>

      <div className="teams-grid">
        {Object.entries(groupedTeams).sort().map(([groupCode, groupTeams]) => (
          <Card key={groupCode} className="group-teams-card">
            <div className="group-header">
              <h3>Group {groupCode}</h3>
              <span className="team-count">{groupTeams.length} teams</span>
            </div>

            <div className="teams-list">
              {groupTeams.map(team => (
                <div key={team.id} className="team-item">
                  {editingTeam === team.id ? (
                    <div className="team-edit-form">
                      <div className="form-row">
                        <div className="form-group">
                          <label>Team Name</label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="form-input"
                          />
                        </div>
                        <div className="form-group">
                          <label>FIFA Code</label>
                          <input
                            type="text"
                            value={formData.fifa_code}
                            onChange={(e) => setFormData({ ...formData, fifa_code: e.target.value })}
                            className="form-input"
                            maxLength={3}
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={formData.eliminated}
                            onChange={(e) => setFormData({ ...formData, eliminated: e.target.checked })}
                          />
                          <span>Eliminated</span>
                        </label>
                      </div>

                      <div className="form-actions">
                        <Button size="small" onClick={() => handleSave(team.id)}>
                          Save
                        </Button>
                        <Button size="small" variant="outline" onClick={handleCancel}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="team-display">
                      <div className="team-info">
                        <FlagIcon fifaCode={team.fifa_code} size="normal" />
                        <div className="team-details">
                          <span className="team-name">{team.name}</span>
                          <span className="team-code">{team.fifa_code}</span>
                        </div>
                      </div>
                      <div className="team-status">
                        {team.eliminated && (
                          <span className="eliminated-badge">❌ Eliminated</span>
                        )}
                        <Button size="small" variant="outline" onClick={() => handleEdit(team)}>
                          Edit
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
