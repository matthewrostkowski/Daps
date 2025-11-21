// src/routes/users.js - COMPLETE FILE WITH GAME ID SUPPORT AND EXTENSIVE LOGGING
import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../db.js';
import { signUserSession, requireUser } from '../userAuth.js';
import { sendVerificationEmail } from '../email.js';

const router = express.Router();

console.log('═══════════════════════════════════════════════════════════════');
console.log('[users] 🚀 Users router initialized');
console.log('[users] Registering routes:');
console.log('[users]   - POST   /api/users/register');
console.log('[users]   - GET    /api/users/verify');
console.log('[users]   - POST   /api/users/resend-verification');
console.log('[users]   - POST   /api/users/request-password-reset');
console.log('[users]   - POST   /api/users/login');
console.log('[users]   - GET    /api/users/me');
console.log('[users]   - POST   /api/users/offers');
console.log('[users]   - GET    /api/users/offers');
console.log('═══════════════════════════════════════════════════════════════');


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

/* ==================== VERIFY EMAIL ==================== */
router.get('/verify', async (req, res) => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('[users:verify] 🎯 GET /api/users/verify - EMAIL VERIFICATION REQUEST');
  console.log('[users:verify] Timestamp:', new Date().toISOString());
  console.log('═══════════════════════════════════════════════════════════════');
  
  try {
    const { token } = req.query;
    
    // Log request details
    console.log('[users:verify] 📥 Request Details:');
    console.log('[users:verify]   - Method:', req.method);
    console.log('[users:verify]   - URL:', req.originalUrl || req.url);
    console.log('[users:verify]   - Full Query:', JSON.stringify(req.query));
    console.log('[users:verify]   - Token present:', !!token);
    console.log('[users:verify]   - Token length:', token ? token.length : 0);
    console.log('[users:verify]   - Token value:', token ? token.substring(0, 20) + '...' : 'NONE');
    console.log('───────────────────────────────────────────────────────────────');

    if (!token) {
      console.error('[users:verify] ❌ NO TOKEN PROVIDED');
      console.log('[users:verify]   - Redirecting to: /verify.html?status=error&reason=missing_token');
      console.log('═══════════════════════════════════════════════════════════════');
      return res.redirect('/verify.html?status=error&reason=missing_token');
    }

    // Find verification record
    console.log('[users:verify] 🔍 Looking up verification token in database...');
    console.log('[users:verify]   - Searching for token:', token.substring(0, 20) + '...');
    
    const verification = await prisma.emailVerification.findUnique({
      where: { token: token },
      include: { user: true }
    });

    if (!verification) {
      console.error('[users:verify] ❌ VERIFICATION TOKEN NOT FOUND IN DATABASE');
      console.error('[users:verify]   - Token searched:', token.substring(0, 20) + '...');
      console.log('[users:verify]   - Redirecting to: /verify.html?status=error&reason=invalid_token');
      console.log('═══════════════════════════════════════════════════════════════');
      return res.redirect('/verify.html?status=error&reason=invalid_token');
    }
    
    console.log('[users:verify] ✅ Verification record found:');
    console.log('[users:verify]   - User ID:', verification.userId);
    console.log('[users:verify]   - User email:', verification.user.email);
    console.log('[users:verify]   - Token expires:', verification.expiresAt);
    console.log('[users:verify]   - Current time:', new Date());
    console.log('───────────────────────────────────────────────────────────────');

    // Check if token expired
    if (verification.expiresAt < new Date()) {
      console.error('[users:verify] ❌ VERIFICATION TOKEN EXPIRED');
      console.error('[users:verify]   - Expired at:', verification.expiresAt);
      console.error('[users:verify]   - Current time:', new Date());
      await prisma.emailVerification.delete({ where: { token: token } });
      console.log('[users:verify]   - Expired token deleted from database');
      console.log('[users:verify]   - Redirecting to: /verify.html?status=error&reason=expired');
      console.log('═══════════════════════════════════════════════════════════════');
      return res.redirect('/verify.html?status=error&reason=expired');
    }

    console.log('[users:verify] ✅ Token is valid and not expired');
    console.log('───────────────────────────────────────────────────────────────');

    // Update user's emailVerifiedAt
    console.log('[users:verify] 💾 Updating user emailVerifiedAt...');
    await prisma.user.update({
      where: { id: verification.userId },
      data: { emailVerifiedAt: new Date() }
    });
    console.log('[users:verify] ✅ User emailVerifiedAt updated successfully');
    console.log('───────────────────────────────────────────────────────────────');

    // Delete the verification token
    console.log('[users:verify] 🗑️  Deleting verification token...');
    await prisma.emailVerification.delete({
      where: { token: token }
    });
    console.log('[users:verify] ✅ Verification token deleted from database');
    console.log('───────────────────────────────────────────────────────────────');

    console.log('[users:verify] ✅ EMAIL VERIFIED SUCCESSFULLY');
    console.log('[users:verify]   - User:', verification.user.email);
    console.log('[users:verify]   - Redirecting to: /verify.html?status=success');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('[users:verify] ✨ REQUEST COMPLETED SUCCESSFULLY ✨');
    console.log('═══════════════════════════════════════════════════════════════');
    
    // Redirect to verification success page
    res.redirect('/verify.html?status=success');
  } catch (err) {
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('[users:verify] ❌❌❌ ERROR IN EMAIL VERIFICATION ❌❌❌');
    console.error('[users:verify] Error name:', err.name);
    console.error('[users:verify] Error message:', err.message);
    console.error('[users:verify] Error stack:');
    console.error(err.stack);
    console.error('[users:verify] Full error object:');
    console.error(JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    console.error('[users:verify]   - Redirecting to: /verify.html?status=error&reason=server_error');
    console.error('═══════════════════════════════════════════════════════════════');
    res.redirect('/verify.html?status=error&reason=server_error');
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

/* ==================== CREATE OFFER (USER SIDE) - WITH EXTENSIVE LOGGING ==================== */
router.post('/offers', requireUser, async (req, res) => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('[users:offers] 🎯 POST /api/users/offers - CREATE OFFER REQUEST RECEIVED');
  console.log('[users:offers] Timestamp:', new Date().toISOString());
  console.log('═══════════════════════════════════════════════════════════════');
  
  try {
    // Log authentication info
    console.log('[users:offers] 🔐 Authentication Info:');
    console.log('[users:offers]   - User UID:', req.user?.uid);
    console.log('[users:offers]   - User email:', req.user?.email);
    console.log('[users:offers]   - Auth present:', !!req.user);
    console.log('───────────────────────────────────────────────────────────────');
    
    // Log request details
    console.log('[users:offers] 📥 Request Details:');
    console.log('[users:offers]   - Method:', req.method);
    console.log('[users:offers]   - URL:', req.originalUrl || req.url);
    console.log('[users:offers]   - Content-Type:', req.get('Content-Type'));
    console.log('[users:offers]   - Body present:', !!req.body);
    console.log('[users:offers]   - Body keys:', req.body ? Object.keys(req.body).join(', ') : 'none');
    console.log('───────────────────────────────────────────────────────────────');
    
    // Log full request body
    console.log('[users:offers] 📦 Request Body (full):');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('───────────────────────────────────────────────────────────────');
    
    const {
      athleteId,
      gameId,
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

    // Log extracted fields
    console.log('[users:offers] 📋 Extracted Fields:');
    console.log('[users:offers]   - athleteId:', athleteId);
    console.log('[users:offers]   - gameId:', gameId);
    console.log('[users:offers]   - customerName:', customerName);
    console.log('[users:offers]   - customerEmail:', customerEmail);
    console.log('[users:offers]   - customerPhone:', customerPhone);
    console.log('[users:offers]   - gameDesc:', gameDesc);
    console.log('[users:offers]   - expDesc:', expDesc);
    console.log('[users:offers]   - expType:', expType);
    console.log('[users:offers]   - offered:', offered, '(type:', typeof offered, ')');
    console.log('[users:offers]   - paymentMethod:', paymentMethod);
    console.log('[users:offers]   - paymentLast4:', paymentLast4);
    console.log('───────────────────────────────────────────────────────────────');

    // Validate required fields
    console.log('[users:offers] ✅ Validating required fields...');
    if (!athleteId || !customerName || !customerEmail) {
      console.error('[users:offers] ❌ VALIDATION FAILED - Missing required fields');
      console.error('[users:offers]   - athleteId present:', !!athleteId);
      console.error('[users:offers]   - customerName present:', !!customerName);
      console.error('[users:offers]   - customerEmail present:', !!customerEmail);
      console.log('═══════════════════════════════════════════════════════════════');
      return res.status(400).json({ 
        error: 'athleteId, customerName, and customerEmail are required' 
      });
    }
    console.log('[users:offers] ✅ Required fields validated successfully');
    console.log('───────────────────────────────────────────────────────────────');

    // Lookup athlete
    console.log('[users:offers] 🔍 Looking up athlete...');
    console.log('[users:offers]   - Search criteria: id OR slug =', athleteId);
    
    const athlete = await prisma.athlete.findFirst({
      where: {
        OR: [
          { id: athleteId }, 
          { slug: athleteId }
        ]
      }
    });
    
    if (!athlete) {
      console.error('[users:offers] ❌ ATHLETE NOT FOUND');
      console.error('[users:offers]   - Searched for:', athleteId);
      console.log('═══════════════════════════════════════════════════════════════');
      return res.status(404).json({ error: 'Athlete not found.' });
    }
    
    console.log('[users:offers] ✅ Athlete found successfully:');
    console.log('[users:offers]   - ID:', athlete.id);
    console.log('[users:offers]   - Slug:', athlete.slug);
    console.log('[users:offers]   - Name:', athlete.name);
    console.log('[users:offers]   - Team:', athlete.team);
    console.log('[users:offers]   - League:', athlete.league);
    console.log('───────────────────────────────────────────────────────────────');

    // Prepare offer data
    const offerData = {
      userId: req.user.uid,
      athleteId: athlete.id,
      gameId: gameId || null,
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
    };
    
    console.log('[users:offers] 💾 Creating offer in database...');
    console.log('[users:offers] Offer data to be created:');
    console.log(JSON.stringify(offerData, null, 2));
    console.log('───────────────────────────────────────────────────────────────');

    // Create the offer
    const offer = await prisma.offer.create({
      data: offerData,
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
        },
        game: {
          select: {
            id: true,
            date: true,
            opponent: true,
            venue: true
          }
        }
      }
    });

    console.log('[users:offers] ✅ OFFER CREATED SUCCESSFULLY IN DATABASE');
    console.log('[users:offers]   - Offer ID:', offer.id);
    console.log('[users:offers]   - Status:', offer.status);
    console.log('[users:offers]   - Amount:', offer.offered);
    console.log('[users:offers]   - Customer:', offer.customerName);
    console.log('[users:offers]   - Created at:', offer.createdAt);
    console.log('───────────────────────────────────────────────────────────────');
    
    // Prepare response
    const response = {
      id: offer.id,
      athlete: offer.athlete,
      game: offer.game,
      status: offer.status,
      offered: offer.offered,
      customerName: offer.customerName,
      expDesc: offer.expDesc,
      gameDesc: offer.gameDesc,
      createdAt: offer.createdAt
    };
    
    console.log('[users:offers] 📤 Sending success response:');
    console.log(JSON.stringify(response, null, 2));
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('[users:offers] ✨ REQUEST COMPLETED SUCCESSFULLY ✨');
    console.log('═══════════════════════════════════════════════════════════════');
    
    res.json(response);
  } catch (err) {
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('[users:offers] ❌❌❌ ERROR CREATING OFFER ❌❌❌');
    console.error('[users:offers] Error name:', err.name);
    console.error('[users:offers] Error message:', err.message);
    console.error('[users:offers] Error stack:');
    console.error(err.stack);
    console.error('[users:offers] Full error object:');
    console.error(JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    console.error('═══════════════════════════════════════════════════════════════');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/* ==================== GET USER OFFERS LIST ==================== */
router.get('/offers', requireUser, async (req, res) => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('[users:offers] GET /api/users/offers - Fetching user offers');
  console.log('[users:offers] User UID:', req.user?.uid);
  
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
        },
        game: {
          select: {
            id: true,
            date: true,
            opponent: true,
            venue: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('[users:offers] ✅ Retrieved', offers.length, 'offers for user');
    console.log('═══════════════════════════════════════════════════════════════');
    res.json(offers);
  } catch (err) {
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('[users:offers] ❌ Error fetching offers:', err);
    console.error('═══════════════════════════════════════════════════════════════');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;