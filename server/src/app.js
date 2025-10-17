// src/app.js
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

// Mount routers (keep as-is)
app.use('/api/users', usersRouter);
app.use('/api/offers', offersRouter);

/* ==================== LOGIN + ME ==================== */
app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    console.log('[login] attempt', { email });
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required.' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(400).json({ error: 'Invalid email or password.' });

    if (
      (user.emailVerifiedAt === null || user.emailVerifiedAt === undefined) &&
      (user.verified === false || user.verified === null || user.verified === undefined)
    ) {
      return res.status(403).json({ error: 'Please verify your email before signing in.' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash || user.password || '');
    if (!ok) return res.status(400).json({ error: 'Invalid email or password.' });

    const token = signUserSession(user);
    console.log('[login] success', { id: user.id });
    return res.json({ token });
  } catch (err) {
    console.error('[login] error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/users/me', requireUser, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.uid },
      select: { id: true, email: true, firstName: true, lastName: true }
    });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    return res.json(user);
  } catch (err) {
    console.error('[me] error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/* ==================== EMAIL VERIFICATION ==================== */
app.get('/api/users/verify', async (req, res) => {
  const t0 = Date.now();
  const token = String(req.query.token || '').trim();
  const log = (msg, obj={}) =>
    console.log(`[verify] ${new Date().toISOString()} :: ${msg}`, Object.keys(obj).length ? obj : '');

  try {
    if (!token) {
      log('missing_token');
      return res.redirect('/verify.html?status=error&reason=missing_token');
    }
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

    // Transform to match admin.html expectations
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

    // Transform response to match admin.html expectations
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