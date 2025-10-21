// src/team-config.js - Team branding and configuration
export const TEAM_CONFIGS = {
  // ==================== NCAA TEAMS ====================
  'stjohns': {
    name: "St. John's Red Storm",
    teamName: "St. John's",
    league: 'NCAA',
    conference: 'Big East',
    subdomain: 'stjohns',
    primaryColor: '#EE2737',
    secondaryColor: '#FFFFFF',
    accentColor: '#000000',
    logo: '/images/teams/stjohns.png',
    description: 'Experience the Red Storm at Madison Square Garden'
  },

  // ==================== NBA TEAMS ====================
  'timberwolves': {
    name: 'Minnesota Timberwolves',
    teamName: 'Timberwolves',
    league: 'NBA',
    subdomain: 'timberwolves',
    primaryColor: '#0C2340',
    secondaryColor: '#236192',
    accentColor: '#78BE20',
    logo: '/images/teams/timberwolves.png'
  },
  'warriors': {
    name: 'Golden State Warriors',
    teamName: 'Warriors',
    league: 'NBA',
    subdomain: 'warriors',
    primaryColor: '#1D428A',
    secondaryColor: '#FFC72C',
    accentColor: '#FFFFFF',
    logo: '/images/teams/warriors.png'
  },
  'celtics': {
    name: 'Boston Celtics',
    teamName: 'Celtics',
    league: 'NBA',
    subdomain: 'celtics',
    primaryColor: '#007A33',
    secondaryColor: '#BA9653',
    accentColor: '#FFFFFF',
    logo: '/images/teams/celtics.png'
  },
  'lakers': {
    name: 'Los Angeles Lakers',
    teamName: 'Lakers',
    league: 'NBA',
    subdomain: 'lakers',
    primaryColor: '#552583',
    secondaryColor: '#FDB927',
    accentColor: '#FFFFFF',
    logo: '/images/teams/lakers.png'
  },
  'suns': {
    name: 'Phoenix Suns',
    teamName: 'Suns',
    league: 'NBA',
    subdomain: 'suns',
    primaryColor: '#1D1160',
    secondaryColor: '#E56020',
    accentColor: '#F9AD1B',
    logo: '/images/teams/suns.png'
  },
  'thunder': {
    name: 'Oklahoma City Thunder',
    teamName: 'Thunder',
    league: 'NBA',
    subdomain: 'thunder',
    primaryColor: '#007AC1',
    secondaryColor: '#EF3B24',
    accentColor: '#FDBB30',
    logo: '/images/teams/thunder.png'
  }
};

// Default configuration (when no subdomain or unknown subdomain)
const DEFAULT_CONFIG = {
  name: 'Daps Bounty',
  league: 'ALL',
  subdomain: 'www',
  primaryColor: '#0A0A0B',
  secondaryColor: '#DAFA22',
  accentColor: '#64FA00',
  logo: '/images/Daps-2 Copy.png'
};

/**
 * Get team configuration based on hostname/subdomain
 * FIXED: Extract subdomain BEFORE checking for localhost
 */
export function getTeamConfig(hostname) {
  console.log('[team-config] Input hostname:', hostname);
  
  // Extract subdomain first (before any localhost checks)
  const parts = hostname.split('.');
  const subdomain = parts[0].toLowerCase();
  
  console.log('[team-config] Extracted subdomain:', subdomain);
  
  // Check if subdomain matches a team config
  if (TEAM_CONFIGS[subdomain]) {
    console.log('[team-config] ✓ Found team config for:', subdomain);
    return TEAM_CONFIGS[subdomain];
  }
  
  // If subdomain is 'localhost' or '127' (from 127.0.0.1), return default
  if (subdomain === 'localhost' || subdomain === '127') {
    console.log('[team-config] Using default config (localhost)');
    return DEFAULT_CONFIG;
  }
  
  // Unknown subdomain - return default
  console.log('[team-config] Unknown subdomain, using default');
  return DEFAULT_CONFIG;
}

/**
 * Get all team configs for a specific league
 */
export function getTeamsByLeague(league) {
  if (league === 'ALL') {
    return Object.values(TEAM_CONFIGS);
  }
  
  return Object.values(TEAM_CONFIGS).filter(team => team.league === league);
}

/**
 * Get team config by subdomain name
 */
export function getTeamBySubdomain(subdomain) {
  return TEAM_CONFIGS[subdomain.toLowerCase()] || null;
}