// src/test-subdomain.js - Test subdomain detection
import { getTeamConfig } from './team-config.js';

console.log('═══════════════════════════════════════════════');
console.log('Testing Subdomain Configuration');
console.log('═══════════════════════════════════════════════\n');

const testCases = [
  'localhost',
  'stjohns.localhost',
  'stjohns.daps.com',
  'uconn.daps.com',
  'warriors.daps.com',
  'www.daps.com'
];

testCases.forEach(hostname => {
  const config = getTeamConfig(hostname);
  console.log(`\n${hostname}`);
  console.log('  └─ Name:', config.name);
  console.log('  └─ League:', config.league);
  console.log('  └─ Primary Color:', config.primaryColor);
  if (config.teamName) {
    console.log('  └─ Team Name:', config.teamName);
  }
});

console.log('\n═══════════════════════════════════════════════');
console.log('✓ Test complete!');
console.log('═══════════════════════════════════════════════');