// src/routes/userOffers.js
import express from 'express';
import { requireUser } from '../userAuth.js';

export function userOffersRouter({ prisma }) {
  const router = express.Router();

  router.post('/', requireUser, async (req, res, next) => {
    try {
      const d = req.body || {};
      if (!d.athleteId || !d.customerName || !d.customerEmail) {
        return res.status(400).json({ error: 'athleteId, customerName, customerEmail required' });
      }
      const created = await prisma.offer.create({
        data: {
          status: 'pending',
          offered: d.offered ?? 0,
          customerName: d.customerName,
          customerEmail: d.customerEmail.toLowerCase(),
          customerPhone: d.customerPhone || null,
          gameDesc: d.gameDesc || null,
          expDesc: d.expDesc || null,
          expType: d.expType || null,
          paymentLast4: d.paymentLast4 || null,
          paymentMethod: d.paymentMethod || null,
          athleteId: d.athleteId,
          userId: req.user.id
        },
        include: { athlete: true }
      });
      res.status(201).json(created);
    } catch (err) { next(err); }
  });

  router.get('/', requireUser, async (req, res, next) => {
    try {
      const rows = await prisma.offer.findMany({
        where: { userId: req.user.id },
        include: { athlete: true },
        orderBy: { submittedAt: 'desc' }
      });
      res.json(rows);
    } catch (err) { next(err); }
  });

  router.post('/:id/messages', requireUser, async (req, res, next) => {
    try {
      const { id } = req.params;
      const offer = await prisma.offer.findFirst({ where: { id, userId: req.user.id } });
      if (!offer) return res.status(404).json({ error: 'Offer not found' });
      const { subject, body } = req.body || {};
      if (!subject || !body) return res.status(400).json({ error: 'subject and body required' });
      const msg = await prisma.message.create({
        data: { offerId: id, to: 'ops@daps.com', subject, body }
      });
      res.status(201).json(msg);
    } catch (err) { next(err); }
  });

  router.get('/:id/messages', requireUser, async (req, res, next) => {
    try {
      const { id } = req.params;
      const offer = await prisma.offer.findFirst({ where: { id, userId: req.user.id } });
      if (!offer) return res.status(404).json({ error: 'Offer not found' });
      const msgs = await prisma.message.findMany({
        where: { offerId: id },
        orderBy: { sentAt: 'desc' }
      });
      res.json(msgs);
    } catch (err) { next(err); }
  });

  return router;
}
