// src/routes/offers.js
import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAdmin } from '../auth.js';
import { requireUser } from '../userAuth.js';
import { populateGamesForAthlete } from '../app.js';

const router = Router();

/* ============================================================
   =============== ATHLETES (ADMIN SIDE) ======================
   These endpoints are what admin.html is calling:
   - GET    /api/offers/athletes        (list for admin table)
   - POST   /api/offers/athletes        (create new athlete)
   - PUT    /api/offers/athletes/:id    (update toggle active/featured/etc)
   - PATCH  /api/offers/athletes/:id    (same as PUT, just convenience)
   - DELETE /api/offers/athletes/:id    (remove athlete + games)
   ============================================================ */

/**
 * GET /api/offers/athletes
 * Admin view of all athletes
 */
router.get('/athletes', requireAdmin, async (_req, res) => {
  console.log('═════════════════════════════════════════════════════════════');
  console.log('[offers] GET /api/offers/athletes');

  try {
    const list = await prisma.athlete.findMany({
      orderBy: { name: 'asc' }
    });

    const transformed = list.map(a => ({
      id: a.slug || a.id,
      slug: a.slug,
      name: a.name,
      team: a.team,
      league: a.league,
      image: a.imageUrl || '',
      imageUrl: a.imageUrl || '',
      active: a.active,
      featured: a.featured || false
    }));

    console.log(`[offers] returning ${transformed.length} athletes to admin`);
    transformed.forEach(a => {
      console.log(
        `[offers]   - ${a.name} [id=${a.id}] active=${a.active} featured=${a.featured}`
      );
    });

    console.log('═════════════════════════════════════════════════════════════');
    res.json(transformed);
  } catch (err) {
    console.error('[offers] ERROR /api/offers/athletes', err);
    console.log('═════════════════════════════════════════════════════════════');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


/**
 * POST /api/offers/athletes
 * Admin creates new athlete from admin.html ("Add Athlete" form)
 * Body: { name, team, league, imageUrl?, featured? }
 */
router.post('/athletes', requireAdmin, async (req, res) => {
  console.log('═════════════════════════════════════════════════════════════');
  console.log('[offers] POST /api/offers/athletes - CREATE ATHLETE');
  console.log('[offers] Request body:', JSON.stringify(req.body));

  try {
    const { slug, name, team, league, imageUrl, image, active, featured } = req.body || {};

    if (!name || !team || !league) {
      console.error('[offers] ❌ Missing required fields');
      console.log('═════════════════════════════════════════════════════════════');
      return res.status(400).json({ error: 'Missing fields' });
    }

    // generate slug if not provided
    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const created = await prisma.athlete.create({
      data: {
        slug: finalSlug,
        name,
        team,
        league,
        imageUrl: imageUrl || image || '',
        active: active ?? true,
        featured: featured ?? false
      }
    });

    console.log('[offers] ✓ Athlete created:', created.name, `(slug: ${created.slug})`);
    console.log('[offers] featured:', created.featured, 'active:', created.active);

    // auto-populate schedule for this athlete
    console.log('[offers] Auto-populating games for new athlete...');
    try {
      const gamesResult = await populateGamesForAthlete(created);
      if (gamesResult.success) {
        console.log(
          `[offers] ✓ Populated ${gamesResult.count} games for ${created.name}`
        );
      } else {
        console.warn(
          `[offers] ⚠️ Could not populate games: ${gamesResult.message || 'Unknown error'}`
        );
      }
    } catch (err) {
      console.error('[offers] ⚠️ Failed to auto-populate games:', err.message);
    }

    // respond in the admin panel shape
    const response = {
      id: created.slug || created.id,
      slug: created.slug,
      name: created.name,
      team: created.team,
      league: created.league,
      image: created.imageUrl || '',
      imageUrl: created.imageUrl || '',
      active: created.active,
      featured: created.featured || false
    };

    console.log('[offers] RESPONSE to admin:', response);
    console.log('═════════════════════════════════════════════════════════════');
    return res.json(response);
  } catch (err) {
    console.error('[offers] ❌ ERROR creating athlete', err);
    console.log('═════════════════════════════════════════════════════════════');
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});


/**
 * Internal helper for PUT/PATCH below
 * This is the FIX for featured.
 */
async function updateAthleteForAdmin(req, res) {
  const { id } = req.params;

  console.log('═════════════════════════════════════════════════════════════');
  console.log('[offers] PUT/PATCH /api/offers/athletes/:id - UPDATE ATHLETE');
  console.log('[offers] Athlete ID param:', id);
  console.log('[offers] Raw body:', JSON.stringify(req.body));

  // ⛑ pull EVERYTHING we allow admin to edit
  const {
    name,
    team,
    league,
    imageUrl,
    image,
    active,
    featured // ← THIS WAS MISSING BEFORE (root cause)
  } = req.body || {};

  console.log('[offers] Extracted fields:', {
    name,
    team,
    league,
    imageUrl,
    image,
    active,
    featured
  });

  // we allow lookup by slug OR id because admin is using slug in some places
  const where = { OR: [{ slug: id }, { id }] };

  const updateData = {};
  if (name     !== undefined) updateData.name     = name;
  if (team     !== undefined) updateData.team     = team;
  if (league   !== undefined) updateData.league   = league;
  if (imageUrl !== undefined || image !== undefined) {
    updateData.imageUrl = imageUrl || image;
  }
  if (active   !== undefined) updateData.active   = active;
  if (featured !== undefined) updateData.featured = featured; // ← CRITICAL FIX

  console.log('[offers] Update data object:', updateData);

  try {
    // 1. Find athlete first
    const athlete = await prisma.athlete.findFirst({ where });
    if (!athlete) {
      console.error('[offers] ❌ Athlete not found for', id);
      console.log('═════════════════════════════════════════════════════════════');
      return res.status(404).json({ error: 'Athlete not found' });
    }

    console.log('[offers] Current DB athlete state:', {
      id: athlete.id,
      slug: athlete.slug,
      name: athlete.name,
      active: athlete.active,
      featured: athlete.featured
    });

    // 2. Update athlete in DB
    const updated = await prisma.athlete.update({
      where: { id: athlete.id },
      data: updateData
    });

    console.log('[offers] ✅ Athlete updated successfully');
    console.log('[offers] Updated athlete state:', {
      id: updated.id,
      slug: updated.slug,
      name: updated.name,
      active: updated.active,
      featured: updated.featured
    });

    // 3. If team changed, refresh schedule
    if (team !== undefined) {
      console.log('[offers] Team changed. Refreshing games...');
      try {
        const gamesResult = await populateGamesForAthlete(updated);
        if (gamesResult.success) {
          console.log(
            `[offers] ✓ Refreshed ${gamesResult.count} games after team update`
          );
        } else {
          console.warn(
            `[offers] ⚠️ Failed to refresh games: ${gamesResult.message || 'Unknown error'}`
          );
        }
      } catch (err) {
        console.error('[offers] ⚠️ Failed to refresh games:', err.message);
      }
    }

    // 4. Return response in admin panel format
    const response = {
      id: updated.slug || updated.id,
      slug: updated.slug,
      name: updated.name,
      team: updated.team,
      league: updated.league,
      image: updated.imageUrl || '',
      imageUrl: updated.imageUrl || '',
      active: updated.active,
      featured: updated.featured || false // ← ALSO CRITICAL
    };

    console.log('[offers] Response payload to admin:', response);
    console.log('═════════════════════════════════════════════════════════════');
    return res.json(response);
  } catch (err) {
    console.error('[offers] ❌ Error updating athlete:', err);
    console.log('═════════════════════════════════════════════════════════════');
    return res.status(500).json({ error: 'Failed to update athlete' });
  }
}

router.put('/athletes/:id', requireAdmin, updateAthleteForAdmin);
router.patch('/athletes/:id', requireAdmin, updateAthleteForAdmin);


/**
 * DELETE /api/offers/athletes/:id
 * Admin deletes athlete (and associated games)
 */
router.delete('/athletes/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  console.log('═════════════════════════════════════════════════════════════');
  console.log('[offers] DELETE /api/offers/athletes/' + id);

  try {
    // find athlete by slug or id
    const athlete = await prisma.athlete.findFirst({
      where: { OR: [{ slug: id }, { id }] }
    });

    if (!athlete) {
      console.error('[offers] ❌ Athlete not found for delete');
      console.log('═════════════════════════════════════════════════════════════');
      return res.status(404).json({ error: 'Athlete not found' });
    }

    // delete games
    console.log('[offers] Deleting games for athlete:', athlete.id);
    await prisma.game.deleteMany({
      where: { athleteId: athlete.id }
    });

    // delete athlete
    console.log('[offers] Deleting athlete row');
    await prisma.athlete.delete({
      where: { id: athlete.id }
    });

    console.log('[offers] ✅ Athlete deleted:', athlete.name);
    console.log('═════════════════════════════════════════════════════════════');
    return res.json({ ok: true });
  } catch (err) {
    console.error('[offers] ❌ Error deleting athlete:', err);
    console.log('═════════════════════════════════════════════════════════════');
    return res.status(500).json({ error: 'Failed to delete athlete' });
  }
});


/* ============================================================
   =============== OFFERS (USER + ADMIN) ======================
   - user creates offers
   - admin views / updates status
   ============================================================ */

/**
 * USER - create an offer
 * POST /api/offers
 * Body includes athleteId, etc.
 * NOTE: requireUser is enforced at app.js level or here
 */
router.post('/', requireUser, async (req, res) => {
  console.log('═════════════════════════════════════════════════════════════');
  console.log('[offers] POST /api/offers - user creating offer');
  console.log('[offers] Request body:', JSON.stringify(req.body));

  try {
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
    } = req.body || {};

    // validate minimal fields
    if (!athleteId || !customerName || !customerEmail) {
      console.error('[offers] ❌ Missing required fields for offer create');
      console.log('═════════════════════════════════════════════════════════════');
      return res.status(400).json({
        error: 'athleteId, customerName, and customerEmail are required'
      });
    }

    // find athlete by slug OR id
    const athlete = await prisma.athlete.findFirst({
      where: {
        OR: [{ id: athleteId }, { slug: athleteId }]
      }
    });
    if (!athlete) {
      console.error('[offers] ❌ Athlete not found for offer create');
      console.log('═════════════════════════════════════════════════════════════');
      return res.status(404).json({ error: 'Athlete not found.' });
    }

    // create offer
    const offer = await prisma.offer.create({
      data: {
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

    console.log('[offers] ✅ Offer created successfully:', offer.id);

    res.json({
      id: offer.id,
      athlete: offer.athlete,
      game: offer.game,
      status: offer.status,
      offered: offer.offered,
      customerName: offer.customerName,
      expDesc: offer.expDesc,
      gameDesc: offer.gameDesc,
      createdAt: offer.createdAt
    });
    console.log('═════════════════════════════════════════════════════════════');
  } catch (err) {
    console.error('[offers] ❌ Error creating offer:', err);
    console.log('═════════════════════════════════════════════════════════════');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


/**
 * ADMIN - list all offers
 * GET /api/offers
 */
router.get('/', requireAdmin, async (_req, res) => {
  console.log('═════════════════════════════════════════════════════════════');
  console.log('[offers] GET /api/offers - admin list offers');

  try {
    const offers = await prisma.offer.findMany({
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
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('[offers] returning', offers.length, 'offers to admin');
    console.log('═════════════════════════════════════════════════════════════');
    res.json(offers);
  } catch (err) {
    console.error('[offers] ❌ Error fetching offers for admin:', err);
    console.log('═════════════════════════════════════════════════════════════');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


/**
 * ADMIN - update offer status (approve/decline/etc)
 * PUT /api/offers/:id/status
 * body: { status: "approved" | "declined" | ... }
 */
router.put('/:id/status', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  console.log('═════════════════════════════════════════════════════════════');
  console.log('[offers] PUT /api/offers/:id/status');
  console.log('[offers] Offer ID:', id);
  console.log('[offers] New status:', status);

  try {
    if (!status) {
      console.error('[offers] ❌ Missing status in body');
      console.log('═════════════════════════════════════════════════════════════');
      return res.status(400).json({ error: 'Missing status' });
    }

    const updated = await prisma.offer.update({
      where: { id },
      data: { status },
      include: {
        athlete: {
          select: {
            name: true,
            slug: true,
            imageUrl: true,
            team: true
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

    console.log('[offers] offer status updated successfully');

    // normalize shape back to admin panel style
    const gameId = updated.game ? updated.game.id : null;
    const gameDate = updated.game ? updated.game.date : null;
    const gameOpp = updated.game ? updated.game.opponent : null;
    const gameVenue = updated.game ? updated.game.venue : null;

    const response = {
      id: updated.id,
      status: updated.status,
      offered: updated.offered,
      createdAt: updated.createdAt,
      customerName: updated.customerName,
      customerEmail: updated.customerEmail,
      customerPhone: updated.customerPhone,
      paymentMethod: updated.paymentMethod,
      paymentLast4: updated.paymentLast4,
      game: {
        id: gameId,
        date: gameDate,
        opponent: gameOpp,
        venue: gameVenue,
        desc: updated.gameDesc || 'Game TBD'
      },
      description: updated.expDesc || updated.description || '',
      expType: updated.expType || 'Other',
      athlete: {
        name: updated.athlete?.name || '',
        slug: updated.athlete?.slug || '',
        imageUrl: updated.athlete?.imageUrl || '',
        team: updated.athlete?.team || ''
      }
    };

    console.log('[offers] Response to admin after status change:', response);
    console.log('═════════════════════════════════════════════════════════════');
    return res.json(response);
  } catch (err) {
    console.error('[offers] ❌ error updating offer status', err);
    console.log('═════════════════════════════════════════════════════════════');
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
