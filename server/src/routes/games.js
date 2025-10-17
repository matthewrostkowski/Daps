import { Router } from 'express';
import { prisma } from '../db.js';

const router = Router();

// GET /api/games?athleteId=...
router.get('/', async (req, res) => {
  const { athleteId } = req.query;
  const where = athleteId ? { athleteId: String(athleteId) } : {};
  const games = await prisma.game.findMany({
    where, orderBy: { date: 'asc' }
  });
  res.json(games);
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
