// src/app.js - Complete with ESPN API for 2025-26 season (all 82 games)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { prisma } from './db.js';
import { verifyTransport } from './email.js';
import { signUserSession, requireUser } from './userAuth.js';
import { requireAdmin } from './auth.js';

import usersRouter from './routes/users.js';
import offersRouter from './routes/offers.js';
import gamesRouter from './routes/games.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5175;

const app = express();

/* ==================== STATIC FILES ==================== */
app.use('/images', express.static(path.join(process.cwd(), 'images')));
console.log('[static] Serving /images from:', path.join(process.cwd(), 'images'));
app.use(express.static(path.join(__dirname, '../public')));
console.log('[static] Serving public from:', path.join(__dirname, '../public'));

/* ========== Tiny image fallback to stop 404 image spam (non-breaking) ========== */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFmwJZyZ0x9QAAAABJRU5ErkJggg==',
  'base64'
);
function serveOrTiny(relPath) {
  const abs = path.join(__dirname, '../public', relPath);
  return (req, res) => {
    try {
      if (fs.existsSync(abs)) return res.sendFile(abs);
    } catch (_) {}
    res.type('png').send(TINY_PNG);
  };
}
app.get('/images/placeholder.jpg', serveOrTiny('images/placeholder.jpg'));
app.get('/images/Daps-2 Copy.png', serveOrTiny('images/Daps-2 Copy.png'));

/* ==================== CORS & BODY PARSE ==================== */
app.use(cors({
  origin: [
    'http://localhost:5175',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    'http://127.0.0.1:5175'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ==================== REQUEST LOGGING ==================== */
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[req:start] ${req.method} ${req.path}`);
  if (['POST','PUT','PATCH'].includes(req.method)) {
    console.log('[req:body]', JSON.stringify(req.body));
  }
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[req:done ] ${req.method} ${req.path} -> ${res.statusCode} in ${duration}ms`);
  });
  next();
});


/* ==================== ESPN NBA API INTEGRATION ==================== */
// ESPN Team IDs - ALL 30 NBA TEAMS (verified with ESPN API)
const ESPN_TEAM_IDS = {
  'Celtics': '2', 'Nets': '17', 'Knicks': '18', '76ers': '20', 'Raptors': '28',
  'Bulls': '4', 'Cavaliers': '5', 'Pistons': '8', 'Pacers': '11', 'Bucks': '15',
  'Hawks': '1', 'Hornets': '30', 'Heat': '14', 'Magic': '19', 'Wizards': '27',
  'Nuggets': '7', 'Timberwolves': '16', 'Thunder': '25', 'Trail Blazers': '22', 'Jazz': '26',
  'Warriors': '9', 'Clippers': '12', 'Lakers': '13', 'Suns': '21', 'Kings': '23',
  'Mavericks': '6', 'Rockets': '10', 'Grizzlies': '29', 'Pelicans': '3', 'Spurs': '24'
};

// Fetch all 82 games from ESPN API (free, reliable, no auth needed)
async function fetchESPNSchedule(teamName) {
  const espnTeamId = ESPN_TEAM_IDS[teamName];
  if (!espnTeamId) {
    console.log('[ESPN-API] No team ID for:', teamName);
    return [];
  }

  try {
    const currentYear = new Date().getFullYear();
    const season = currentYear + 1; // FIXED: ESPN uses END year (2025-26 season = 2026)
    
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${espnTeamId}/schedule?season=${season}`;
    
    console.log('[ESPN-API] Fetching schedule for', teamName);
    console.log('[ESPN-API] Season:', season, '(NBA', (season-1) + '-' + season, 'season)');
    console.log('[ESPN-API] URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.log('[ESPN-API] ✗ Request failed:', response.status);
      return [];
    }

    const data = await response.json();
    
    if (!data.events || !Array.isArray(data.events)) {
      console.log('[ESPN-API] ✗ No events in response');
      return [];
    }

    console.log(`[ESPN-API] ✓ Found ${data.events.length} games for ${teamName}`);

    // Transform ESPN data to our format
    const games = data.events.map(event => {
      const competition = event.competitions?.[0];
      const homeTeam = competition?.competitors?.find(c => c.homeAway === 'home');
      const awayTeam = competition?.competitors?.find(c => c.homeAway === 'away');
      
      // Determine if this is a home or away game for our team
      const isHome = homeTeam?.team?.displayName?.includes(teamName.slice(0, -1)) || 
                     homeTeam?.team?.name?.includes(teamName.slice(0, -1));
      
      const opponent = isHome ? 
        (awayTeam?.team?.displayName || awayTeam?.team?.name || 'TBD') :
        (homeTeam?.team?.displayName || homeTeam?.team?.name || 'TBD');
      
      const venue = competition?.venue?.fullName || 
                    (isHome ? 'Home Arena' : 'Away Arena');
      
      // Parse date
      const gameDate = new Date(event.date);

      return {
        date: gameDate,
        opponent: opponent.split(' ').pop(), // Get team name (last word)
        venue: venue,
        isHome: isHome
      };
    });

    console.log('[ESPN-API] ✓ Transformed', games.length, 'games');
    
    // Sort by date
    games.sort((a, b) => a.date - b.date);
    
    return games;

  } catch (error) {
    console.error('[ESPN-API] ✗ Error:', error.message);
    return [];
  }
}

// Helper function to populate games for an athlete
async function populateGamesForAthlete(athlete) {
  console.log('[populate-games] Starting for athlete:', athlete.name, '(', athlete.team, ')');
  
  try {
    // Check if team is supported
    if (!ESPN_TEAM_IDS[athlete.team]) {
      console.log('[populate-games] ⚠️ Team not supported in ESPN_TEAM_IDS:', athlete.team);
      return { success: false, message: 'Team not supported for automatic schedule', count: 0 };
    }

    // Fetch games from ESPN
    const espnGames = await fetchESPNSchedule(athlete.team);
    
    if (espnGames.length === 0) {
      console.log('[populate-games] ⚠️ No games returned from ESPN API');
      return { success: false, message: 'No games found from ESPN', count: 0 };
    }

    console.log(`[populate-games] ✓ Fetched ${espnGames.length} games from ESPN`);

    // Clear any existing games for this athlete
    await prisma.game.deleteMany({
      where: { athleteId: athlete.id }
    });
    console.log('[populate-games] Cleared existing games');

    // Insert new games
    const gameData = espnGames.map(g => ({
      athleteId: athlete.id,
      date: g.date,
      opponent: g.opponent,
      venue: g.venue
    }));

    const result = await prisma.game.createMany({
      data: gameData,
      skipDuplicates: true
    });

    console.log(`[populate-games] ✓ Inserted ${result.count} games for ${athlete.name}`);
    
    return { success: true, count: result.count };

  } catch (error) {
    console.error('[populate-games] ✗ Error:', error.message);
    return { success: false, message: error.message, count: 0 };
  }
}

// ============================================================================
// ESPN NBA ALL PLAYERS API ENDPOINT
// ============================================================================

// Cache for ESPN players (refreshed every 24 hours)
let espnPlayersCache = null;
let espnPlayersCacheTime = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch all NBA players from ESPN API
 * This endpoint aggregates rosters from all 30 NBA teams
 */
app.get('/api/nba/all-players', async (req, res) => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('[nba:all-players] GET /api/nba/all-players - Fetch all NBA players');
  console.log('[nba:all-players] Timestamp:', new Date().toISOString());
  
  try {
    // Check cache first
    const now = Date.now();
    if (espnPlayersCache && espnPlayersCacheTime && (now - espnPlayersCacheTime < CACHE_DURATION)) {
      console.log('[nba:all-players] ✅ Returning cached data');
      console.log('[nba:all-players] Cache age:', Math.round((now - espnPlayersCacheTime) / 1000 / 60), 'minutes');
      console.log('[nba:all-players] Players in cache:', espnPlayersCache.length);
      console.log('═══════════════════════════════════════════════════════════════');
      return res.json({ 
        players: espnPlayersCache, 
        cached: true,
        cacheAge: now - espnPlayersCacheTime
      });
    }

    console.log('[nba:all-players] 🔄 Cache miss or expired, fetching from ESPN...');
    console.log('[nba:all-players] Fetching rosters from 30 NBA teams...');
    
    const allPlayers = [];
    let successCount = 0;
    let failCount = 0;

    // Fetch rosters for all 30 teams
    for (const [teamName, teamId] of Object.entries(ESPN_TEAM_IDS)) {
      try {
        console.log(`[nba:all-players] 📥 Fetching roster for ${teamName} (ID: ${teamId})...`);
        
        const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${teamId}/roster`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          console.log(`[nba:all-players] ⚠️ Failed to fetch ${teamName}: ${response.status}`);
          failCount++;
          continue;
        }

        const data = await response.json();
        
        // Debug: Log the structure we received
        console.log(`[nba:all-players] 🔍 ${teamName} response keys:`, Object.keys(data));
        
        if (!data.athletes || !Array.isArray(data.athletes)) {
          console.log(`[nba:all-players] ⚠️ No athletes array for ${teamName}`);
          console.log(`[nba:all-players] Data type:`, typeof data.athletes);
          failCount++;
          continue;
        }

        console.log(`[nba:all-players] 📊 ${teamName} athletes array length:`, data.athletes.length);
        
        // Check structure of first athlete if any
        if (data.athletes.length > 0) {
          console.log(`[nba:all-players] 🔍 First athlete keys:`, Object.keys(data.athletes[0]));
          if (data.athletes[0].items) {
            console.log(`[nba:all-players] Items length:`, data.athletes[0].items.length);
          }
        }

        let teamPlayerCount = 0;

        // Process each player - handle multiple possible structures
        data.athletes.forEach((athlete, athleteIdx) => {
          // Structure 1: athlete.items is an array of players
          if (athlete.items && Array.isArray(athlete.items)) {
            athlete.items.forEach(player => {
              if (!player || !player.id || !player.fullName) return;
              
              // Create player object
              const playerData = {
                espnId: player.id,
                name: player.fullName,
                displayName: player.displayName || player.fullName,
                shortName: player.shortName || player.fullName,
                team: teamName,
                teamId: teamId,
                league: 'NBA',
                position: player.position?.abbreviation || player.position?.name || '',
                jersey: player.jersey || '',
                age: player.age || null,
                height: player.height || '',
                weight: player.weight || '',
                imageUrl: player.headshot?.href || player.headshot?.alt || '',
                slug: (player.fullName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                source: 'espn'
              };
              
              allPlayers.push(playerData);
              teamPlayerCount++;
            });
          }
          // Structure 2: athlete object IS the player
          else if (athlete.id && athlete.fullName) {
            const playerData = {
              espnId: athlete.id,
              name: athlete.fullName,
              displayName: athlete.displayName || athlete.fullName,
              shortName: athlete.shortName || athlete.fullName,
              team: teamName,
              teamId: teamId,
              league: 'NBA',
              position: athlete.position?.abbreviation || athlete.position?.name || '',
              jersey: athlete.jersey || '',
              age: athlete.age || null,
              height: athlete.height || '',
              weight: athlete.weight || '',
              imageUrl: athlete.headshot?.href || athlete.headshot?.alt || '',
              slug: (athlete.fullName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              source: 'espn'
            };
            
            allPlayers.push(playerData);
            teamPlayerCount++;
          }
          // Structure 3: Log unknown structure
          else {
            if (athleteIdx === 0) {
              console.log(`[nba:all-players] ⚠️ Unknown athlete structure for ${teamName}:`, 
                JSON.stringify(athlete).substring(0, 200));
            }
          }
        });

        if (teamPlayerCount > 0) {
          successCount++;
          console.log(`[nba:all-players] ✅ ${teamName}: Added ${teamPlayerCount} players`);
        } else {
          failCount++;
          console.log(`[nba:all-players] ⚠️ ${teamName}: Found 0 players (structure mismatch)`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`[nba:all-players] ❌ Error fetching ${teamName}:`, error.message);
        failCount++;
      }
    }

    console.log('───────────────────────────────────────────────────────────────');
    console.log('[nba:all-players] 📊 Fetch Summary:');
    console.log('[nba:all-players]   - Teams fetched successfully:', successCount);
    console.log('[nba:all-players]   - Teams failed:', failCount);
    console.log('[nba:all-players]   - Total players collected:', allPlayers.length);
    console.log('───────────────────────────────────────────────────────────────');

    // If ESPN failed completely, try balldontlie.io as fallback
    if (allPlayers.length === 0) {
      console.log('[nba:all-players] ⚠️ ESPN returned 0 players, trying balldontlie.io API as fallback...');
      
      try {
        // balldontlie.io provides a simple /players endpoint
        const ballDontLieUrl = 'https://api.balldontlie.io/v1/players?per_page=100';
        console.log('[nba:all-players] 📥 Fetching from balldontlie.io...');
        
        // Fetch multiple pages to get all players
        for (let page = 1; page <= 5; page++) {
          const url = `${ballDontLieUrl}&page=${page}`;
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0',
              'Accept': 'application/json'
            }
          });
          
          if (!response.ok) {
            console.log(`[nba:all-players] ⚠️ balldontlie.io page ${page} failed:`, response.status);
            continue;
          }
          
          const data = await response.json();
          
          if (!data.data || !Array.isArray(data.data)) {
            console.log('[nba:all-players] ⚠️ Invalid balldontlie.io response structure');
            break;
          }
          
          console.log(`[nba:all-players] 📊 balldontlie.io page ${page}: ${data.data.length} players`);
          
          // Process players
          data.data.forEach(player => {
            if (!player || !player.id || !player.first_name || !player.last_name) return;
            
            const fullName = `${player.first_name} ${player.last_name}`;
            const teamName = player.team?.full_name?.split(' ').pop() || 'Free Agent'; // Get team name
            
            const playerData = {
              espnId: `bdl-${player.id}`, // Prefix to indicate source
              name: fullName,
              displayName: fullName,
              shortName: player.last_name,
              team: teamName,
              teamId: player.team?.id || 0,
              league: 'NBA',
              position: player.position || '',
              jersey: player.jersey_number || '',
              age: null,
              height: player.height || '',
              weight: player.weight || '',
              imageUrl: '', // balldontlie doesn't provide images
              slug: fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              source: 'balldontlie'
            };
            
            allPlayers.push(playerData);
          });
          
          // If we got less than 100, we're done
          if (data.data.length < 100) break;
          
          // Small delay between pages
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log(`[nba:all-players] ✅ Fallback API collected ${allPlayers.length} players`);
        
      } catch (error) {
        console.error('[nba:all-players] ❌ Fallback API also failed:', error.message);
      }
    }

    console.log('───────────────────────────────────────────────────────────────');
    console.log('[nba:all-players] 📊 Final Summary:');
    console.log('[nba:all-players]   - Total players collected:', allPlayers.length);
    console.log('───────────────────────────────────────────────────────────────');

    // Remove duplicates (some players might appear in multiple team rosters during trades)
    const uniquePlayers = Array.from(
      new Map(allPlayers.map(p => [p.espnId, p])).values()
    );

    console.log('[nba:all-players] ✅ Unique players after deduplication:', uniquePlayers.length);

    // Update cache
    espnPlayersCache = uniquePlayers;
    espnPlayersCacheTime = Date.now();

    console.log('[nba:all-players] 💾 Cache updated successfully');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('[nba:all-players] ✨ REQUEST COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════════════');

    res.json({ 
      players: uniquePlayers,
      cached: false,
      fetchedAt: new Date().toISOString(),
      stats: {
        teamsSuccess: successCount,
        teamsFailed: failCount,
        totalPlayers: uniquePlayers.length
      }
    });

  } catch (error) {
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('[nba:all-players] ❌❌❌ ERROR FETCHING NBA PLAYERS ❌❌❌');
    console.error('[nba:all-players] Error name:', error.name);
    console.error('[nba:all-players] Error message:', error.message);
    console.error('[nba:all-players] Error stack:');
    console.error(error.stack);
    console.error('═══════════════════════════════════════════════════════════════');
    
    res.status(500).json({ 
      error: 'Failed to fetch NBA players',
      message: error.message 
    });
  }
});

/**
 * Create athlete dynamically from ESPN data
 * Used when user clicks on an ESPN player not yet in database
 */
app.post('/api/athletes/create-from-espn', requireUser, async (req, res) => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('[athletes:create-espn] POST /api/athletes/create-from-espn');
  console.log('[athletes:create-espn] User:', req.user.email);
  console.log('[athletes:create-espn] Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { espnId, name, team, imageUrl, position } = req.body;

    if (!espnId || !name || !team) {
      console.error('[athletes:create-espn] ❌ Missing required fields');
      return res.status(400).json({ error: 'espnId, name, and team are required' });
    }

    console.log('[athletes:create-espn] 🔍 Checking if athlete already exists...');
    
    // Check if athlete already exists
    const existing = await prisma.athlete.findFirst({
      where: {
        OR: [
          { slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
          { name: name }
        ]
      }
    });

    if (existing) {
      console.log('[athletes:create-espn] ✅ Athlete already exists:', existing.name);
      console.log('[athletes:create-espn] Returning existing athlete ID:', existing.id);
      console.log('═══════════════════════════════════════════════════════════════');
      return res.json({ 
        athlete: existing,
        alreadyExists: true 
      });
    }

    console.log('[athletes:create-espn] 💾 Creating new athlete in database...');

    // Create new athlete
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const athlete = await prisma.athlete.create({
      data: {
        slug: slug,
        name: name,
        team: team,
        league: 'NBA',
        imageUrl: imageUrl || '',
        active: true,
        featured: false
      }
    });

    console.log('[athletes:create-espn] ✅ Athlete created successfully');
    console.log('[athletes:create-espn]   - ID:', athlete.id);
    console.log('[athletes:create-espn]   - Slug:', athlete.slug);
    console.log('[athletes:create-espn]   - Name:', athlete.name);
    console.log('[athletes:create-espn]   - Team:', athlete.team);

    // Try to populate games for the athlete
    console.log('[athletes:create-espn] 🎮 Attempting to populate games...');
    try {
      const gamesResult = await populateGamesForAthlete(athlete);
      if (gamesResult.success) {
        console.log(`[athletes:create-espn] ✅ Populated ${gamesResult.count} games`);
      } else {
        console.log(`[athletes:create-espn] ⚠️ Could not populate games: ${gamesResult.message}`);
      }
    } catch (err) {
      console.error('[athletes:create-espn] ⚠️ Error populating games:', err.message);
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('[athletes:create-espn] ✨ ATHLETE CREATED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════════════');

    res.json({ 
      athlete: athlete,
      alreadyExists: false 
    });

  } catch (error) {
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('[athletes:create-espn] ❌❌❌ ERROR CREATING ATHLETE ❌❌❌');
    console.error('[athletes:create-espn] Error:', error);
    console.error('═══════════════════════════════════════════════════════════════');
    
    res.status(500).json({ 
      error: 'Failed to create athlete',
      message: error.message 
    });
  }
});

/* ==================== API ROUTES ==================== */
// Shared athletes handler (used by both endpoints)
async function athletesHandler(req, res) {
  console.log('[api] GET /api/athletes - Fetching all athletes');
  try {
    const athletes = await prisma.athlete.findMany({
      select: {
        id: true,
        name: true,
        team: true,
        league: true,
        imageUrl: true,
        slug: true,
        active: true,
        featured: true
      },
      orderBy: { name: 'asc' }
    });
    console.log(`[api] /api/athletes returning ${athletes.length} athletes`);
    res.json(athletes);
  } catch (error) {
    console.error('[api] ERROR in /api/athletes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
app.get('/api/athletes', athletesHandler);
app.get('/api/public/athletes', athletesHandler);

// Get single athlete by slug with games
app.get('/api/athletes/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    console.log('[api] GET /api/athletes/:slug', { slug });

    const athlete = await prisma.athlete.findFirst({
      where: {
        OR: [
          { slug: slug },
          { id: slug }
        ]
      },
      include: {
        games: {
          orderBy: { date: 'asc' }
        }
      }
    });

    if (!athlete) {
      console.log('[api] Athlete not found:', slug);
      return res.status(404).json({ error: 'Athlete not found' });
    }

    console.log(`[api] Found athlete: ${athlete.name} with ${athlete.games.length} games`);
    res.json(athlete);
  } catch (error) {
    console.error('[api] ERROR in /api/athletes/:slug:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Populate games for athlete using ESPN API
app.post('/api/athletes/:slug/populate-games', requireAdmin, async (req, res) => {
  try {
    const { slug } = req.params;
    console.log('[api] POST /api/athletes/:slug/populate-games', { slug });

    const athlete = await prisma.athlete.findFirst({
      where: {
        OR: [
          { slug: slug },
          { id: slug }
        ]
      }
    });

    if (!athlete) {
      console.log('[api] Athlete not found:', slug);
      return res.status(404).json({ error: 'Athlete not found' });
    }

    const result = await populateGamesForAthlete(athlete);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: `Successfully populated ${result.count} games for ${athlete.name}`,
        count: result.count 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: result.message,
        count: 0 
      });
    }
  } catch (error) {
    console.error('[api] ERROR in populate-games:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/* ==================== AUTH ROUTES ==================== */
app.use('/api/users', usersRouter);
app.use('/api/offers', offersRouter);
app.use('/api/games', gamesRouter);

/* ==================== EMAIL VERIFICATION ==================== */
app.get('/verify', async (req, res) => {
  const { token } = req.query;
  const t0 = Date.now();

  function log(step, data = {}) {
    console.log(`[verify] ${step}`, { token: token?.slice(0, 8), elapsed: Date.now() - t0, ...data });
  }

  try {
    log('start');
    if (!token) {
      log('no_token');
      return res.redirect('/verify.html?status=error&reason=no_token');
    }

    log('lookup_token');
    const rec = await prisma.emailVerification.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!rec) {
      log('invalid_token', { token });
      return res.redirect('/verify.html?status=error&reason=invalid_token');
    }

    if (rec.expiresAt < new Date()) {
      log('expired', { expiresAt: rec.expiresAt });
      return res.redirect('/verify.html?status=error&reason=expired');
    }

    log('valid_token', { userId: rec.userId, userEmail: rec.user.email });

    let updated = false;
    try {
      await prisma.user.update({
        where: { id: rec.userId },
        data: { emailVerifiedAt: new Date() }
      });
      updated = true;
      log('user_verified', { userId: rec.userId });
    } catch (e1) {
      try {
        await prisma.user.update({
          where: { id: rec.userId },
          data: { verified: true }
        });
        updated = true;
        log('user_marked_verified_flag', { userId: rec.userId });
      } catch (e2) {
        log('user_update_failed', { userId: rec.userId, e1: e1?.message, e2: e2?.message });
      }
    }
    if (!updated) {
      return res.redirect('/verify.html?status=error&reason=user_update_failed');
    }

    try {
      await prisma.emailVerification.delete({ where: { token } });
      log('token_deleted', { token });
    } catch (e3) {
      log('token_delete_failed', { token, err: e3?.message });
    }

    log('success', { ms: Date.now() - t0 });
    return res.redirect('/verify.html?status=success');
  } catch (err) {
    log('server_error', { err: err?.message });
    return res.redirect('/verify.html?status=error&reason=server_error');
  }
});

/* ==================== USER OFFERS ==================== */
app.get('/api/users/my-offers', requireUser, async (req, res) => {
  try {
    console.log('[my-offers] fetch for user', { uid: req.user.uid });
    const offers = await prisma.offer.findMany({
      where: { userId: req.user.uid },
      include: {
        athlete: { select: { id: true, name: true, slug: true, imageUrl: true, team: true, league: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(offers);
  } catch (err) {
    console.error('[my-offers] error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/* ==================== ADMIN ENDPOINTS ==================== */

// NOTE: The GET /api/offers endpoint is now handled by the offers.js router
// mounted at line 319: app.use('/api/offers', offersRouter)
// This duplicate route below is commented out to avoid confusion.
// The router intercepts the request first, so this code was never being executed.

/* COMMENTED OUT - Duplicate route (handled by offers.js router instead)
// Get all offers (admin only)
app.get('/api/offers', requireAdmin, async (_req, res) => {
  try {
    console.log('[admin] GET /api/offers - fetching all offers');
    const offers = await prisma.offer.findMany({
      include: {
        athlete: { 
          select: { id: true, name: true, slug: true, imageUrl: true, team: true, league: true, active: true } 
        },
        user: { 
          select: { id: true, email: true, firstName: true, lastName: true } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const transformed = offers.map(offer => ({
      id: offer.id,
      status: offer.status,
      ts: new Date(offer.createdAt).getTime(),
      customer: {
        name: offer.customerName || `${offer.user.firstName} ${offer.user.lastName}`,
        email: offer.customerEmail || offer.user.email,
        phone: offer.customerPhone || ''
      },
      athlete: {
        id: offer.athlete.id,
        name: offer.athlete.name,
        team: offer.athlete.team,
        league: offer.athlete.league,
        image: offer.athlete.imageUrl,
        active: offer.athlete.active
      },
      payment: {
        offered: offer.offered || offer.amount || 0,
        method: offer.paymentMethod || 'card',
        last4: offer.paymentLast4 || ''
      },
      game: {
        desc: offer.gameDesc || 'Game TBD'
      },
      description: offer.expDesc || offer.description || '',
      expType: offer.expType || 'Other'
    }));

    console.log(`[admin] returning ${transformed.length} offers`);
    return res.json(transformed);
  } catch (err) {
    console.error('[admin] error fetching offers', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});
END OF COMMENTED OUT DUPLICATE ROUTE */

/* COMMENTED OUT - Duplicate route (handled by offers.js router instead)
// Update offer status (admin only)
app.put('/api/offers/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log('[admin] PUT /api/offers/:id/status', { id, status });

    if (!['pending', 'approved', 'declined'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updated = await prisma.offer.update({
      where: { id },
      data: { status },
      include: {
        athlete: { 
          select: { id: true, name: true, slug: true, imageUrl: true, team: true, league: true, active: true } 
        },
        user: { 
          select: { id: true, email: true, firstName: true, lastName: true } 
        }
      }
    });

    const transformed = {
      id: updated.id,
      status: updated.status,
      ts: new Date(updated.createdAt).getTime(),
      customer: {
        name: updated.customerName || `${updated.user.firstName} ${updated.user.lastName}`,
        email: updated.customerEmail || updated.user.email,
        phone: updated.customerPhone || ''
      },
      athlete: {
        id: updated.athlete.id,
        name: updated.athlete.name,
        team: updated.athlete.team,
        league: updated.athlete.league,
        image: updated.athlete.imageUrl,
        active: updated.athlete.active
      },
      payment: {
        offered: updated.offered || updated.amount || 0,
        method: updated.paymentMethod || 'card',
        last4: updated.paymentLast4 || ''
      },
      game: {
        desc: updated.gameDesc || 'Game TBD'
      },
      description: updated.expDesc || updated.description || '',
      expType: updated.expType || 'Other'
    };

    console.log('[admin] offer status updated successfully');
    return res.json(transformed);
  } catch (err) {
    console.error('[admin] error updating offer status', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});
END OF COMMENTED OUT DUPLICATE ROUTE */

/* ==================== HTML ROUTES ==================== */
app.get('/', (req, res) => {
  console.log('[route:/] redirect -> /user');
  res.redirect('/user');
});

app.get('/user', (req, res) => {
  console.log('[route:/user] serving user.html');
  res.sendFile(path.join(__dirname, '..', 'user.html'));
});

app.get('/admin', (req, res) => {
  console.log('[route:/admin] serving admin.html');
  res.sendFile(path.join(__dirname, '..', 'admin.html'));
});

app.get('/index.html', (req, res) => {
  console.log('[route:/index.html] serving index.html');
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/playepage.html', (req, res) => {
  console.log('═══════════════════════════════════════════════');
  console.log('[route:/playepage.html] REQUEST RECEIVED');
  console.log('[route:/playepage.html] Query params:', req.query);
  console.log('[route:/playepage.html] athleteId:', req.query.athleteId);
  console.log('[route:/playepage.html] Full URL:', req.url);
  
  const filePath = path.join(__dirname, '..', 'playepage.html');
  console.log('[route:/playepage.html] Attempting to serve file from:', filePath);
  console.log('[route:/playepage.html] __dirname:', __dirname);
  console.log('[route:/playepage.html] File exists:', fs.existsSync(filePath));
  
  if (!fs.existsSync(filePath)) {
    console.error('[route:/playepage.html] ❌ FILE NOT FOUND:', filePath);
    console.error('[route:/playepage.html] Current directory:', process.cwd());
    console.error('[route:/playepage.html] Directory contents:', fs.readdirSync(path.join(__dirname, '..')));
    return res.status(404).send('playepage.html not found');
  }
  
  console.log('[route:/playepage.html] ✅ Serving playepage.html');
  console.log('═══════════════════════════════════════════════');
  res.sendFile(filePath);
});

app.get('/my-offers.html', (req, res) => {
  console.log('[route:/my-offers.html] serving my-offers.html');
  res.sendFile(path.join(__dirname, '..', 'my-offers.html'));
});

app.get('/verify.html', (req, res) => {
  console.log('[route:/verify.html] serving verify.html');
  res.sendFile(path.join(__dirname, '..', 'verify.html'));
});

/* >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
   NEWS PAGE ROUTES
   <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< */

app.get('/news.html', (req, res) => {
  console.log('[route:/news.html] serving news.html');
  res.sendFile(path.join(__dirname, '..', 'news.html'));
});

app.get('/news', (req, res) => {
  console.log('[route:/news] redirect -> /news.html');
  res.redirect('/news.html');
});

/* >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
   FAQ PAGE ROUTES (ADDED)
   <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< */

app.get('/faq.html', (req, res) => {
  console.log('[route:/faq.html] serving faq.html');
  res.sendFile(path.join(__dirname, '..', 'faq.html'));
});

app.get('/faq', (req, res) => {
  console.log('[route:/faq] redirect -> /faq.html');
  res.redirect('/faq.html');
});

/* >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
   PRIVACY POLICY PAGE ROUTES
   <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< */

app.get('/privacy-policy.html', (req, res) => {
  console.log('[route:/privacy-policy.html] serving privacy-policy.html');
  res.sendFile(path.join(__dirname, '..', 'privacy-policy.html'));
});

app.get('/privacy-policy', (req, res) => {
  console.log('[route:/privacy-policy] redirect -> /privacy-policy.html');
  res.redirect('/privacy-policy.html');
});

app.get('/privacy', (req, res) => {
  console.log('[route:/privacy] redirect -> /privacy-policy.html');
  res.redirect('/privacy-policy.html');
});

/* >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
   TERMS PAGE ROUTES
   <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< */

app.get('/terms.html', (req, res) => {
  console.log('[route:/terms.html] serving terms.html');
  res.sendFile(path.join(__dirname, '..', 'terms.html'));
});

app.get('/terms-of-service.html', (req, res) => {
  console.log('[route:/terms-of-service.html] serving terms.html');
  res.sendFile(path.join(__dirname, '..', 'terms.html'));
});

app.get('/terms', (req, res) => {
  console.log('[route:/terms] redirect -> /terms.html');
  res.redirect('/terms.html');
});

app.get('/terms-of-service', (req, res) => {
  console.log('[route:/terms-of-service] redirect -> /terms.html');
  res.redirect('/terms.html');
});

/* ==================== 404 & ERROR HANDLERS ==================== */
app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.path} not found`);
  res.status(404).json({ error: 'Not found' });
});
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

/* ==================== SERVER START ==================== */
app.listen(PORT, () => {
  console.log('╔═══════════════════════════════════════════╗');
  console.log(`║ Daps API on http://localhost:${PORT}       ║`);
  console.log('╚═══════════════════════════════════════════╝');

  if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
    verifyTransport();
  }
});

// Export the helper function so it can be used by other routes
export { populateGamesForAthlete };