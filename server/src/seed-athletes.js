import { prisma } from './db.js';

const athletes = [
  { slug: 'anthony-edwards', name: 'Anthony Edwards', team: 'Timberwolves', league: 'NBA', imageUrl: '/images/Screenshot 2025-08-03 at 11.28.01 PM (2).jpg' },
  { slug: 'steph-curry', name: 'Steph Curry', team: 'Warriors', league: 'NBA', imageUrl: '/images/Screenshot 2025-08-03 at 11.28.01 PM (2).png' },
  { slug: 'shai-gilgeous-alexander', name: 'Shai Gilgeous-Alexander', team: 'Thunder', league: 'NBA', imageUrl: '/images/Screenshot 2025-08-03 at 11.28.01 PM (7).png' },
  { slug: 'lebron-james', name: 'LeBron James', team: 'Lakers', league: 'NBA', imageUrl: '/images/Screenshot 2025-08-03 at 11.28.01 PM (3).png' },
  { slug: 'kevin-durant', name: 'Kevin Durant', team: 'Suns', league: 'NBA', imageUrl: '/images/Screenshot 2025-08-03 at 11.28.01 PM (4).png' },
  { slug: 'jayson-tatum', name: 'Jayson Tatum', team: 'Celtics', league: 'NBA', imageUrl: '/images/Screenshot 2025-08-03 at 11.28.01 PM (5).png' },
];

async function seed() {
  console.log('Seeding athletes...');
  
  for (const athlete of athletes) {
    await prisma.athlete.upsert({
      where: { slug: athlete.slug },
      update: athlete,
      create: athlete,
    });
    console.log(`✓ ${athlete.name}`);
  }
  
  console.log('Done!');
  process.exit(0);
}

seed().catch(console.error);
