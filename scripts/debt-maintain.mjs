#!/usr/bin/env node
// Technical Debt Maintenance Utility (Phase D implemented)
// Commands:
//  --list                          : print dashboard (OPEN + DONE summary + chronology)
//  --new "Title" --category X --priority Y [--exit "Exit criteria"] [--no-section]
//                                   creates next TD-XXX row in OPEN + optional detailed section
//  --archive-stale [--days 14] [--dry-run]
//                                   move COOLDOWN entries older than threshold days to archive
//                                   (graceful no-op if no COOLDOWN section)
//  --help                          : usage
//
// Design goals: zero deps, idempotent, minimal mutation & stable formatting.

import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MAIN = path.join(ROOT, 'handbook', 'TECH-DEBT.md');
const ARCHIVE = path.join(ROOT, 'handbook', 'TECH-DEBT-ARCHIVE.md');

function usage(){
  console.log(`Usage:\n  node scripts/debt-maintain.mjs --list\n  node scripts/debt-maintain.mjs --new "Title" --category Cat --priority P [--exit "Exit"] [--no-section]\n  node scripts/debt-maintain.mjs --archive-stale [--days 14] [--dry-run]\n`);
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

function readTextSafe(file){
  return existsSync(file) ? readFileSync(file,'utf8') : '';
}

function listDashboard(){
  const text = readFileSync(MAIN,'utf8');
  const openSectionMatch = text.match(/### OPEN[\s\S]*?### DONE/);
  const doneMatch = text.match(/### DONE[\s\S]*?(?:### Vue Chronologique|---)/);
  const chronoMatch = text.match(/### Vue Chronologique[\s\S]*?---/);
  console.log('\n[DEBT] DASHBOARD\n');
  if (openSectionMatch) console.log(openSectionMatch[0].trim());
  if (doneMatch) console.log('\n' + doneMatch[0].trim());
  if (chronoMatch) console.log('\n' + chronoMatch[0].trim());
  console.log('\n(Archive: handbook/TECH-DEBT-ARCHIVE.md)');
}

function collectAllIds(){
  const all = readTextSafe(MAIN) + '\n' + readTextSafe(ARCHIVE);
  const ids = Array.from(all.matchAll(/TD-(\d{3})/g)).map(m=>parseInt(m[1],10));
  return ids.sort((a,b)=>a-b);
}

function nextId(){
  const ids = collectAllIds();
  const max = ids.length ? ids[ids.length-1] : 0;
  const n = max + 1;
  return 'TD-' + String(n).padStart(3,'0');
}

function pluralizeDettes(n){
  return n > 1 ? `${n} dettes ouvertes.` : `${n} dette ouverte.`;
}

function insertOpenRow(mainText, row){
  const openHeaderIdx = mainText.indexOf('### OPEN');
  if (openHeaderIdx === -1) throw new Error('OPEN section not found');
  // Extract portion from OPEN heading to DONE heading
  const doneIdx = mainText.indexOf('### DONE');
  if (doneIdx === -1) throw new Error('DONE section not found');
  const before = mainText.slice(0, openHeaderIdx);
  const openBlock = mainText.slice(openHeaderIdx, doneIdx);
  const after = mainText.slice(doneIdx);
  const lines = openBlock.split(/\r?\n/);
  // Update count line (Actuellement: ...)
  const countLineIdx = lines.findIndex(l=>/Actuellement:/.test(l));
  // Count existing rows
  const existingRows = lines.filter(l=>/^\|\s*TD-\d+\s*\|/.test(l));
  const newCount = existingRows.length + 1;
  if (countLineIdx !== -1) {
    lines[countLineIdx] = lines[countLineIdx].replace(/Actuellement:.*/, `Actuellement: ${pluralizeDettes(newCount)}`);
  }
  // Find last data row index (after header + separator lines)
  let insertAfter = -1;
  for (let i=0;i<lines.length;i++){
    if (/^\|\s*TD-\d+\s*\|/.test(lines[i])) insertAfter = i;
  }
  if (insertAfter === -1){
    // Insert after separator line (the line of dashes following header)
    const sepIdx = lines.findIndex(l=>/^\|----/.test(l));
    if (sepIdx === -1) throw new Error('OPEN table separator not found');
    lines.splice(sepIdx+1,0,row);
  } else {
    lines.splice(insertAfter+1,0,row);
  }
  const newOpenBlock = lines.join('\n');
  return before + newOpenBlock + after;
}

function addChronologyBullet(mainText, id, title){
  const chronoIdx = mainText.indexOf('### Vue Chronologique');
  if (chronoIdx === -1) return mainText; // no chronology section
  const endIdx = mainText.indexOf('\n---', chronoIdx) !== -1 ? mainText.indexOf('\n---', chronoIdx) : chronoIdx;
  const segment = mainText.slice(chronoIdx, endIdx);
  const lines = segment.split(/\r?\n/);
  const bulletLine = `- ${id} → ${title}`;
  // Avoid duplicate
  if (segment.includes(bulletLine)) return mainText;
  // Insert after heading line
  const headingLineIdx = lines.findIndex(l=>/^### Vue Chronologique/.test(l));
  if (headingLineIdx !== -1){
    lines.splice(headingLineIdx+1,0,bulletLine);
    const newSegment = lines.join('\n');
    return mainText.slice(0, chronoIdx) + newSegment + mainText.slice(chronoIdx + segment.length);
  }
  return mainText;
}

function createDetailedSection(id, title, category, priority, exitCriteria){
  const bullets = exitCriteria.split(/\n|;|\.|\r/).map(s=>s.trim()).filter(Boolean);
  const exitList = bullets.map(b=>`- ${b}`).join('\n');
  return `\n---\n## ${id} ${title} (OPEN)\nContexte:\nTODO.\n\nObjectifs:\n- TODO\n\nExit Criteria:\n${exitList || '- Définir exit criteria'}\n\nPriorité: ${priority}\nCatégorie: ${category}\nStatus: OPEN.\n`;
}

function cmdNew(flags){
  const title = flags.new && typeof flags.new === 'string' ? flags.new : null;
  const category = flags.category;
  const priority = flags.priority;
  const exitCriteria = flags.exit || 'Définir exit criteria';
  if (!title || !category || !priority){
    console.error('[ERROR] --new requires: --new "Title" --category X --priority Y');
    process.exit(2);
  }
  const id = nextId();
  let mainText = readFileSync(MAIN,'utf8');
  const row = `| ${id} | ${category} | ${title} | ${priority} | ${exitCriteria} |`;
  mainText = insertOpenRow(mainText, row);
  mainText = addChronologyBullet(mainText, id, title.substring(0, 60));
  if (!flags['no-section']) {
    mainText = mainText.trimEnd() + createDetailedSection(id, title, category, priority, exitCriteria);
  }
  writeFileSync(MAIN, mainText, 'utf8');
  console.log(`[NEW] ${id} added to OPEN.`);
  if (!flags['no-section']) console.log(`[NEW] Detailed section appended.`);
}

// COOLDOWN archival logic (graceful if missing)
// Expected COOLDOWN section format (example):
// ### COOLDOWN
// | ID | Catégorie | Titre | Priorité | Since | Exit Criteria |
// |----|-----------|-------|----------|-------|---------------|
// | TD-010 | Build | Example | Low | 2025-09-01 | ... |

function parseCooldown(mainText){
  const match = mainText.match(/### COOLDOWN[\s\S]*?(?:###|---)/);
  if (!match) return { block: null, entries: [], start: -1, end: -1 };
  const block = match[0];
  const start = match.index;
  const end = start + block.length;
  const lines = block.split(/\r?\n/);
  const entries = lines.filter(l=>/^\|\s*TD-\d+/.test(l)).map(line=>{
    const cols = line.split('|').map(c=>c.trim());
    const id = cols[1];
    // naive detection of date column
    const dateCol = cols.find(c=>/^20\d{2}-\d{2}-\d{2}$/.test(c));
    return { line, id, date: dateCol || null };
  });
  return { block, entries, start, end };
}

function cmdArchiveStale(flags){
  const days = parseInt(flags.days || '14', 10);
  const mainText = readFileSync(MAIN,'utf8');
  const { block, entries, start, end } = parseCooldown(mainText);
  if (!block || entries.length === 0){
    console.log('[ARCHIVE] No COOLDOWN entries found. Nothing to do.');
    return;
  }
  const now = Date.now();
  const msThreshold = days * 86400000;
  const stale = entries.filter(e=>e.date && (now - Date.parse(e.date)) > msThreshold);
  if (stale.length === 0){
    console.log(`[ARCHIVE] No entries older than ${days} days.`);
    return;
  }
  console.log(`[ARCHIVE] Candidates (${stale.length}): ${stale.map(s=>s.id).join(', ')}`);
  if (flags['dry-run']){ return; }
  // Remove stale lines from cooldown block
  let newBlock = block;
  for (const s of stale){
    newBlock = newBlock.replace(s.line + '\n','').replace(s.line,'');
  }
  let newMain = mainText.slice(0,start) + newBlock + mainText.slice(end);
  // Append to archive file with simple stubs if not already present
  for (const s of stale){
    if (!existsSync(ARCHIVE) || !readFileSync(ARCHIVE,'utf8').includes(s.id)){
      appendFileSync(ARCHIVE, `\n---\n## ${s.id} (ARCHIVED via cooldown)\nStatus: COMPLETE.\n`);
    }
  }
  writeFileSync(MAIN, newMain, 'utf8');
  console.log('[ARCHIVE] Completed.');
}

function main(){
  const flags = parseArgs();
  if (flags.help || Object.keys(flags).length === 0) {
    usage();
    return;
  }
  if (flags.list) return listDashboard();
  if (flags.new) return cmdNew(flags);
  if (flags['archive-stale']) return cmdArchiveStale(flags);
  console.error('Unknown command.');
  usage();
  process.exit(1);
}

main();
