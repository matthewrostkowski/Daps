// src/routes/offers.js
import express from 'express';
import { prisma } from '../db.js';
import { requireAdmin } from '../auth.js';
import { sendOfferStatusEmail } from '../email.js';
import { populateGamesForAthlete } from '../app.js';

const router = express.Router();

// ==================== GET ALL OFFERS (ADMIN) ====================
router.get('/', requireAdmin, async (req, res) => {
  try {
    console.log('[offers] GET / - Fetching all offers for admin');

    const offers = await prisma.offer.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        athlete: {
          select: {
            id: true,
            slug: true,
            name: true,
            team: true,
            league: true,
            imageUrl: true,
            active: true
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

    // Transform to match admin.html expected format
    const transformed = offers.map(offer => ({
      id: offer.id,
      ts: new Date(offer.createdAt).getTime(),
      status: offer.status,
      customer: {
        name: offer.customerName || `${offer.user.firstName} ${offer.user.lastName}`,
        email: offer.customerEmail || offer.user.email,
        phone: offer.customerPhone || '',
        account: offer.userId
      },
      payment: {
        offered: offer.offered || offer.amount || 0,
        currency: 'USD',
        method: offer.paymentMethod || 'card',
        last4: offer.paymentLast4 || ''
      },
      experience: {
        desc: offer.expDesc || offer.description || '',
        type: offer.expType || 'Other'
      },
      game: {
        desc: offer.gameDesc || (offer.game ? `${offer.athlete.team} vs ${offer.game.opponent} - ${new Date(offer.game.date).toLocaleDateString()}` : 'Game TBD')
      },
      athlete: {
        id: offer.athlete.slug || offer.athlete.id,
        name: offer.athlete.name,
        team: offer.athlete.team,
        league: offer.athlete.league,
        image: offer.athlete.imageUrl || ''
      }
    }));

    console.log(`[offers] Returning ${transformed.length} offers to admin`);
    res.json(transformed);

  } catch (error) {
    console.error('[offers] Get all offers error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ==================== GET SINGLE OFFER (ADMIN) ====================
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[offers] GET /:id', { id });

    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        athlete: {
          select: {
            id: true,
            slug: true,
            name: true,
            team: true,
            league: true,
            imageUrl: true
          }
        },
        game: true
      }
    });

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    // Transform to match admin.html format
    const transformed = {
      id: offer.id,
      ts: new Date(offer.createdAt).getTime(),
      status: offer.status,
      customer: {
        name: offer.customerName || `${offer.user.firstName} ${offer.user.lastName}`,
        email: offer.customerEmail || offer.user.email,
        phone: offer.customerPhone || '',
        account: offer.userId
      },
      payment: {
        offered: offer.offered || offer.amount || 0,
        currency: 'USD',
        method: offer.paymentMethod || 'card',
        last4: offer.paymentLast4 || ''
      },
      experience: {
        desc: offer.expDesc || offer.description || '',
        type: offer.expType || 'Other'
      },
      game: {
        desc: offer.gameDesc || (offer.game ? `${offer.athlete.team} vs ${offer.game.opponent}` : 'Game TBD')
      },
      athlete: {
        id: offer.athlete.slug || offer.athlete.id,
        name: offer.athlete.name,
        team: offer.athlete.team,
        league: offer.athlete.league,
        image: offer.athlete.imageUrl || ''
      }
    };

    res.json(transformed);

  } catch (error) {
    console.error('[offers] Get offer error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ==================== UPDATE OFFER STATUS (ADMIN) ====================
router.put('/:id/status', requireAdmin, async (req, res) => {
  console.log('[offers] ═══════════════════════════════════════════════════════');
  console.log('[offers] PUT /:id/status - HANDLER REACHED');
  console.log('[offers] This means requireAdmin passed successfully');
  
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log('[offers] PUT /:id/status', { id, status });

    if (!status || !['pending', 'approved', 'declined'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Update the offer
    const offer = await prisma.offer.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        athlete: {
          select: {
            id: true,
            slug: true,
            name: true,
            team: true,
            league: true,
            imageUrl: true
          }
        },
        game: true
      }
    });

    console.log('[offers] Status updated:', { offerId: id, newStatus: status });

    // Send email notification to customer
    try {
      const customerEmail = offer.customerEmail || offer.user.email;
      if (customerEmail) {
        await sendOfferStatusEmail(customerEmail, offer);
        console.log('[offers] Status notification email sent to', customerEmail);
      }
    } catch (emailErr) {
      console.error('[offers] Failed to send status email:', emailErr);
    }

    // Transform response to match admin.html format
    const transformed = {
      id: offer.id,
      ts: new Date(offer.createdAt).getTime(),
      status: offer.status,
      customer: {
        name: offer.customerName || `${offer.user.firstName} ${offer.user.lastName}`,
        email: offer.customerEmail || offer.user.email,
        phone: offer.customerPhone || '',
        account: offer.userId
      },
      payment: {
        offered: offer.offered || offer.amount || 0,
        currency: 'USD',
        method: offer.paymentMethod || 'card',
        last4: offer.paymentLast4 || ''
      },
      experience: {
        desc: offer.expDesc || offer.description || '',
        type: offer.expType || 'Other'
      },
      game: {
        desc: offer.gameDesc || (offer.game ? `${offer.athlete.team} vs ${offer.game.opponent}` : 'Game TBD')
      },
      athlete: {
        id: offer.athlete.slug || offer.athlete.id,
        name: offer.athlete.name,
        team: offer.athlete.team,
        league: offer.athlete.league,
        image: offer.athlete.imageUrl || ''
      }
    };

    res.json(transformed);

  } catch (error) {
    console.error('[offers] Update status error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Offer not found' });
    }
    
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ==================== DELETE OFFER (ADMIN) ====================
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[offers] DELETE /:id', { id });

    await prisma.offer.delete({
      where: { id }
    });

    console.log('[offers] Offer deleted:', id);
    res.json({ message: 'Offer deleted successfully' });

  } catch (error) {
    console.error('[offers] Delete offer error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Offer not found' });
    }
    
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ==================== GET ALL ATHLETES (ADMIN) ====================
router.get('/athletes', requireAdmin, async (_req, res) => {
  try {
    console.log('[offers] GET /athletes - Fetching all athletes');
    const athletes = await prisma.athlete.findMany({
      orderBy: { name: 'asc' }
    });
    
    const transformed = athletes.map(a => ({
      id: a.slug || a.id,
      slug: a.slug,
      name: a.name,
      team: a.team,
      league: a.league,
      image: a.imageUrl || '',
      imageUrl: a.imageUrl || '',
      active: a.active
    }));
    
    console.log(`[offers] Returning ${transformed.length} athletes`);
    res.json(transformed);
  } catch (error) {
    console.error('[offers] Error fetching athletes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ==================== CREATE ATHLETE (ADMIN) ====================
router.post('/athletes', requireAdmin, async (req, res) => {
  try {
    const { name, team, league, imageUrl } = req.body;
    
    console.log('[offers] POST /athletes', { name, team, league });

    if (!name || !team || !league) {
      return res.status(400).json({ error: 'Name, team, and league required' });
    }

    // Generate slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const athlete = await prisma.athlete.create({
      data: {
        slug,
        name,
        team,
        league,
        imageUrl: imageUrl || null,
        active: true
      }
    });

    console.log('[offers] ✓ Athlete created:', athlete.id);
    
    // ==================== AUTO-POPULATE GAMES ====================
    console.log('[offers] Auto-populating games for new athlete...');
    try {
      const gamesResult = await populateGamesForAthlete(athlete);
      
      if (gamesResult.success) {
        console.log(`[offers] ✓ Successfully populated ${gamesResult.count} games for ${athlete.name}`);
      } else {
        console.log(`[offers] ⚠️ Could not populate games: ${gamesResult.message || 'Unknown error'}`);
      }
    } catch (gameError) {
      console.error('[offers] ⚠️ Game population failed:', gameError.message);
      // Don't fail the athlete creation if game population fails
    }
    // ============================================================
    
    // Return in admin panel format
    res.json({
      id: athlete.slug,
      slug: athlete.slug,
      name: athlete.name,
      team: athlete.team,
      league: athlete.league,
      image: athlete.imageUrl || '',
      imageUrl: athlete.imageUrl || '',
      active: athlete.active
    });

  } catch (error) {
    console.error('[offers] Create athlete error:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Athlete with this name already exists' });
    }
    
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ==================== UPDATE ATHLETE (ADMIN) ====================
router.put('/athletes/:id', requireAdmin, async (req, res) => {
  console.log('[offers] ═══════════════════════════════════════════════════════');
  console.log('[offers] PUT /athletes/:id - Update athlete');
  
  try {
    const { id } = req.params;
    const { name, team, league, imageUrl, active } = req.body;
    
    console.log('[offers] Athlete ID:', id);
    console.log('[offers] Update data:', { name, team, league, imageUrl, active });

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (team !== undefined) updateData.team = team;
    if (league !== undefined) updateData.league = league;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (active !== undefined) updateData.active = active;

    console.log('[offers] Final update data:', updateData);

    const athlete = await prisma.athlete.update({
      where: { id },
      data: updateData
    });

    console.log('[offers] ✅ Athlete updated successfully:', athlete);
    
    // ==================== REFRESH GAMES IF TEAM CHANGED ====================
    if (team !== undefined) {
      console.log('[offers] Team was updated, refreshing games schedule...');
      try {
        const gamesResult = await populateGamesForAthlete(athlete);
        if (gamesResult.success) {
          console.log(`[offers] ✓ Refreshed ${gamesResult.count} games after team update`);
        } else {
          console.log(`[offers] ⚠️ Could not refresh games: ${gamesResult.message}`);
        }
      } catch (gameError) {
        console.error('[offers] ⚠️ Game refresh failed:', gameError.message);
        // Don't fail the update if game refresh fails
      }
    }
    // =======================================================================
    
    console.log('[offers] ═══════════════════════════════════════════════════════');
    
    // Return in admin panel format
    res.json({
      id: athlete.slug || athlete.id,
      slug: athlete.slug,
      name: athlete.name,
      team: athlete.team,
      league: athlete.league,
      image: athlete.imageUrl || '',
      imageUrl: athlete.imageUrl || '',
      active: athlete.active
    });

  } catch (error) {
    console.error('[offers] ═══════════════════════════════════════════════════════');
    console.error('[offers] ❌ Update athlete error:', error);
    console.error('[offers] Error code:', error.code);
    console.error('[offers] Error message:', error.message);
    console.error('[offers] ═══════════════════════════════════════════════════════');
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Athlete not found' });
    }
    
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ==================== DELETE ATHLETE (ADMIN) ====================
router.delete('/athletes/:id', requireAdmin, async (req, res) => {
  console.log('[offers] ═══════════════════════════════════════════════════════');
  console.log('[offers] DELETE /athletes/:id');
  
  try {
    const { id } = req.params;
    console.log('[offers] Athlete ID:', id);

    // ==================== DELETE GAMES FIRST ====================
    const gamesDeleted = await prisma.game.deleteMany({
      where: { athleteId: id }
    });
    console.log(`[offers] Deleted ${gamesDeleted.count} games for athlete`);
    // ===========================================================

    await prisma.athlete.delete({
      where: { id }
    });

    console.log('[offers] ✅ Athlete deleted successfully:', id);
    console.log('[offers] ═══════════════════════════════════════════════════════');
    res.json({ message: 'Athlete deleted successfully' });

  } catch (error) {
    console.error('[offers] ═══════════════════════════════════════════════════════');
    console.error('[offers] ❌ Delete athlete error:', error);
    console.error('[offers] Error code:', error.code);
    console.error('[offers] Error message:', error.message);
    console.error('[offers] ═══════════════════════════════════════════════════════');
    
    if (error.code === 'P2003' || error.message.includes('foreign key')) {
      return res.status(400).json({ error: 'Cannot delete athlete with existing offers. Set athlete to inactive instead.' });
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Athlete not found' });
    }
    
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;