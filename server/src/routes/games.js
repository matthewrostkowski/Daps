import { Router } from 'express';
import { prisma } from '../db.js';

const router = Router();

// GET /api/games?athleteId=...
router.get('/', async (req, res) => {
  console.log('═══════════════════════════════════════════════');
  console.log('[api:games] GET /api/games');
  console.log('[api:games] Query params:', req.query);
  console.log('[api:games] athleteId param:', req.query.athleteId);
  
  const { athleteId } = req.query;
  
  if (!athleteId) {
    console.warn('[api:games] ⚠️ No athleteId provided - returning all games');
  } else {
    console.log('[api:games] 🔍 Searching for games with athleteId:', athleteId);
  }
  
  const where = athleteId ? { athleteId: String(athleteId) } : {};
  console.log('[api:games] Query where clause:', where);
  
  try {
    const games = await prisma.game.findMany({
      where, 
      orderBy: { date: 'asc' }
    });
    
    console.log('[api:games] ✅ Found', games.length, 'games');
    
    if (games.length > 0) {
      console.log('[api:games] Sample games (first 3):');
      games.slice(0, 3).forEach((g, i) => {
        console.log(`[api:games]   ${i + 1}. ${g.date} vs ${g.opponent} at ${g.venue}`);
      });
    }
    
    console.log('═══════════════════════════════════════════════');
    res.json(games);
  } catch (error) {
    console.error('[api:games] ❌ Error fetching games:', error);
    console.error('[api:games] Error details:', error.message);
    console.log('═══════════════════════════════════════════════');
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// POST /api/games  (admin create one)
// { athleteId, date, opponent, venue }
router.post('/', async (req, res) => {
  const { athleteId, date, opponent, venue } = req.body || {};
  if (!athleteId || !date || !opponent) return res.status(400).json({ error: 'Missing fields' });
  const game = await prisma.game.create({
    data: { athleteId, date: new Date(date), opponent, venue }
  });
  res.json(game);
});

// POST /api/games/bulk  (admin bulk add)
// { athleteId, rows: [{ date, opponent, venue }, ...] }
router.post('/bulk', async (req, res) => {
  const { athleteId, rows } = req.body || {};
  if (!athleteId || !Array.isArray(rows)) return res.status(400).json({ error: 'Missing fields' });
  const data = rows.map(r => ({
    athleteId, date: new Date(r.date), opponent: r.opponent, venue: r.venue || null
  }));
  const created = await prisma.game.createMany({ data, skipDuplicates: true });
  res.json({ count: created.count });
});

export default router;