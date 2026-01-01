import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api/adminApi';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import './AuditLogs.css';

export const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [expandedLog, setExpandedLog] = useState(null);

  useEffect(() => {
    loadLogs();
  }, [page, actionFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getAuditLogs({
        page,
        limit: 50,
        action: actionFilter || undefined
      });
      setLogs(response.data.logs);
      setTotalPages(Math.ceil(response.data.total / response.data.limit));
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      alert('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (action) => {
    setActionFilter(action);
    setPage(1);
  };

  const getActionIcon = (action) => {
    const icons = {
      'BAN_USER': '🚫',
      'UNBAN_USER': '✅',
      'DELETE_USER': '🗑️',
      'UPDATE_TEAM': '⚽',
      'UPDATE_SETTING': '⚙️',
      'UPDATE_ACTUAL_GROUP_RANKINGS': '📊',
      'UPDATE_ACTUAL_THIRD_PLACE': '🥉',
      'UPDATE_ACTUAL_KNOCKOUT': '🏆'
    };
    return icons[action] || '📝';
  };

  const getActionColor = (action) => {
    const colors = {
      'BAN_USER': '#fee2e2',
      'UNBAN_USER': '#d1fae5',
      'DELETE_USER': '#fee2e2',
      'UPDATE_TEAM': '#e0e7ff',
      'UPDATE_SETTING': '#fef3c7',
      'UPDATE_ACTUAL_GROUP_RANKINGS': '#dbeafe',
      'UPDATE_ACTUAL_THIRD_PLACE': '#fce7f3',
      'UPDATE_ACTUAL_KNOCKOUT': '#fef3c7'
    };
    return colors[action] || '#f3f4f6';
  };

  const formatAction = (action) => {
    return action.replace(/_/g, ' ');
  };

  const toggleLogDetails = (logId) => {
    setExpandedLog(expandedLog === logId ? null : logId);
  };

  if (loading && logs.length === 0) {
    return (
      <div className="loading-state">
        <div className="spinner-icon"></div>
        <p>Loading audit logs...</p>
      </div>
    );
  }

  const actionTypes = [
    { value: '', label: 'All Actions' },
    { value: 'BAN_USER', label: 'Ban User' },
    { value: 'UNBAN_USER', label: 'Unban User' },
    { value: 'DELETE_USER', label: 'Delete User' },
    { value: 'UPDATE_TEAM', label: 'Update Team' },
    { value: 'UPDATE_SETTING', label: 'Update Setting' },
    { value: 'UPDATE_ACTUAL_GROUP_RANKINGS', label: 'Update Group Rankings' },
    { value: 'UPDATE_ACTUAL_THIRD_PLACE', label: 'Update Third Place' },
    { value: 'UPDATE_ACTUAL_KNOCKOUT', label: 'Update Knockout' }
  ];

  return (
    <div className="audit-logs">
      <div className="management-header">
        <h2>📋 Audit Logs</h2>
        <p className="subtitle">Track all administrative actions and changes</p>
      </div>

      <Card className="filters-card">
        <div className="filters">
          <label>Filter by Action:</label>
          <select
            value={actionFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="filter-select"
          >
            {actionTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <div className="logs-container">
        {logs.length === 0 ? (
          <Card>
            <div className="no-logs">
              <p>No audit logs found</p>
            </div>
          </Card>
        ) : (
          <div className="logs-list">
            {logs.map(log => (
              <Card key={log.id} className="log-card">
                <div className="log-header" onClick={() => toggleLogDetails(log.id)}>
                  <div className="log-main-info">
                    <span 
                      className="action-badge" 
                      style={{ background: getActionColor(log.action) }}
                    >
                      {getActionIcon(log.action)} {formatAction(log.action)}
                    </span>
                    <span className="admin-name">by {log.admin_username || 'System'}</span>
                  </div>
                  <div className="log-meta">
                    <span className="log-time">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                    <button className="expand-button">
                      {expandedLog === log.id ? '▼' : '▶'}
                    </button>
                  </div>
                </div>

                {expandedLog === log.id && (
                  <div className="log-details">
                    <div className="details-grid">
                      <div className="detail-item">
                        <label>Log ID:</label>
                        <span>{log.id}</span>
                      </div>
                      <div className="detail-item">
                        <label>Action:</label>
                        <span>{formatAction(log.action)}</span>
                      </div>
                      <div className="detail-item">
                        <label>Target Type:</label>
                        <span>{log.target_type}</span>
                      </div>
                      {log.target_id && (
                        <div className="detail-item">
                          <label>Target ID:</label>
                          <span>{log.target_id}</span>
                        </div>
                      )}
                      <div className="detail-item">
                        <label>Timestamp:</label>
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <div className="detail-item">
                        <label>Admin:</label>
                        <span>{log.admin_username || 'System'}</span>
                      </div>
                    </div>

                    {log.details && (
                      <div className="details-json">
                        <label>Details:</label>
                        <pre>{JSON.stringify(log.details, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="pagination">
        <Button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          variant="outline"
        >
          ← Previous
        </Button>
        <span className="page-info">
          Page {page} of {totalPages}
        </span>
        <Button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          variant="outline"
        >
          Next →
        </Button>
      </div>
    </div>
  );
};
