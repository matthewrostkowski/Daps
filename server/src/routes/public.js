// src/routes/public.js
import express from 'express';

export function publicRouter({ prisma }) {
  const router = express.Router();
  router.get('/athletes', async (_req, res, next) => {
    try {
      const rows = await prisma.athlete.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, team: true, league: true, imageUrl: true }
      });
      res.json(rows);
    } catch (err) { next(err); }
  });
  return router;
}
