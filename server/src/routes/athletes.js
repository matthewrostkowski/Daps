// src/routes/athletes.js
import { Router } from 'express';
import { prisma } from '../db.js';
import { populateGamesForAthlete } from '../app.js';

const router = Router();

router.get('/', async (_req, res) => {
  console.log('[api] GET /api/athletes - Fetching all athletes');
  const list = await prisma.athlete.findMany({ orderBy: { name: 'asc' } });
  
  // Transform to match admin panel format - return BOTH image and imageUrl
  const transformed = list.map(a => ({
    id: a.slug || a.id,
    slug: a.slug,
    name: a.name,
    team: a.team,
    league: a.league,
    image: a.imageUrl || '',
    imageUrl: a.imageUrl || '',  // Add this for compatibility
    active: a.active
  }));
  
  console.log('[api] /api/athletes returning ' + transformed.length + ' athletes:');
  transformed.forEach(a => {
    console.log('[api]   - ' + a.name + ' (' + a.team + ') [id=' + a.id + ', slug=' + a.slug + ', active=' + a.active + ']');
  });
  
  res.json(transformed);
});

router.post('/', async (req, res) => {
  const { slug, name, team, league, imageUrl, image, active } = req.body || {};
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
        active: active ?? true 
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
      active: a.active
    });
  } catch (error) {
    console.error('[api] Error creating athlete:', error);
    res.status(500).json({ error: 'Failed to create athlete' });
  }
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, team, league, imageUrl, image, active } = req.body || {};
  
  console.log('[api] PATCH /api/athletes/' + id, req.body);
  
  // Update by slug or id
  const where = { OR: [{ slug: id }, { id }] };
  
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (team !== undefined) updateData.team = team;
  if (league !== undefined) updateData.league = league;
  if (imageUrl !== undefined || image !== undefined) updateData.imageUrl = imageUrl || image;
  if (active !== undefined) updateData.active = active;
  
  const result = await prisma.athlete.updateMany({
    where,
    data: updateData
  });
  
  console.log('[api] Updated', result.count, 'athlete(s)');
  
  // If team was updated, refresh the games schedule
  if (team !== undefined && result.count > 0) {
    console.log('[api] Team was updated, refreshing games schedule...');
    try {
      const athlete = await prisma.athlete.findFirst({ where });
      if (athlete) {
        const gamesResult = await populateGamesForAthlete(athlete);
        if (gamesResult.success) {
          console.log(`[api] ✓ Refreshed ${gamesResult.count} games after team update`);
        }
      }
    } catch (error) {
      console.error('[api] ⚠️ Failed to refresh games:', error.message);
    }
  }
  
  res.json({ ok: true, updated: result.count });
});

export default router;