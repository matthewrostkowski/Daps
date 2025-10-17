// src/routes/users.js - COMPLETE FILE WITH EMAIL VERIFICATION FIXED
import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../db.js';
import { signUserSession, requireUser } from '../userAuth.js';
import { sendVerificationEmail } from '../email.js';

const router = express.Router();

/* ==================== REGISTER ==================== */
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, passwordConfirm } = req.body;
    console.log('[users] POST /register', { email, firstName, lastName });

    // Validation
    if (!firstName || !lastName || !email || !password || !passwordConfirm) {
      return res.status(400).json({ error: 'All fields required.' });
    }
    if (password !== passwordConfirm) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: email.toLowerCase(),
        passwordHash
        // emailVerifiedAt will be null by default (unverified)
      }
    });

    // Create verification token (valid for 24 hours)
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.emailVerification.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
      }
    });

    // Send verification email - PASS ONLY TOKEN, NOT FULL URL
    await sendVerificationEmail(user.email, token);
    console.log('[users] Verification email sent to', user.email);
    
    res.json({ message: 'Verification email sent' });
  } catch (err) {
    console.error('[users] Registration error', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/* ==================== RESEND VERIFICATION ==================== */
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('[users] POST /resend-verification', { email });

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const user = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase() } 
    });
    
    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      return res.json({ message: 'If account exists, verification email sent' });
    }

    // Check if already verified
    if (user.emailVerifiedAt) {
      return res.json({ message: 'Email already verified' });
    }

    // Delete any existing verification tokens for this user
    await prisma.emailVerification.deleteMany({
      where: { userId: user.id }
    });

    // Create new verification token
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.emailVerification.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
      }
    });

    // Send verification email
    await sendVerificationEmail(user.email, token);
    console.log('[users] Resent verification email to', user.email);
    
    res.json({ message: 'If account exists, verification email sent' });
  } catch (err) {
    console.error('[users] Resend verification error', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/* ==================== REQUEST PASSWORD RESET ==================== */
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('[users] POST /request-password-reset', { email });

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const user = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase() } 
    });
    
    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      return res.json({ message: 'If account exists, password reset email sent' });
    }

    // Delete any existing password reset tokens for this user
    await prisma.passwordReset.deleteMany({
      where: { userId: user.id }
    });

    // Create password reset token (valid for 1 hour)
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.passwordReset.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60)
      }
    });

    // TODO: Send password reset email when implemented
    console.log('[users] Password reset token created for', user.email);
    
    res.json({ message: 'If account exists, password reset email sent' });
  } catch (err) {
    console.error('[users] Password reset request error', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/* ==================== LOGIN ==================== */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('[users] POST /login', { email });
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required.' });
    }

    const user = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase() } 
    });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    // Check if email is verified
    if (!user.emailVerifiedAt) {
      return res.status(403).json({ error: 'Please verify your email first.' });
    }

    // Verify password
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    // Generate JWT token
    const token = signUserSession(user);
    console.log('[users] Login successful', { id: user.id, email: user.email });
    
    res.json({ token });
  } catch (err) {
    console.error('[users] Login error', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/* ==================== ME (Get current user) ==================== */
router.get('/me', requireUser, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.uid },
      select: { 
        id: true, 
        email: true, 
        firstName: true, 
        lastName: true 
      }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    res.json(user);
  } catch (err) {
    console.error('[users] /me error', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/* ==================== CREATE OFFER (USER SIDE) ==================== */
router.post('/offers', requireUser, async (req, res) => {
  try {
    const {
      athleteId,
      customerName,
      customerEmail,
      customerPhone,
      gameDesc,
      expDesc,
      expType,
      offered,
      paymentMethod,
      paymentLast4
    } = req.body;

    console.log('[users:offers] Create offer attempt', { athleteId, offered });

    // Validate required fields
    if (!athleteId || !customerName || !customerEmail) {
      return res.status(400).json({ 
        error: 'athleteId, customerName, and customerEmail are required' 
      });
    }

    // Lookup athlete by slug OR id
    const athlete = await prisma.athlete.findFirst({
      where: {
        OR: [
          { id: athleteId }, 
          { slug: athleteId }
        ]
      }
    });
    
    if (!athlete) {
      return res.status(404).json({ error: 'Athlete not found.' });
    }

    // Create the offer
    const offer = await prisma.offer.create({
      data: {
        userId: req.user.uid,
        athleteId: athlete.id,
        customerName,
        customerEmail: customerEmail.toLowerCase(),
        customerPhone,
        gameDesc,
        expDesc,
        expType,
        offered: parseFloat(offered) || 0,
        paymentMethod,
        paymentLast4,
        status: 'pending'
      },
      include: {
        athlete: { 
          select: { 
            name: true, 
            slug: true, 
            imageUrl: true, 
            team: true 
          } 
        },
        user: { 
          select: { 
            firstName: true, 
            lastName: true, 
            email: true 
          } 
        }
      }
    });

    console.log('[users:offers] Offer created successfully:', offer.id);
    
    res.json({
      id: offer.id,
      athlete: offer.athlete,
      status: offer.status,
      offered: offer.offered,
      customerName: offer.customerName,
      expDesc: offer.expDesc,
      gameDesc: offer.gameDesc,
      createdAt: offer.createdAt
    });
  } catch (err) {
    console.error('[users:offers] Error creating offer:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/* ==================== GET USER OFFERS LIST ==================== */
router.get('/offers', requireUser, async (req, res) => {
  try {
    const offers = await prisma.offer.findMany({
      where: { userId: req.user.uid },
      include: {
        athlete: { 
          select: { 
            name: true, 
            slug: true, 
            imageUrl: true,
            team: true,
            league: true
          } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('[users:offers] Retrieved', offers.length, 'offers for user', req.user.uid);
    res.json(offers);
  } catch (err) {
    console.error('[users:offers] Error fetching offers:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;