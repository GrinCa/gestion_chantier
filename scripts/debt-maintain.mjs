#!/usr/bin/env node
// Technical Debt Maintenance Utility (skeleton)
// Commands:
//  --list             : print dashboard (OPEN / ACTIVE / COOLDOWN) from TECH-DEBT.md
//  --archive-stale    : detect COOLDOWN entries older than policy and move to archive (NOT IMPLEMENTED yet)
//  --new "Title" --category Cat --priority M : scaffold new TD section & add to OPEN (NOT IMPLEMENTED yet)
//  --help             : usage
//
// Intent: keep runtime lightweight & zero external deps.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MAIN = path.join(ROOT, 'handbook', 'TECH-DEBT.md');
const ARCHIVE = path.join(ROOT, 'handbook', 'TECH-DEBT-ARCHIVE.md');

function usage(){
  console.log(`Usage: node scripts/debt-maintain.mjs [--list|--archive-stale|--new "Title" --category X --priority Y]\n`);
}

function parseArgs(){
  const args = process.argv.slice(2);
  const flags = {};
  for (let i=0;i<args.length;i++){
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.replace(/^--/,'');
      const val = (i+1 < args.length && !args[i+1].startsWith('--')) ? args[++i] : true;
      flags[key] = val;
    }
  }
  return flags;
}

function listDashboard(){
  const text = readFileSync(MAIN,'utf8');
  const openSectionMatch = text.match(/### OPEN[\s\S]*?### DONE/);
  const chronoMatch = text.match(/### Vue Chronologique[\s\S]*?---/);
  console.log('\n[DEBT] DASHBOARD\n');
  if (openSectionMatch) console.log(openSectionMatch[0].trim());
  if (chronoMatch) console.log('\n' + chronoMatch[0].trim());
  console.log('\n(Archive: handbook/TECH-DEBT-ARCHIVE.md)');
}

function main(){
  const flags = parseArgs();
  if (flags.help || Object.keys(flags).length === 0) {
    usage();
    return;
  }
  if (flags.list) return listDashboard();
  if (flags['archive-stale']) {
    console.error('[TODO] archive-stale not implemented yet.');
    process.exit(2);
  }
  if (flags.new) {
    console.error('[TODO] new TD scaffold not implemented yet.');
    process.exit(2);
  }
  console.error('Unknown command.');
  usage();
  process.exit(1);
}

main();
