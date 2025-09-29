#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const dist = path.join(process.cwd(), 'dist', 'assets');
let offending = [];
try {
  const files = readdirSync(dist).filter(f=>/\.js$/.test(f));
  for (const f of files){
    const content = readFileSync(path.join(dist,f),'utf8');
    if (/sqlite3/i.test(content)) offending.push(f);
  }
} catch(e){
  console.error('[verify-browser-surface] Dist assets introuvables:', e.message);
  process.exit(2);
}

if (offending.length){
  console.error('❌ sqlite3 trouvé dans bundle:', offending.join(', '));
  process.exit(1);
}
console.log('✅ Aucun fragment sqlite3 détecté dans le bundle browser');
