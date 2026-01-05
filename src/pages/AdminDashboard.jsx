import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../api/adminApi';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { UserManagement } from '../components/Admin/UserManagement';
import { TeamManagement } from '../components/Admin/TeamManagement';
import { SettingsManagement } from '../components/Admin/SettingsManagement';
import { ActualResults } from '../components/Admin/ActualResults';
import { AuditLogs } from '../components/Admin/AuditLogs';
import './AdminDashboard.css';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      // Try to fetch admin data to verify access
      await adminAPI.getSettings();
      setIsAdmin(true);
    } catch (error) {
      console.error('Admin access denied:', error);
      navigate('/predictions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-icon"></div>
        <p>Verifying admin access...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const tabs = [
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'teams', label: 'Teams', icon: '⚽' },
    { id: 'results', label: 'Actual Results', icon: '🏆' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'logs', label: 'Audit Logs', icon: '📋' }
  ];

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="admin-header-content">
          <h1>🛡️ Admin Dashboard</h1>
          <p>Welcome back, <strong>{user?.username}</strong></p>
        </div>
        <Button onClick={() => navigate('/predictions')} variant="outline">
          ← Back to Predictions
        </Button>
      </div>

      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="admin-content">
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'teams' && <TeamManagement />}
        {activeTab === 'results' && <ActualResults />}
        {activeTab === 'settings' && <SettingsManagement />}
        {activeTab === 'logs' && <AuditLogs />}
      </div>
    </div>
  );
};
