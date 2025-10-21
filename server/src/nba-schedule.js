// src/nba-schedule.js - Fetch real NBA games
import fetch from 'node-fetch';

// NBA team mappings - ALL 30 TEAMS
// Team IDs from NBA.com API
export const TEAM_MAPPINGS = {
  // Atlantic Division
  'Celtics': { id: '1610612738', abbrev: 'BOS', fullName: 'Boston Celtics' },
  'Nets': { id: '1610612751', abbrev: 'BKN', fullName: 'Brooklyn Nets' },
  'Knicks': { id: '1610612752', abbrev: 'NYK', fullName: 'New York Knicks' },
  '76ers': { id: '1610612755', abbrev: 'PHI', fullName: 'Philadelphia 76ers' },
  'Raptors': { id: '1610612761', abbrev: 'TOR', fullName: 'Toronto Raptors' },
  
  // Central Division
  'Bulls': { id: '1610612741', abbrev: 'CHI', fullName: 'Chicago Bulls' },
  'Cavaliers': { id: '1610612739', abbrev: 'CLE', fullName: 'Cleveland Cavaliers' },
  'Pistons': { id: '1610612765', abbrev: 'DET', fullName: 'Detroit Pistons' },
  'Pacers': { id: '1610612754', abbrev: 'IND', fullName: 'Indiana Pacers' },
  'Bucks': { id: '1610612749', abbrev: 'MIL', fullName: 'Milwaukee Bucks' },
  
  // Southeast Division
  'Hawks': { id: '1610612737', abbrev: 'ATL', fullName: 'Atlanta Hawks' },
  'Hornets': { id: '1610612766', abbrev: 'CHA', fullName: 'Charlotte Hornets' },
  'Heat': { id: '1610612748', abbrev: 'MIA', fullName: 'Miami Heat' },
  'Magic': { id: '1610612753', abbrev: 'ORL', fullName: 'Orlando Magic' },
  'Wizards': { id: '1610612764', abbrev: 'WAS', fullName: 'Washington Wizards' },
  
  // Northwest Division
  'Nuggets': { id: '1610612743', abbrev: 'DEN', fullName: 'Denver Nuggets' },
  'Timberwolves': { id: '1610612750', abbrev: 'MIN', fullName: 'Minnesota Timberwolves' },
  'Thunder': { id: '1610612760', abbrev: 'OKC', fullName: 'Oklahoma City Thunder' },
  'Trail Blazers': { id: '1610612757', abbrev: 'POR', fullName: 'Portland Trail Blazers' },
  'Jazz': { id: '1610612762', abbrev: 'UTA', fullName: 'Utah Jazz' },
  
  // Pacific Division
  'Warriors': { id: '1610612744', abbrev: 'GSW', fullName: 'Golden State Warriors' },
  'Clippers': { id: '1610612746', abbrev: 'LAC', fullName: 'Los Angeles Clippers' },
  'Lakers': { id: '1610612747', abbrev: 'LAL', fullName: 'Los Angeles Lakers' },
  'Suns': { id: '1610612756', abbrev: 'PHX', fullName: 'Phoenix Suns' },
  'Kings': { id: '1610612758', abbrev: 'SAC', fullName: 'Sacramento Kings' },
  
  // Southwest Division
  'Mavericks': { id: '1610612742', abbrev: 'DAL', fullName: 'Dallas Mavericks' },
  'Rockets': { id: '1610612745', abbrev: 'HOU', fullName: 'Houston Rockets' },
  'Grizzlies': { id: '1610612763', abbrev: 'MEM', fullName: 'Memphis Grizzlies' },
  'Pelicans': { id: '1610612740', abbrev: 'NOP', fullName: 'New Orleans Pelicans' },
  'Spurs': { id: '1610612759', abbrev: 'SAS', fullName: 'San Antonio Spurs' }
};

// Helper function to normalize team names (handle variations)
function normalizeTeamName(teamName) {
  if (!teamName) return null;
  
  // Try exact match first
  if (TEAM_MAPPINGS[teamName]) {
    return teamName;
  }
  
  // Try case-insensitive match
  const lower = teamName.toLowerCase();
  for (const key of Object.keys(TEAM_MAPPINGS)) {
    if (key.toLowerCase() === lower) {
      return key;
    }
  }
  
  // Try matching full name
  for (const [key, value] of Object.entries(TEAM_MAPPINGS)) {
    if (value.fullName.toLowerCase() === lower) {
      return key;
    }
  }
  
  // Try matching abbreviation
  for (const [key, value] of Object.entries(TEAM_MAPPINGS)) {
    if (value.abbrev.toLowerCase() === lower) {
      return key;
    }
  }
  
  return null;
}

// Fetch schedule from NBA.com (free, no API key needed)
export async function fetchTeamSchedule(teamName) {
  const normalizedName = normalizeTeamName(teamName);
  const team = normalizedName ? TEAM_MAPPINGS[normalizedName] : null;
  
  if (!team) {
    console.log('[NBA-API] ❌ No mapping for team:', teamName);
    console.log('[NBA-API] Available teams:', Object.keys(TEAM_MAPPINGS).join(', '));
    return [];
  }

  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0 = January, 9 = October
    
    // NBA season typically runs from October (month 9) to June
    // If we're before October, use the previous season
    let seasonStartYear = currentYear;
    if (currentMonth < 9) { // If before October
      seasonStartYear = currentYear - 1;
    }
    
    const season = `${seasonStartYear}-${(seasonStartYear + 1).toString().slice(-2)}`;
    
    const url = `https://cdn.nba.com/static/json/liveData/playbyplay/schedule/${season}_${team.abbrev}_schedule.json`;
    
    console.log('[NBA-API] 🏀 Fetching schedule for', team.fullName);
    console.log('[NBA-API] 📅 Season:', season);
    console.log('[NBA-API] 🔗 URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.log('[NBA-API] ❌ Failed to fetch:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    
    if (!data.schedule || !Array.isArray(data.schedule)) {
      console.log('[NBA-API] ⚠️ Invalid schedule data structure');
      return [];
    }

    // Transform NBA.com data to our format
    const games = data.schedule.map(game => {
      const isHome = game.homeTeam?.teamTricode === team.abbrev;
      const opponent = isHome ? game.awayTeam?.teamTricode : game.homeTeam?.teamTricode;
      const venue = isHome ? 'Home' : 'Away';
      
      return {
        date: new Date(game.gameDateTimeUTC || game.gameDate),
        opponent: opponent || 'TBD',
        venue: venue,
        gameId: game.gameId
      };
    });

    console.log('[NBA-API] ✅ Found', games.length, 'games for', team.fullName);
    
    // Log first few games for debugging
    if (games.length > 0) {
      console.log('[NBA-API] 📋 Sample games:');
      games.slice(0, 3).forEach(g => {
        console.log(`[NBA-API]   - ${g.date.toLocaleDateString()} vs ${g.opponent} (${g.venue})`);
      });
    }
    
    return games;

  } catch (error) {
    console.error('[NBA-API] 💥 Error fetching schedule:', error.message);
    console.error('[NBA-API] Stack:', error.stack);
    return [];
  }
}

// Alternative: Use balldontlie.io API (completely free, no key needed)
export async function fetchTeamScheduleBalldontlie(teamName) {
  const normalizedName = normalizeTeamName(teamName);
  const team = normalizedName ? TEAM_MAPPINGS[normalizedName] : null;
  
  if (!team) {
    console.log('[BALLDONTLIE] ❌ No mapping for team:', teamName);
    return [];
  }

  try {
    // This API is free and doesn't require authentication
    const currentYear = new Date().getFullYear();
    const url = `https://www.balldontlie.io/api/v1/games?seasons[]=${currentYear}&team_ids[]=${team.id}&per_page=100`;
    
    console.log('[BALLDONTLIE] 🏀 Fetching schedule for', team.fullName);
    console.log('[BALLDONTLIE] 🔗 URL:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log('[BALLDONTLIE] ❌ Failed:', response.status);
      return [];
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      console.log('[BALLDONTLIE] ⚠️ Invalid data structure');
      return [];
    }

    const games = data.data.map(game => {
      const isHome = game.home_team.id.toString() === team.id;
      const opponent = isHome ? game.visitor_team.full_name : game.home_team.full_name;
      
      return {
        date: new Date(game.date),
        opponent: opponent.split(' ').pop(), // Get team name (last word)
        venue: isHome ? 'Home' : 'Away',
        gameId: game.id.toString()
      };
    });

    console.log('[BALLDONTLIE] ✅ Found', games.length, 'games');
    return games;

  } catch (error) {
    console.error('[BALLDONTLIE] 💥 Error:', error.message);
    return [];
  }
}

// Export list of all teams for UI purposes
export function getAllTeams() {
  return Object.entries(TEAM_MAPPINGS).map(([key, value]) => ({
    key: key,
    name: value.fullName,
    abbrev: value.abbrev
  }));
}