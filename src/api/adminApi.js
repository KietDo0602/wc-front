import api from './api';

export const adminAPI = {
  // User Management
  getAllUsers: (params) => api.get('/admin/users', { params }),
  getUserDetails: (userId) => api.get(`/admin/users/${userId}`),
  getUserPredictions: (userId) => api.get(`/admin/users/${userId}/predictions`),
  banUser: (userId, reason) => api.post(`/admin/users/${userId}/ban`, { reason }),
  unbanUser: (userId) => api.post(`/admin/users/${userId}/unban`),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),

  // Team Management
  getAllTeams: () => api.get('/admin/teams'),
  updateTeam: (teamId, data) => api.patch(`/admin/teams/${teamId}`, data),

  // Settings Management
  getSettings: () => api.get('/admin/settings'),
  updateSetting: (key, value) => api.patch(`/admin/settings/${key}`, { value }),

  // Actual Results Management
  getActualGroupRankings: (groupId) => api.get(`/admin/actual-results/groups/${groupId}`),
  updateActualGroupRankings: (groupId, rankings) => 
    api.post(`/admin/actual-results/groups/${groupId}`, { rankings }),
  updateActualThirdPlace: (teamIds) => 
    api.post('/admin/actual-results/third-place', { teamIds }),
  updateActualKnockoutResult: (matchId, winnerTeamId) => 
    api.post(`/admin/actual-results/knockout/${matchId}`, { winner_team_id: winnerTeamId }),

  // Audit Logs
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params })
};
