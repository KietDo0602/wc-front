import { data } from './third_place_matchup';

// FIFA code to flag emoji mapping
export const getFlagEmoji = (fifaCode) => {
  const flagMap = {
    // CONCACAF
    'MEX': '🇲🇽',
    'CAN': '🇨🇦',
    'JAM': '🇯🇲',
    'HON': '🇭🇳',
    'USA': '🇺🇸',
    'CRC': '🇨🇷',
    'PAN': '🇵🇦',
    'SLV': '🇸🇻',
    
    // CONMEBOL
    'BRA': '🇧🇷',
    'ARG': '🇦🇷',
    'URU': '🇺🇾',
    'COL': '🇨🇴',
    'ECU': '🇪🇨',
    'PER': '🇵🇪',
    'CHI': '🇨🇱',
    'PAR': '🇵🇾',
    
    // UEFA
    'ENG': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'FRA': '🇫🇷',
    'ESP': '🇪🇸',
    'GER': '🇩🇪',
    'ITA': '🇮🇹',
    'POR': '🇵🇹',
    'NED': '🇳🇱',
    'BEL': '🇧🇪',
    'CRO': '🇭🇷',
    'DEN': '🇩🇰',
    'SUI': '🇨🇭',
    'SWE': '🇸🇪',
    'POL': '🇵🇱',
    'UKR': '🇺🇦',
    'AUT': '🇦🇹',
    'CZE': '🇨🇿',
    
    // AFC
    'JPN': '🇯🇵',
    'KOR': '🇰🇷',
    'AUS': '🇦🇺',
    'KSA': '🇸🇦',
    'IRN': '🇮🇷',
    'IRQ': '🇮🇶',
    'QAT': '🇶🇦',
    'UAE': '🇦🇪',
    
    // CAF
    'MAR': '🇲🇦',
    'SEN': '🇸🇳',
    'NGA': '🇳🇬',
    'EGY': '🇪🇬',
    'CMR': '🇨🇲',
    'GHA': '🇬🇭',
    'TUN': '🇹🇳',
    'ALG': '🇩🇿',
  };
  
  return flagMap[fifaCode] || '🌐'; // Globe for unknown/placeholder
};

// Format date helper
export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Format date with time
export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Check if deadline has passed
export const isDeadlinePassed = (deadline) => {
  if (!deadline) return false;
  return new Date() > new Date(deadline);
};

// Calculate accuracy percentage
export const calculateAccuracy = (correct, total) => {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
};

// Group teams by group
export const groupTeamsByGroup = (teams) => {
  return teams.reduce((groups, team) => {
    const groupId = team.group_id;
    if (!groups[groupId]) {
      groups[groupId] = {
        id: groupId,
        code: team.group_code,
        teams: []
      };
    }
    groups[groupId].teams.push(team);
    return groups;
  }, {});
};

// Get knockout round name
export const getRoundName = (round) => {
  const names = {
    'R32': 'Round of 32',
    'R16': 'Round of 16',
    'QF': 'Quarter Finals',
    'SF': 'Semi Finals',
    'F': 'Final',
    '3P': 'Third Place Match'
  };
  return names[round] || round;
};

// Validate predictions completeness
export const validatePredictions = (predictions) => {
  const errors = [];
  
  // Check group rankings (should have 12 groups with 4 teams each)
  const groups = predictions.groupRankings || [];
  const groupIds = [...new Set(groups.map(g => g.group_id))];
  
  if (groupIds.length < 12) {
    errors.push(`Only ${groupIds.length} of 12 groups completed`);
  }
  
  // Check third place selections (should be exactly 8)
  const thirdPlace = predictions.thirdPlaceSelections || [];
  if (thirdPlace.length !== 8) {
    errors.push(`Third place selections: ${thirdPlace.length}/8`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Get the correct matchups based on the third place teams
export function findMatchingElement(teams) {
  // Step 1: collect all groupIds from teams
  const groupIds = teams.map(team => team.groupId);

  // Step 2: turn groupIds into a Set for fast lookup
  const groupSet = new Set(groupIds);

  // Step 3: iterate over data and check if values match groupIds exactly
  return data.find(obj => {
    const values = Object.values(obj);

    // Must have same length
    if (values.length !== groupSet.size) return false;

    // Must contain all groupIds
    const valueSet = new Set(values);
    if (valueSet.size !== groupSet.size) return false;

    for (let id of groupSet) {
      if (!valueSet.has(id)) return false;
    }
    return true;
  });
}

export const getThirdPlaceMatchup = (thirdPlaceTeams, opp_group_id) => {
  const matchup = findMatchingElement(thirdPlaceTeams);

  return matchup[opp_group_id];
}

// Local storage helpers
export const storage = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },
  
  clear: () => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
};
