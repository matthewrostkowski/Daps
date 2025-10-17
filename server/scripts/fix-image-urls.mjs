// scripts/fix-image-urls.js
// Run this ONCE to fix existing database records
// Usage: node scripts/fix-image-urls.js

import { prisma } from '../src/db.js';

const cleanImageMap = {
  'anthony-edwards': '/images/anthony-edwards.jpg',
  'steph-curry': '/images/steph-curry.jpg',
  'jayson-tatum': '/images/jayson-tatum.jpg',
  'lebron-james': '/images/lebron-james.jpg',
  'kevin-durant': '/images/kevin-durant.jpg',
  'shai-gilgeous-alexander': '/images/shai-gilgeous-alexander.jpg',
};

async function fixImageUrls() {
  console.log('═══════════════════════════════════════════════');
  console.log('[FIX] Fixing image URLs in database...');
  console.log('═══════════════════════════════════════════════');

  try {
    await prisma.$connect();
    console.log('[FIX] ✓ Connected to database');

    // Get all athletes
    const athletes = await prisma.athlete.findMany();
    console.log(`[FIX] Found ${athletes.length} athletes`);

    let updated = 0;
    for (const athlete of athletes) {
      const cleanUrl = cleanImageMap[athlete.slug];
      
      if (cleanUrl && athlete.imageUrl !== cleanUrl) {
        console.log(`[FIX] Updating ${athlete.name}: "${athlete.imageUrl}" → "${cleanUrl}"`);
        await prisma.athlete.update({
          where: { id: athlete.id },
          data: { imageUrl: cleanUrl }
        });
        updated++;
      } else {
        console.log(`[FIX] Skipping ${athlete.name} (already has clean URL or not in map)`);
      }
    }

    console.log(`[FIX] ✓ Updated ${updated} athletes`);

    // Verify final state
    const finalAthletes = await prisma.athlete.findMany({
      select: { name: true, slug: true, imageUrl: true }
    });
    console.log('[FIX] Final state:');
    finalAthletes.forEach(a => {
      console.log(`[FIX]   - ${a.name}: ${a.imageUrl}`);
    });

    console.log('═══════════════════════════════════════════════');
    console.log('[FIX] ✓✓✓ IMAGE URL FIX COMPLETED ✓✓✓');
    console.log('═══════════════════════════════════════════════');

  } catch (error) {
    console.error('[FIX] ERROR:', error);
    throw error;
  }
}

fixImageUrls()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[FIX] Fatal error:', e);
    prisma.$disconnect();
    process.exit(1);
  });