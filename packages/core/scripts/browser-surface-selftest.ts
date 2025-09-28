/**
 * browser-surface-selftest.ts
 * Vérifie que la surface browser n'importe pas sqlite3.
 * Approche simple: recherche de la chaîne 'sqlite3' dans le build browser.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function run() {
  const file = join(process.cwd(), 'dist', 'index.browser.js');
  const content = readFileSync(file, 'utf8');
  if (/sqlite3/i.test(content)) {
    console.error('❌ index.browser.js contient une référence à sqlite3');
    process.exit(1);
  }
  console.log('✅ Surface browser propre (pas de sqlite3)');
}

run();
