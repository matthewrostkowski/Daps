// src/routes/athletes.js
import { Router } from 'express';
import { prisma } from '../db.js';
import { populateGamesForAthlete } from '../app.js';

const router = Router();

router.get('/', async (_req, res) => {
  console.log('═══════════════════════════════════════════════');
  console.log('[api:athletes] GET /api/athletes - Fetching all athletes');
  
  try {
    const list = await prisma.athlete.findMany({ orderBy: { name: 'asc' } });
    console.log('[api:athletes] ✅ Found', list.length, 'athletes in database');
    
    // Transform to match admin panel format - return BOTH image and imageUrl
    const transformed = list.map(a => ({
      id: a.slug || a.id,
      slug: a.slug,
      name: a.name,
      team: a.team,
      league: a.league,
      image: a.imageUrl || '',
      imageUrl: a.imageUrl || '',  // Add this for compatibility
      active: a.active,
      featured: a.featured || false  // Include featured status
    }));
    
    console.log('[api:athletes] /api/athletes returning ' + transformed.length + ' athletes:');
    transformed.forEach(a => {
      console.log('[api:athletes]   - ' + a.name + ' (' + a.team + ') [id=' + a.id + ', slug=' + a.slug + ', active=' + a.active + ', featured=' + a.featured + ']');
    });
    
    console.log('═══════════════════════════════════════════════');
    res.json(transformed);
  } catch (error) {
    console.error('[api:athletes] ❌ Error fetching athletes:', error);
    console.log('═══════════════════════════════════════════════');
    res.status(500).json({ error: 'Failed to fetch athletes' });
  }
});

router.post('/', async (req, res) => {
  const { slug, name, team, league, imageUrl, image, active, featured } = req.body || {};
  if (!name || !team || !league) return res.status(400).json({ error: 'Missing fields' });
  
  // Generate slug if not provided
  const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  try {
    // Create the athlete
    const a = await prisma.athlete.create({ 
      data: { 
        slug: finalSlug, 
        name, 
        team, 
        league, 
        imageUrl: imageUrl || image || '', 
        active: active ?? true,
        featured: featured ?? false  // Include featured status
      } 
    });
    
    console.log('[api] Created athlete:', a.name, '(slug:', a.slug, ')');
    
    // Automatically populate games for the new athlete
    console.log('[api] Auto-populating games for new athlete...');
    const gamesResult = await populateGamesForAthlete(a);
    
    if (gamesResult.success) {
      console.log(`[api] ✓ Successfully populated ${gamesResult.count} games for ${a.name}`);
    } else {
      console.log(`[api] ⚠️ Could not populate games: ${gamesResult.message || 'Unknown error'}`);
    }
    
    // Return in admin panel format
    res.json({
      id: a.slug,
      slug: a.slug,
      name: a.name,
      team: a.team,
      league: a.league,
      image: a.imageUrl || '',
      imageUrl: a.imageUrl || '',
      active: a.active,
      featured: a.featured  // Include featured status
    });
  } catch (error) {
    console.error('[api] Error creating athlete:', error);
    res.status(500).json({ error: 'Failed to create athlete' });
  }
});

// Handle both PATCH and PUT for updating athletes
async function updateAthlete(req, res) {
  const { id } = req.params;
  const { name, team, league, imageUrl, image, active, featured } = req.body || {};
  
  console.log('[api] UPDATE /api/athletes/' + id, req.body);
  
  // Update by slug or id
  const where = { OR: [{ slug: id }, { id }] };
  
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (team !== undefined) updateData.team = team;
  if (league !== undefined) updateData.league = league;
  if (imageUrl !== undefined || image !== undefined) updateData.imageUrl = imageUrl || image;
  if (active !== undefined) updateData.active = active;
  if (featured !== undefined) updateData.featured = featured;  // Update featured status
  
  try {
    // First find the athlete
    const athlete = await prisma.athlete.findFirst({ where });
    
    if (!athlete) {
      return res.status(404).json({ error: 'Athlete not found' });
    }
    
    // Update the athlete
    const updated = await prisma.athlete.update({
      where: { id: athlete.id },
      data: updateData
    });
    
    console.log('[api] Updated athlete:', updated.name);
    
    // If team was updated, refresh the games schedule
    if (team !== undefined) {
      console.log('[api] Team was updated, refreshing games schedule...');
      try {
        const gamesResult = await populateGamesForAthlete(updated);
        if (gamesResult.success) {
          console.log(`[api] ✓ Refreshed ${gamesResult.count} games after team update`);
        }
      } catch (error) {
        console.error('[api] ⚠️ Failed to refresh games:', error.message);
      }
    }
    
    // Return in admin panel format
    res.json({
      id: updated.slug || updated.id,
      slug: updated.slug,
      name: updated.name,
      team: updated.team,
      league: updated.league,
      image: updated.imageUrl || '',
      imageUrl: updated.imageUrl || '',
      active: updated.active,
      featured: updated.featured || false
    });
  } catch (error) {
    console.error('[api] Error updating athlete:', error);
    res.status(500).json({ error: 'Failed to update athlete' });
  }
}

// Support both PATCH and PUT methods
router.patch('/:id', updateAthlete);
router.put('/:id', updateAthlete);

// DELETE endpoint
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  console.log('[api] DELETE /api/athletes/' + id);
  
  try {
    // Find athlete first
    const athlete = await prisma.athlete.findFirst({
      where: { OR: [{ slug: id }, { id }] }
    });
    
    if (!athlete) {
      return res.status(404).json({ error: 'Athlete not found' });
    }
    
    // Delete associated games first
    await prisma.game.deleteMany({
      where: { athleteId: athlete.id }
    });
    
    // Delete athlete
    await prisma.athlete.delete({
      where: { id: athlete.id }
    });
    
    console.log('[api] Deleted athlete:', athlete.name);
    res.json({ ok: true });
  } catch (error) {
    console.error('[api] Error deleting athlete:', error);
    res.status(500).json({ error: 'Failed to delete athlete' });
  }
});

export default router;