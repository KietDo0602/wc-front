import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api/adminApi';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { UserDetailsModal } from './UserDetailsModal';
import './UserManagement.css';

export const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [page, search]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getAllUsers({
        page,
        limit: 20,
        search,
        sortBy: 'created_at',
        order: 'DESC'
      });
      setUsers(response.data.users);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Failed to load users:', error);
      alert('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId, username) => {
    const reason = prompt(`Enter reason for banning ${username}:`);
    if (!reason) return;

    try {
      await adminAPI.banUser(userId, reason);
      alert('User banned successfully');
      loadUsers();
    } catch (error) {
      console.error('Failed to ban user:', error);
      alert('Failed to ban user');
    }
  };

  const handleUnbanUser = async (userId, username) => {
    if (!window.confirm(`Unban ${username}?`)) return;

    try {
      await adminAPI.unbanUser(userId);
      alert('User unbanned successfully');
      loadUsers();
    } catch (error) {
      console.error('Failed to unban user:', error);
      alert('Failed to unban user');
    }
  };

  const handleDeleteUser = async (userId, username) => {
    const confirmation = prompt(
      `⚠️ WARNING: This will permanently delete ${username} and all their predictions.\n\nType "${username}" to confirm:`
    );
    
    if (confirmation !== username) {
      alert('Deletion cancelled');
      return;
    }

    try {
      await adminAPI.deleteUser(userId);
      alert('User deleted successfully');
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
  };

  const handleViewUser = async (userId) => {
    try {
      const response = await adminAPI.getUserDetails(userId);
      setSelectedUser(response.data);
      setShowModal(true);
    } catch (error) {
      console.error('Failed to load user details:', error);
      alert('Failed to load user details');
    }
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  if (loading && users.length === 0) {
    return (
      <div className="loading-state">
        <div className="spinner-icon"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="management-header">
        <h2>👥 User Management</h2>
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by username or email..."
            value={search}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>
      </div>

      <Card>
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Predictions</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className={user.is_banned ? 'banned-user' : ''}>
                  <td>{user.id}</td>
                  <td>
                    <div className="user-cell">
                      <span className="username">{user.username}</span>
                      {user.role === 'admin' && (
                        <span className="badge badge-admin">Admin</span>
                      )}
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge role-${user.role}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    {user.is_banned ? (
                      <span className="status-badge status-banned">Banned</span>
                    ) : user.eliminated ? (
                      <span className="status-badge status-eliminated">Eliminated</span>
                    ) : (
                      <span className="status-badge status-active">Active</span>
                    )}
                  </td>
                  <td className="text-center">{user.prediction_count}</td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="action-buttons">
                      <Button
                        size="small"
                        variant="outline"
                        onClick={() => handleViewUser(user.id)}
                      >
                        View
                      </Button>
                      {user.role !== 'admin' && (
                        <>
                          {user.is_banned ? (
                            <Button
                              size="small"
                              variant="success"
                              onClick={() => handleUnbanUser(user.id, user.username)}
                            >
                              Unban
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              variant="warning"
                              onClick={() => handleBanUser(user.id, user.username)}
                            >
                              Ban
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="danger"
                            onClick={() => handleDeleteUser(user.id, user.username)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
      </Card>

      {showModal && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => {
            setShowModal(false);
            setSelectedUser(null);
          }}
          onRefresh={loadUsers}
        />
      )}
    </div>
  );
};
