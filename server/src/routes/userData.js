// src/routes/userData.js
import express from 'express';
import { requireUser } from '../userAuth.js';

const router = express.Router();

router.get('/me', requireUser, async (req, res) => {
  res.json({ uid: req.user.uid, email: req.user.email });
});

export default router;
