import { data } from './third_place_matchup';


// FIFA code to ISO 3166-1 alpha-2 country code mapping
export const getFlagCode = (fifaCode) => {
  const flagMap = {
    // CONCACAF
    'MEX': 'mx',
    'CAN': 'ca',
    'JAM': 'jm',
    'HON': 'hn',
    'USA': 'us',
    'CRC': 'cr',
    'PAN': 'pa',
    'SLV': 'sv',
    
    // CONMEBOL
    'BRA': 'br',
    'ARG': 'ar',
    'URU': 'uy',
    'COL': 'co',
    'ECU': 'ec',
    'PER': 'pe',
    'CHI': 'cl',
    'PAR': 'py',
    
    // UEFA
    'ENG': 'gb-eng', // England
    'FRA': 'fr',
    'ESP': 'es',
    'GER': 'de',
    'ITA': 'it',
    'POR': 'pt',
    'NED': 'nl',
    'BEL': 'be',
    'CRO': 'hr',
    'DEN': 'dk',
    'SUI': 'ch',
    'SWE': 'se',
    'POL': 'pl',
    'UKR': 'ua',
    'AUT': 'at',
    'CZE': 'cz',
    'SCO': 'gb-sct',
    'NOR': 'no',
    'MKD': 'mk',
    'IRL': 'ie',
    'BIH': 'ba',
    'NIR': 'gb-nir',
    'WAL': 'gb-wls',
    "KVX": 'xk',
    "ROU": 'ro',
    "SVK": 'sk',
    "TUR": 'tr',
    "ALB": 'al',
    
    // AFC
    'JPN': 'jp',
    'KOR': 'kr',
    'AUS': 'au',
    'KSA': 'sa',
    'IRN': 'ir',
    'IRQ': 'iq',
    'QAT': 'qa',
    'UAE': 'ae',
    'JOR': 'jo',
    'UZB': 'uz',
    
    'HAI': 'ht',
    'CUW': 'cw',
    'NZL': 'nz',
    'CPV': 'cv',

    // CAF
    'MAR': 'ma',
    'SEN': 'sn',
    'NGA': 'ng',
    'EGY': 'eg',
    'CMR': 'cm',
    'GHA': 'gh',
    'TUN': 'tn',
    'DZA': 'dz',
    'RSA': 'za',
    'CIV': 'ci',

    "BOL": 'bo', 
    "SUR": 'sr', 
    "COD": 'cd',
    "NCL": 'nc',
  };
  
  return flagMap[fifaCode] || null;
};

// Component to render flag
export const FlagIcon = ({ fifaCode, size = 'normal' }) => {
  const countryCode = getFlagCode(fifaCode);
  
  if (!countryCode) {
    return <span className={`placeholder-icon ${size}`}>🌐</span>;
  }
  
  const sizeClass = size === 'large' ? 'fi-flag-large' : size === 'small' ? 'fi-flag-small' : 'fi-flag-normal';
  
  return <span className={`fi fi-${countryCode} ${sizeClass}`}></span>;
};

export const getLocalFlagUrl = (fifaCode) => {
  const iso = getFlagCode(fifaCode);
  if (!iso) return null;

  try {
    return new URL(
      `../../node_modules/flag-icons/flags/4x3/${iso}.svg`,
      import.meta.url
    ).href;
  } catch {
    return null;
  }
};


export const getLanguageFlagCode = (languageCode) => {
  const langFlagMap = {
    'en': 'gb-eng', // English -> USA flag
    'es': 'es', // Spanish -> Spain flag
    'fr': 'fr', // French -> France flag
    'vi': 'vn', // Vietnamese -> Vietnam flag
    'cn': 'cn', // Chinese -> Chinese flag
    'pt': 'br', // Portugese -> Brazil flag
    'ar': 'sa', // Arabic -> Saudi Arabia flag
    'de': 'de', // German -> Germany flag
    'it': 'it', // Italian -> Italy flag
    'ja': 'jp', // Japanese -> Japan flag
    'ko': 'kr', // Korea -> Korean flag
    'tr': 'tr', // Turkish -> Turkey flag
    'in': 'in', // Hindi -> India flag
    'th': 'th', // Thai -> Thailand flag
  };
  
  return langFlagMap[languageCode] || 'us';
};

// Language Flag Component
export const LanguageFlag = ({ languageCode, size = 'normal' }) => {
  const countryCode = getLanguageFlagCode(languageCode);
  const sizeClass = size === 'small' ? 'fi-lang-small' : 'fi-lang-normal';
  
  return <span className={`fi fi-${countryCode} ${sizeClass}`}></span>;
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


export const countryNames = {
  // CONCACAF
  MEX: "Mexico",
  CAN: "Canada",
  JAM: "Jamaica",
  HON: "Honduras",
  USA: "United States",
  CRC: "Costa Rica",
  PAN: "Panama",
  SLV: "El Salvador",

  // CONMEBOL
  BRA: "Brazil",
  ARG: "Argentina",
  URU: "Uruguay",
  COL: "Colombia",
  ECU: "Ecuador",
  PER: "Peru",
  CHI: "Chile",
  PAR: "Paraguay",

  // UEFA
  ENG: "England",
  FRA: "France",
  ESP: "Spain",
  GER: "Germany",
  ITA: "Italy",
  POR: "Portugal",
  NED: "Netherlands",
  BEL: "Belgium",
  CRO: "Croatia",
  DEN: "Denmark",
  SUI: "Switzerland",
  SWE: "Sweden",
  POL: "Poland",
  UKR: "Ukraine",
  AUT: "Austria",
  CZE: "Czech Republic",
  SCO: "Scotland",
  NOR: "Norway",
  MKD: "North Macedonia",
  IRL: "Ireland",
  BIH: "Bosnia",
  NIR: "Northern Ireland",
  WAL: "Wales",
  KVX: "Kosovo",
  ROU: "Romania",
  SVK: "Slovakia",
  TUR: "Turkey",
  ALB: "Albania",

  // AFC
  JPN: "Japan",
  KOR: "South Korea",
  AUS: "Australia",
  KSA: "Saudi Arabia",
  IRN: "Iran",
  IRQ: "Iraq",
  QAT: "Qatar",
  UAE: "United Arab Emirates",
  JOR: "Jordan",
  UZB: "Uzbekistan",

  // Extra (CONCACAF + OFC)
  HAI: "Haiti",
  CUW: "Curaçao",
  NZL: "New Zealand",
  CPV: "Cape Verde",

  // CAF
  MAR: "Morocco",
  SEN: "Senegal",
  NGA: "Nigeria",
  EGY: "Egypt",
  CMR: "Cameroon",
  GHA: "Ghana",
  TUN: "Tunisia",
  DZA: "Algeria",
  RSA: "South Africa",
  CIV: "Ivory Coast",

  // Others
  BOL: "Bolivia",
  SUR: "Suriname",
  COD: "Congo DR",
  NCL: "New Caledonia"
};
