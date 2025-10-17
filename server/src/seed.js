// src/seed.js - FIXED with clean image URLs
import { prisma } from './db.js';

async function run() {
  console.log('═══════════════════════════════════════════════');
  console.log('[SEED] Starting database seed...');
  console.log('═══════════════════════════════════════════════');

  try {
    // Check database connection
    console.log('[SEED] Testing database connection...');
    await prisma.$connect();
    console.log('[SEED] ✓ Database connected successfully');

    // Check existing athletes
    console.log('[SEED] Checking existing athletes...');
    const existingCount = await prisma.athlete.count();
    console.log(`[SEED] Found ${existingCount} existing athletes in database`);

    // Upsert Athletes with CLEAN URLs (no spaces, no parentheses)
    console.log('[SEED] Creating/updating athletes with clean image URLs...');
    
    console.log('[SEED] → Processing Anthony Edwards...');
    const a1 = await prisma.athlete.upsert({
      where: { slug: 'anthony-edwards' },
      update: {
        name: 'Anthony Edwards',
        team: 'Timberwolves',
        league: 'NBA',
        imageUrl: '/images/anthony-edwards.jpg',  // CLEAN URL
        active: true
      },
      create: {
        slug: 'anthony-edwards',
        name: 'Anthony Edwards',
        team: 'Timberwolves',
        league: 'NBA',
        imageUrl: '/images/anthony-edwards.jpg',  // CLEAN URL
        active: true
      }
    });
    console.log(`[SEED] ✓ Anthony Edwards: id=${a1.id}, slug=${a1.slug}, imageUrl=${a1.imageUrl}`);

    console.log('[SEED] → Processing Steph Curry...');
    const a2 = await prisma.athlete.upsert({
      where: { slug: 'steph-curry' },
      update: {
        name: 'Steph Curry',
        team: 'Warriors',
        league: 'NBA',
        imageUrl: '/images/steph-curry.jpg',  // CLEAN URL
        active: true
      },
      create: {
        slug: 'steph-curry',
        name: 'Steph Curry',
        team: 'Warriors',
        league: 'NBA',
        imageUrl: '/images/steph-curry.jpg',  // CLEAN URL
        active: true
      }
    });
    console.log(`[SEED] ✓ Steph Curry: id=${a2.id}, slug=${a2.slug}, imageUrl=${a2.imageUrl}`);

    console.log('[SEED] → Processing Jayson Tatum...');
    const a3 = await prisma.athlete.upsert({
      where: { slug: 'jayson-tatum' },
      update: {
        name: 'Jayson Tatum',
        team: 'Celtics',
        league: 'NBA',
        imageUrl: '/images/jayson-tatum.jpg',  // CLEAN URL
        active: true
      },
      create: {
        slug: 'jayson-tatum',
        name: 'Jayson Tatum',
        team: 'Celtics',
        league: 'NBA',
        imageUrl: '/images/jayson-tatum.jpg',  // CLEAN URL
        active: true
      }
    });
    console.log(`[SEED] ✓ Jayson Tatum: id=${a3.id}, slug=${a3.slug}, imageUrl=${a3.imageUrl}`);

    console.log('[SEED] → Processing LeBron James...');
    const a4 = await prisma.athlete.upsert({
      where: { slug: 'lebron-james' },
      update: {
        name: 'LeBron James',
        team: 'Lakers',
        league: 'NBA',
        imageUrl: '/images/lebron-james.jpg',  // CLEAN URL
        active: true
      },
      create: {
        slug: 'lebron-james',
        name: 'LeBron James',
        team: 'Lakers',
        league: 'NBA',
        imageUrl: '/images/lebron-james.jpg',  // CLEAN URL
        active: true
      }
    });
    console.log(`[SEED] ✓ LeBron James: id=${a4.id}, slug=${a4.slug}, imageUrl=${a4.imageUrl}`);

    console.log('[SEED] → Processing Kevin Durant...');
    const a5 = await prisma.athlete.upsert({
      where: { slug: 'kevin-durant' },
      update: {
        name: 'Kevin Durant',
        team: 'Suns',
        league: 'NBA',
        imageUrl: '/images/kevin-durant.jpg',  // CLEAN URL
        active: true
      },
      create: {
        slug: 'kevin-durant',
        name: 'Kevin Durant',
        team: 'Suns',
        league: 'NBA',
        imageUrl: '/images/kevin-durant.jpg',  // CLEAN URL
        active: true
      }
    });
    console.log(`[SEED] ✓ Kevin Durant: id=${a5.id}, slug=${a5.slug}, imageUrl=${a5.imageUrl}`);

    console.log('[SEED] → Processing Shai Gilgeous-Alexander...');
    const a6 = await prisma.athlete.upsert({
      where: { slug: 'shai-gilgeous-alexander' },
      update: {
        name: 'Shai Gilgeous-Alexander',
        team: 'Thunder',
        league: 'NBA',
        imageUrl: '/images/shai-gilgeous-alexander.jpg',  // CLEAN URL
        active: true
      },
      create: {
        slug: 'shai-gilgeous-alexander',
        name: 'Shai Gilgeous-Alexander',
        team: 'Thunder',
        league: 'NBA',
        imageUrl: '/images/shai-gilgeous-alexander.jpg',  // CLEAN URL
        active: true
      }
    });
    console.log(`[SEED] ✓ Shai Gilgeous-Alexander: id=${a6.id}, slug=${a6.slug}, imageUrl=${a6.imageUrl}`);

    console.log('[SEED] Athletes created successfully!');
    console.log('[SEED] Total athletes in database:');
    const athletes = await prisma.athlete.findMany({
      orderBy: { name: 'asc' }
    });
    athletes.forEach(a => {
      console.log(`[SEED]   - ${a.name} (${a.team}) [${a.slug}] imageUrl=${a.imageUrl} active=${a.active}`);
    });

    // Create sample games
    console.log('[SEED] Creating sample games...');
    const today = new Date();
    const days = d => new Date(today.getTime() + d * 86400000);

    const existingGames = await prisma.game.count();
    console.log(`[SEED] Found ${existingGames} existing games`);

    if (existingGames === 0) {
      console.log('[SEED] → Creating games for athletes...');
      const gamesCreated = await prisma.game.createMany({
        data: [
          { athleteId: a1.id, date: days(10), opponent: 'Jazz', venue: 'Target Center' },
          { athleteId: a1.id, date: days(25), opponent: 'Nuggets', venue: 'Target Center' },
          { athleteId: a2.id, date: days(12), opponent: 'Lakers', venue: 'Chase Center' },
          { athleteId: a2.id, date: days(30), opponent: 'Suns', venue: 'Chase Center' },
          { athleteId: a3.id, date: days(15), opponent: 'Heat', venue: 'TD Garden' },
          { athleteId: a3.id, date: days(20), opponent: 'Knicks', venue: 'TD Garden' },
          { athleteId: a4.id, date: days(8), opponent: 'Clippers', venue: 'Crypto.com Arena' },
          { athleteId: a4.id, date: days(22), opponent: 'Warriors', venue: 'Crypto.com Arena' },
          { athleteId: a5.id, date: days(14), opponent: 'Mavericks', venue: 'Footprint Center' },
          { athleteId: a6.id, date: days(18), opponent: 'Spurs', venue: 'Paycom Center' },
        ],
        skipDuplicates: true
      });
      console.log(`[SEED] ✓ Created ${gamesCreated.count} new games`);
    }

    const totalGames = await prisma.game.count();
    console.log(`[SEED] Total games in database: ${totalGames}`);

    console.log('═══════════════════════════════════════════════');
    console.log('[SEED] ✓✓✓ SEED COMPLETED SUCCESSFULLY ✓✓✓');
    console.log('═══════════════════════════════════════════════');

    // Verify data is accessible
    console.log('[SEED] Final verification:');
    const finalAthletes = await prisma.athlete.findMany({
      select: { id: true, name: true, team: true, league: true, slug: true, imageUrl: true, active: true }
    });
    console.log('[SEED] Athletes that will be returned by API:');
    console.log(JSON.stringify(finalAthletes, null, 2));

  } catch (error) {
    console.error('═══════════════════════════════════════════════');
    console.error('[SEED] ✗✗✗ ERROR DURING SEEDING ✗✗✗');
    console.error('═══════════════════════════════════════════════');
    console.error('[SEED] Error name:', error.name);
    console.error('[SEED] Error message:', error.message);
    console.error('[SEED] Stack trace:', error.stack);
    throw error;
  }
}

run()
  .then(() => {
    console.log('[SEED] Disconnecting from database...');
    return prisma.$disconnect();
  })
  .then(() => {
    console.log('[SEED] ✓ Disconnected successfully');
    process.exit(0);
  })
  .catch((e) => {
    console.error('[SEED] Fatal error:', e);
    prisma.$disconnect();
    process.exit(1);
  });