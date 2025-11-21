// Usage: node scripts/fix-hero-url.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Candidate locations for index.html
const candidates = [
  path.resolve(__dirname, '../index.html'),     // /server/index.html (most common)
  path.resolve(__dirname, '../../index.html'),  // project root /index.html (fallback)
  path.resolve(process.cwd(), 'index.html'),    // wherever you're running from
];

let target = null;
for (const f of candidates) {
  if (fs.existsSync(f)) { target = f; break; }
}
if (!target) {
  console.error('[FIX] Could not find index.html. Checked:\n' + candidates.join('\n'));
  process.exit(1);
}

console.log('[FIX] Target file:', target);

const original = fs.readFileSync(target, 'utf8');
let updated = original;

// 1) Specific hero path -> relative path
const badHero = '/Users/matthewrostkowski/Documents/Daps/server/images/Daps_hero.jpeg';
const goodHero = './images/Daps_hero.jpeg';
if (updated.includes(badHero)) {
  updated = updated.split(badHero).join(goodHero);
  console.log('[FIX] Replaced specific hero path →', goodHero);
}

// 2) Generic: any absolute Mac path under /server/images/*  →  ./images/*
let genericCount = 0;
const macAbsRe = /\/Users\/[^"'()\s]+\/server\/images\/([^"'()\s]+)/g;
updated = updated.replace(macAbsRe, (_m, filename) => {
  genericCount++;
  return `./images/${filename}`;
});

// 3) Generic with file:// protocol prefix
const fileProtoRe = /file:\/\/\/Users\/[^"'()\s]+\/server\/images\/([^"'()\s]+)/g;
updated = updated.replace(fileProtoRe, (_m, filename) => {
  genericCount++;
  return `./images/${filename}`;
});

if (updated === original) {
  console.log('[FIX] No changes needed – paths already correct.');
} else {
  const backup = `${target}.bak-${Date.now()}`;
  fs.writeFileSync(backup, original);
  fs.writeFileSync(target, updated);
  console.log('[FIX] Wrote changes.');
  console.log('[FIX] Generic replacements applied:', genericCount);
  console.log('[FIX] Backup saved to:', backup);
}

console.log('[FIX] Done.');
