// src/seed.js - Enhanced with realistic NBA 2024-25 season games
import { prisma } from './db.js';

async function run() {
  console.log('═══════════════════════════════════════════════');
  console.log('[SEED] Starting database seed...');
  console.log('═══════════════════════════════════════════════');

  try {
    console.log('[SEED] Testing database connection...');
    await prisma.$connect();
    console.log('[SEED] ✓ Database connected successfully');

    console.log('[SEED] Checking existing athletes...');
    const existingCount = await prisma.athlete.count();
    console.log(`[SEED] Found ${existingCount} existing athletes in database`);

    // Upsert Athletes
    console.log('[SEED] Creating/updating athletes...');
    
    const a1 = await prisma.athlete.upsert({
      where: { slug: 'anthony-edwards' },
      update: {
        name: 'Anthony Edwards',
        team: 'Timberwolves',
        league: 'NBA',
        imageUrl: '/images/anthony-edwards.jpg',
        active: true
      },
      create: {
        slug: 'anthony-edwards',
        name: 'Anthony Edwards',
        team: 'Timberwolves',
        league: 'NBA',
        imageUrl: '/images/anthony-edwards.jpg',
        active: true
      }
    });

    const a2 = await prisma.athlete.upsert({
      where: { slug: 'steph-curry' },
      update: {
        name: 'Steph Curry',
        team: 'Warriors',
        league: 'NBA',
        imageUrl: '/images/steph-curry.jpg',
        active: true
      },
      create: {
        slug: 'steph-curry',
        name: 'Steph Curry',
        team: 'Warriors',
        league: 'NBA',
        imageUrl: '/images/steph-curry.jpg',
        active: true
      }
    });

    const a3 = await prisma.athlete.upsert({
      where: { slug: 'jayson-tatum' },
      update: {
        name: 'Jayson Tatum',
        team: 'Celtics',
        league: 'NBA',
        imageUrl: '/images/jayson-tatum.jpg',
        active: true
      },
      create: {
        slug: 'jayson-tatum',
        name: 'Jayson Tatum',
        team: 'Celtics',
        league: 'NBA',
        imageUrl: '/images/jayson-tatum.jpg',
        active: true
      }
    });

    const a4 = await prisma.athlete.upsert({
      where: { slug: 'lebron-james' },
      update: {
        name: 'LeBron James',
        team: 'Lakers',
        league: 'NBA',
        imageUrl: '/images/lebron-james.jpg',
        active: true
      },
      create: {
        slug: 'lebron-james',
        name: 'LeBron James',
        team: 'Lakers',
        league: 'NBA',
        imageUrl: '/images/lebron-james.jpg',
        active: true
      }
    });

    const a5 = await prisma.athlete.upsert({
      where: { slug: 'kevin-durant' },
      update: {
        name: 'Kevin Durant',
        team: 'Suns',
        league: 'NBA',
        imageUrl: '/images/kevin-durant.jpg',
        active: true
      },
      create: {
        slug: 'kevin-durant',
        name: 'Kevin Durant',
        team: 'Suns',
        league: 'NBA',
        imageUrl: '/images/kevin-durant.jpg',
        active: true
      }
    });

    const a6 = await prisma.athlete.upsert({
      where: { slug: 'shai-gilgeous-alexander' },
      update: {
        name: 'Shai Gilgeous-Alexander',
        team: 'Thunder',
        league: 'NBA',
        imageUrl: '/images/shai-gilgeous-alexander.jpg',
        active: true
      },
      create: {
        slug: 'shai-gilgeous-alexander',
        name: 'Shai Gilgeous-Alexander',
        team: 'Thunder',
        league: 'NBA',
        imageUrl: '/images/shai-gilgeous-alexander.jpg',
        active: true
      }
    });

    console.log('[SEED] ✓ Athletes created successfully');

    // Create realistic NBA 2024-25 season games
    console.log('[SEED] Creating NBA 2024-25 season games...');
    const today = new Date();
    const days = d => new Date(today.getTime() + d * 86400000);

    const existingGames = await prisma.game.count();
    console.log(`[SEED] Found ${existingGames} existing games`);

    if (existingGames === 0) {
      const gamesData = [
        // Anthony Edwards (Timberwolves) - Mix of past and upcoming games
        { athleteId: a1.id, date: days(-15), opponent: 'Lakers', venue: 'Target Center' },
        { athleteId: a1.id, date: days(-10), opponent: 'Nuggets', venue: 'Ball Arena' },
        { athleteId: a1.id, date: days(-5), opponent: 'Warriors', venue: 'Target Center' },
        { athleteId: a1.id, date: days(-2), opponent: 'Suns', venue: 'Footprint Center' },
        { athleteId: a1.id, date: days(3), opponent: 'Thunder', venue: 'Target Center' },
        { athleteId: a1.id, date: days(7), opponent: 'Mavericks', venue: 'American Airlines Center' },
        { athleteId: a1.id, date: days(10), opponent: 'Jazz', venue: 'Target Center' },
        { athleteId: a1.id, date: days(14), opponent: 'Clippers', venue: 'Crypto.com Arena' },
        { athleteId: a1.id, date: days(18), opponent: 'Grizzlies', venue: 'Target Center' },
        { athleteId: a1.id, date: days(25), opponent: 'Nuggets', venue: 'Target Center' },
        { athleteId: a1.id, date: days(30), opponent: 'Kings', venue: 'Golden 1 Center' },

        // Steph Curry (Warriors)
        { athleteId: a2.id, date: days(-14), opponent: 'Suns', venue: 'Chase Center' },
        { athleteId: a2.id, date: days(-8), opponent: 'Timberwolves', venue: 'Target Center' },
        { athleteId: a2.id, date: days(-3), opponent: 'Clippers', venue: 'Crypto.com Arena' },
        { athleteId: a2.id, date: days(2), opponent: 'Kings', venue: 'Chase Center' },
        { athleteId: a2.id, date: days(6), opponent: 'Nuggets', venue: 'Chase Center' },
        { athleteId: a2.id, date: days(12), opponent: 'Lakers', venue: 'Chase Center' },
        { athleteId: a2.id, date: days(17), opponent: 'Mavericks', venue: 'American Airlines Center' },
        { athleteId: a2.id, date: days(22), opponent: 'Thunder', venue: 'Chase Center' },
        { athleteId: a2.id, date: days(28), opponent: 'Jazz', venue: 'Delta Center' },
        { athleteId: a2.id, date: days(30), opponent: 'Suns', venue: 'Chase Center' },

        // Jayson Tatum (Celtics)
        { athleteId: a3.id, date: days(-12), opponent: '76ers', venue: 'TD Garden' },
        { athleteId: a3.id, date: days(-7), opponent: 'Bucks', venue: 'Fiserv Forum' },
        { athleteId: a3.id, date: days(-4), opponent: 'Knicks', venue: 'TD Garden' },
        { athleteId: a3.id, date: days(1), opponent: 'Cavaliers', venue: 'Rocket Mortgage FieldHouse' },
        { athleteId: a3.id, date: days(5), opponent: 'Heat', venue: 'TD Garden' },
        { athleteId: a3.id, date: days(9), opponent: 'Nets', venue: 'Barclays Center' },
        { athleteId: a3.id, date: days(15), opponent: 'Heat', venue: 'TD Garden' },
        { athleteId: a3.id, date: days(20), opponent: 'Knicks', venue: 'TD Garden' },
        { athleteId: a3.id, date: days(24), opponent: 'Raptors', venue: 'Scotiabank Arena' },
        { athleteId: a3.id, date: days(29), opponent: 'Magic', venue: 'TD Garden' },

        // LeBron James (Lakers)
        { athleteId: a4.id, date: days(-13), opponent: 'Suns', venue: 'Crypto.com Arena' },
        { athleteId: a4.id, date: days(-9), opponent: 'Warriors', venue: 'Crypto.com Arena' },
        { athleteId: a4.id, date: days(-6), opponent: 'Nuggets', venue: 'Ball Arena' },
        { athleteId: a4.id, date: days(-1), opponent: 'Clippers', venue: 'Crypto.com Arena' },
        { athleteId: a4.id, date: days(4), opponent: 'Kings', venue: 'Golden 1 Center' },
        { athleteId: a4.id, date: days(8), opponent: 'Clippers', venue: 'Crypto.com Arena' },
        { athleteId: a4.id, date: days(13), opponent: 'Mavericks', venue: 'Crypto.com Arena' },
        { athleteId: a4.id, date: days(19), opponent: 'Pelicans', venue: 'Smoothie King Center' },
        { athleteId: a4.id, date: days(22), opponent: 'Warriors', venue: 'Crypto.com Arena' },
        { athleteId: a4.id, date: days(27), opponent: 'Thunder', venue: 'Paycom Center' },

        // Kevin Durant (Suns)
        { athleteId: a5.id, date: days(-11), opponent: 'Mavericks', venue: 'Footprint Center' },
        { athleteId: a5.id, date: days(-6), opponent: 'Clippers', venue: 'Crypto.com Arena' },
        { athleteId: a5.id, date: days(-2), opponent: 'Lakers', venue: 'Footprint Center' },
        { athleteId: a5.id, date: days(3), opponent: 'Warriors', venue: 'Footprint Center' },
        { athleteId: a5.id, date: days(8), opponent: 'Kings', venue: 'Footprint Center' },
        { athleteId: a5.id, date: days(11), opponent: 'Thunder', venue: 'Paycom Center' },
        { athleteId: a5.id, date: days(14), opponent: 'Mavericks', venue: 'Footprint Center' },
        { athleteId: a5.id, date: days(21), opponent: 'Nuggets', venue: 'Ball Arena' },
        { athleteId: a5.id, date: days(26), opponent: 'Jazz', venue: 'Footprint Center' },
        { athleteId: a5.id, date: days(31), opponent: 'Pelicans', venue: 'Footprint Center' },

        // Shai Gilgeous-Alexander (Thunder)
        { athleteId: a6.id, date: days(-10), opponent: 'Mavericks', venue: 'Paycom Center' },
        { athleteId: a6.id, date: days(-5), opponent: 'Nuggets', venue: 'Ball Arena' },
        { athleteId: a6.id, date: days(-1), opponent: 'Kings', venue: 'Paycom Center' },
        { athleteId: a6.id, date: days(4), opponent: 'Grizzlies', venue: 'FedExForum' },
        { athleteId: a6.id, date: days(9), opponent: 'Timberwolves', venue: 'Paycom Center' },
        { athleteId: a6.id, date: days(13), opponent: 'Pelicans', venue: 'Paycom Center' },
        { athleteId: a6.id, date: days(18), opponent: 'Spurs', venue: 'Paycom Center' },
        { athleteId: a6.id, date: days(23), opponent: 'Rockets', venue: 'Toyota Center' },
        { athleteId: a6.id, date: days(28), opponent: 'Clippers', venue: 'Paycom Center' },
        { athleteId: a6.id, date: days(32), opponent: 'Jazz', venue: 'Delta Center' },
      ];

      const created = await prisma.game.createMany({
        data: gamesData,
        skipDuplicates: true
      });
      console.log(`[SEED] ✓ Created ${created.count} new games`);
    }

    const totalGames = await prisma.game.count();
    console.log(`[SEED] Total games in database: ${totalGames}`);

    console.log('═══════════════════════════════════════════════');
    console.log('[SEED] ✓✓✓ SEED COMPLETED SUCCESSFULLY ✓✓✓');
    console.log('═══════════════════════════════════════════════');

  } catch (error) {
    console.error('═══════════════════════════════════════════════');
    console.error('[SEED] ✗✗✗ ERROR DURING SEEDING ✗✗✗');
    console.error('═══════════════════════════════════════════════');
    console.error('[SEED] Error:', error.message);
    console.error('[SEED] Stack:', error.stack);
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