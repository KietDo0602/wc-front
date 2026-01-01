import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api/adminApi';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import './SettingsManagement.css';

export const SettingsManagement = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSetting, setEditingSetting] = useState(null);
  const [formValue, setFormValue] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getSettings();
      setSettings(response.data.settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      alert('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (setting) => {
    setEditingSetting(setting.key);
    setFormValue(setting.value);
  };

  const handleCancel = () => {
    setEditingSetting(null);
    setFormValue('');
  };

  const handleSave = async (key) => {
    try {
      await adminAPI.updateSetting(key, formValue);
      alert('Setting updated successfully');
      setEditingSetting(null);
      setFormValue('');
      loadSettings();
    } catch (error) {
      console.error('Failed to update setting:', error);
      alert('Failed to update setting');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const isDeadlinePassed = (dateString) => {
    return new Date(dateString) < new Date();
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner-icon"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="settings-management">
      <div className="management-header">
        <h2>⚙️ Settings Management</h2>
        <p className="subtitle">Configure prediction deadlines and global settings</p>
      </div>

      <div className="settings-grid">
        {settings.map(setting => (
          <Card key={setting.key} className="setting-card">
            <div className="setting-header">
              <div className="setting-info">
                <h3 className="setting-key">{setting.key.replace(/_/g, ' ').toUpperCase()}</h3>
                <p className="setting-description">{setting.description}</p>
              </div>
              {setting.key.includes('deadline') && isDeadlinePassed(setting.value) && (
                <span className="deadline-badge deadline-passed">⏰ Passed</span>
              )}
              {setting.key.includes('deadline') && !isDeadlinePassed(setting.value) && (
                <span className="deadline-badge deadline-active">✓ Active</span>
              )}
            </div>

            {editingSetting === setting.key ? (
              <div className="setting-edit-form">
                <div className="form-group">
                  <label>
                    {setting.key.includes('deadline') ? 'Deadline (ISO 8601 format)' : 'Value'}
                  </label>
                  {setting.key.includes('deadline') ? (
                    <input
                      type="datetime-local"
                      value={formValue ? new Date(formValue).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setFormValue(new Date(e.target.value).toISOString())}
                      className="form-input"
                    />
                  ) : (
                    <input
                      type="text"
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value)}
                      className="form-input"
                    />
                  )}
                  <small className="form-help">
                    Current value: {setting.key.includes('deadline') ? formatDate(setting.value) : setting.value}
                  </small>
                </div>

                <div className="form-actions">
                  <Button size="small" onClick={() => handleSave(setting.key)}>
                    Save
                  </Button>
                  <Button size="small" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="setting-display">
                <div className="setting-value">
                  {setting.key.includes('deadline') ? (
                    <>
                      <div className="date-display">
                        <span className="date-large">{formatDate(setting.value)}</span>
                        <span className="time-remaining">
                          {isDeadlinePassed(setting.value) 
                            ? 'Deadline has passed' 
                            : `${Math.ceil((new Date(setting.value) - new Date()) / (1000 * 60 * 60 * 24))} days remaining`}
                        </span>
                      </div>
                    </>
                  ) : (
                    <span className="value-text">{setting.value}</span>
                  )}
                </div>
                <div className="setting-actions">
                  {setting && setting.val && (
                    <span className="updated-at">
                      Updated: {new Date(setting.val).toLocaleDateString()}
                    </span>
                  )}
                  <Button size="small" variant="outline" onClick={() => handleEdit(setting)}>
                    Edit
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="settings-info-card">
        <h3>ℹ️ About Deadlines</h3>
        <ul>
          <li>
            <strong>Prediction Deadline:</strong> Global deadline for all predictions. After this time, no changes can be made.
          </li>
          <li>
            <strong>Group Stage Deadline:</strong> Specific deadline for group stage predictions (rankings and third place selections).
          </li>
          <li>
            <strong>Knockout Stage Deadline:</strong> Specific deadline for knockout stage predictions.
          </li>
        </ul>
        <div className="warning-box">
          <strong>⚠️ Warning:</strong> Changing deadlines will affect all users. Make sure to announce changes to participants.
        </div>
      </Card>
    </div>
  );
};
