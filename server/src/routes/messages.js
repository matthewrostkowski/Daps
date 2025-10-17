import { Router } from 'express';
import { prisma } from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  const msgs = await prisma.message.findMany({
    orderBy: { createdAt: 'desc' },
    include: { offer: true }
  });
  res.json(msgs);
});

export default router;
