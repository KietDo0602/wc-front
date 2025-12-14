import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/users/register', data),
  login: (data) => api.post('/users/login', data),
  getProfile: () => api.get('/users/profile'),
  completeGoogleSignup: (data, tempToken) => 
  api.post('/users/auth/google/complete-signup', data, {
    headers: { Authorization: `Bearer ${tempToken}` }
  }),
};

// Prediction APIs
export const predictionAPI = {
  getUserPredictions: (userId) => api.get(`/predictions/user/${userId}`),
  getStatus: () => api.get('/predictions/status'),
  getCompleteness: () => api.get('/predictions/completeness'),
  getMyPredictions: () => api.get('/predictions/my-predictions'),
  getTeams: () => api.get('/predictions/teams'),
  getTeamsByGroup: (groupId) => api.get(`/predictions/teams/group/${groupId}`),
  getMatches: (round) => api.get('/predictions/matches', { params: { round } }),
  
  submitGroupRankings: (groupId, rankings) => 
    api.post(`/predictions/groups/${groupId}/rankings`, { groupId, rankings }),
  
  submitThirdPlace: (teamIds) => 
    api.post('/predictions/third-place', { teamIds }),
  
  submitMatchPrediction: (matchId, predictedWinnerTeamId) => 
    api.post(`/predictions/matches/${matchId}`, { predictedWinnerTeamId }),
  
  submitBracketPredictions: (predictions) => 
    api.post('/predictions/bracket', { predictions }),
  
  submitComplete: () => api.post('/predictions/submit'),
};

// Leaderboard APIs
export const leaderboardAPI = {
  getActive: () => api.get('/leaderboard/active'),
  getLeaderboard: () => api.get('/leaderboard'),
  getMyRank: () => api.get('/leaderboard/my-rank'),
};

export default api;
