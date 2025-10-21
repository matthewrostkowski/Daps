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
        active: true
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
app.get('/api/users/athletes', athletesHandler);

// Games endpoint - Dynamic ESPN API with smart caching
app.get('/api/games', async (req, res) => {
  try {
    const { athleteId } = req.query;
    console.log('[api] ═══════════════════════════════════════════');
    console.log('[api] GET /api/games - athleteId:', athleteId);
    
    if (!athleteId) {
      return res.status(400).json({ error: 'athleteId query parameter required' });
    }

    // STEP 1: Find athlete by slug OR id
    const athlete = await prisma.athlete.findFirst({
      where: {
        OR: [
          { id: String(athleteId) },
          { slug: String(athleteId) }
        ]
      }
    });

    if (!athlete) {
      console.log('[api] ✗ Athlete not found:', athleteId);
      return res.status(404).json({ error: 'Athlete not found' });
    }

    console.log('[api] ✓ Found:', athlete.name, '(' + athlete.team + ')');

    // STEP 2: Check database for games
    let games = await prisma.game.findMany({
      where: { athleteId: athlete.id },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
        opponent: true,
        venue: true,
        athleteId: true
      }
    });

    console.log(`[api] Database has ${games.length} games`);

    // STEP 3: If less than 70 games, fetch from ESPN (full season is 82)
    if (games.length < 70) {
      console.log('[api] Fetching full schedule from ESPN API...');
      
      const espnGames = await fetchESPNSchedule(athlete.team);

      if (espnGames.length > 0) {
        console.log(`[api] ✓ ESPN returned ${espnGames.length} games`);
        
        // Clear old games and insert new ones
        console.log('[api] Clearing old games...');
        await prisma.game.deleteMany({
          where: { athleteId: athlete.id }
        });

        const gameData = espnGames.map(g => ({
          athleteId: athlete.id,
          date: g.date,
          opponent: g.opponent,
          venue: g.venue
        }));

        console.log('[api] Inserting', gameData.length, 'new games...');
        const result = await prisma.game.createMany({
          data: gameData,
          skipDuplicates: true
        });

        console.log(`[api] ✓ Inserted ${result.count} games`);

        // Re-fetch from database
        games = await prisma.game.findMany({
          where: { athleteId: athlete.id },
          orderBy: { date: 'asc' },
          select: {
            id: true,
            date: true,
            opponent: true,
            venue: true,
            athleteId: true
          }
        });

        console.log(`[api] ✓ Refreshed: now ${games.length} games in database`);
      } else {
        console.log('[api] ⚠️ ESPN returned 0 games');
      }
    } else {
      console.log('[api] ✓ Using cached games from database');
    }

    console.log('[api] ✓ Returning', games.length, 'games');
    console.log('[api] ═══════════════════════════════════════════');
    return res.json(games);

  } catch (error) {
    console.error('[api] ✗ Error in /api/games:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/* ==================== MOUNTED ROUTERS ==================== */
// These handle most user & offer routes
app.use('/api/users', usersRouter);
app.use('/api/offers', offersRouter);

/* ==================== EMAIL VERIFICATION ==================== */
app.get('/api/email/verify', async (req, res) => {
  const log = (event, obj = {}) => {
    const ms = Date.now() - t0;
    console.log(`[verify-email] [${ms}ms] ${event}`, obj);
  };
  const t0 = Date.now();
  try {
    const { token } = req.query;
    log('start', { token });

    const rec = await prisma.emailVerification.findUnique({ where: { token } });
    if (!rec) {
      log('invalid_token', { token });
      return res.redirect('/verify.html?status=error&reason=invalid_token');
    }
    log('token_found', { userId: rec.userId, expiresAt: rec.expiresAt?.toISOString?.() });

    if (rec.expiresAt && rec.expiresAt.getTime() < Date.now()) {
      log('expired_token', { token, expiresAt: rec.expiresAt.toISOString() });
      return res.redirect('/verify.html?status=error&reason=expired');
    }

    let updated = false;
    try {
      await prisma.user.update({
        where: { id: rec.userId },
        data: { emailVerifiedAt: new Date() }
      });
      updated = true;
      log('user_marked_verified_emailVerifiedAt', { userId: rec.userId });
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
  console.log('[route:/playepage.html] serving playepage.html');
  res.sendFile(path.join(__dirname, '..', 'playepage.html'));
});

app.get('/my-offers.html', (req, res) => {
  console.log('[route:/my-offers.html] serving my-offers.html');
  res.sendFile(path.join(__dirname, '..', 'my-offers.html'));
});

app.get('/verify.html', (req, res) => {
  console.log('[route:/verify.html] serving verify.html');
  res.sendFile(path.join(__dirname, '..', 'verify.html'));
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