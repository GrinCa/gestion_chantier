#!/usr/bin/env node
// save-session.mjs
// Automatisation "sauvegarde travail" + génération handoff.
// Modes:
//   par défaut : autosave + handoff + snippet
//   --raw      : n'effectue PAS d'autosave, produit uniquement le bloc handoff (équivalent ancien prepare-handoff)
// Étapes:
// 1. (optionnel) Commit auto (si sale et pas --raw)
// 2. Génère handoff (logique interne, ex-prepare-handoff.mjs)
// 3. Ajoute une suggestion ProposedDeliverable si placeholder
// 4. Affiche bloc + snippet (pas d'écriture de fichier persisté)

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

function sh(cmd, opts={}) { try { return execSync(cmd, { stdio:['ignore','pipe','ignore'], ...opts }).toString().trim(); } catch { return ''; } }

const RAW_MODE = process.argv.includes('--raw');
let dirty = [];
if (!RAW_MODE) {
  const status = sh('git status --porcelain');
  dirty = status.split(/\r?\n/).filter(Boolean);
  if (dirty.length) {
    try {
      execSync('git add -A', { stdio:'ignore' });
      const ts = new Date().toISOString().replace(/[:T]/g,'-').slice(0,19);
      const msg = `chore(session): autosave before handoff ${ts}`;
      execSync(`git commit -m "${msg}"`, { stdio:'ignore' });
      console.log(`✔ Autosave commit créé: ${msg}`);
    } catch (e) {
      console.log('⚠ Autosave impossible (on continue).');
    }
  } else {
    console.log('✔ Aucun changement à committer.');
  }
}

// === Handoff generation (inline ex-prepare-handoff) ===
function extractTasks(){
  const path = 'handbook/TODO.md';
  if(!existsSync(path)) return [];
  const raw = readFileSync(path,'utf8').split(/\r?\n/);
  const candidates = raw.filter(l=> /^- \[ \]/.test(l)).slice(0,10).map(l=> l.replace(/^- \[ \] /,''));
  return candidates.slice(0,3);
}
function extractDebts(){
  const path = 'handbook/TECH-DEBT.md';
  if(!existsSync(path)) return [];
  return readFileSync(path,'utf8').split(/\r?\n/)
    .filter(l=> /^\| TD-/.test(l))
    .map(l=> l.split('|').map(s=> s.trim()))
    .filter(cols=> /OPEN|ACTIVE|PLANNED/i.test(cols[4]||''))
    .slice(0,3)
    .map(cols=> cols[1]);
}

const branch = sh('git rev-parse --abbrev-ref HEAD');
const head = sh('git rev-parse --short HEAD');
const lastCommitsRaw = sh('git log -5 --oneline');
const lastCommits = lastCommitsRaw.split(/\r?\n/).filter(Boolean);
const status2 = sh('git status --porcelain');
const dirty2 = status2.split(/\r?\n/).filter(Boolean);
const tasks = extractTasks();
const debts = extractDebts();

const hl = [];
hl.push('Handoff:');
hl.push(`  GeneratedAt: ${new Date().toISOString()}`);
hl.push(`  Branch: ${branch} @ ${head}`);
hl.push(`  Dirty: ${dirty2.length? 'YES':'NO'}`);
if(dirty2.length){
  hl.push('  DirtyFiles:');
  dirty2.slice(0,8).forEach(l=> hl.push('    - '+l));
  if(dirty2.length>8) hl.push('    - ...');
}
hl.push(`  Focus: ${[...debts].join(', ') || 'NONE'}`);
hl.push('  LastCommits:');
lastCommits.forEach(c=> hl.push('    - '+c));
hl.push('  NextTasks:');
tasks.forEach((t,i)=> hl.push(`    ${i+1}. ${t}`));
if(!tasks.length) hl.push('    (none detected)');
hl.push('  ProposedDeliverable: <remplir avant fin de session>');
hl.push('  Risks: <1 ligne>');
hl.push('');
hl.push('Instructions: Copier ce bloc dans la prochaine session, compléter ProposedDeliverable + Risks, puis demander patch tâche 1.');

let handoff = hl.join('\n');

// Analyse / injection ProposedDeliverable si placeholder
const lines = handoff.split(/\r?\n/);
let hasDeliverable = false;
let deliverableIndex = -1;
for (let i=0;i<lines.length;i++) {
  if (/^\s*ProposedDeliverable:/.test(lines[i])) { hasDeliverable = true; deliverableIndex = i; break; }
}

// Déterminer suggestion si TD-001 dans Focus (issues supprimées)
let focusLine = lines.find(l=> /Focus:/.test(l))||'';
const suggestTD001 = /TD-001/.test(focusLine);
let suggestion = '';
if (suggestTD001) {
  suggestion = 'feat(core): node/browser export skeleton (TD-001, KI-001)';
}

if (hasDeliverable && deliverableIndex !== -1) {
  if (/ProposedDeliverable:\s*<remplir/.test(lines[deliverableIndex]) && suggestion) {
    lines[deliverableIndex] = '  ProposedDeliverable: ' + suggestion;
  }
}

// Snippet démarrage prochaine session (15 lignes max)
function buildNextSessionSnippet() {
  const branch = sh('git rev-parse --abbrev-ref HEAD');
  const sha = sh('git rev-parse --short HEAD');
  const tasks = [];
  let captureTasks = false; let count=0;
  for (const l of lines) {
    if (/^\s*NextTasks:/.test(l)) { captureTasks = true; continue; }
    if (captureTasks) {
      if (/^\s{4,}\d+\./.test(l) && count < 3) { tasks.push(l.trim().replace(/^\d+\.\s*/,'- ')); count++; continue; }
      if (!/^\s{4,}\d+\./.test(l)) break;
    }
  }
  const deliverable = suggestion || '<définir>'; 
  return [
    'Session:',
    `  Branch: ${branch} @ ${sha}`,
    `  Focus: ${suggestTD001? 'TD-001, KI-001' : focusLine.replace(/.*Focus:\s*/,'') || 'N/A'}`,
    `  Deliverable: ${deliverable}`,
    '  Tasks:',
    ...tasks.map(t=>'    '+t),
    '  NextAction: patch task 1 only'
  ].join('\n');
}

handoff = lines.join('\n');
const nextSnippet = buildNextSessionSnippet();

if (RAW_MODE) {
  // Mode brut: uniquement le bloc handoff
  process.stdout.write(handoff + '\n');
  process.exit(0);
}

console.log('\n=== HANDOFF BLOCK ===');
console.log(handoff);
console.log('\n=== NEXT SESSION SNIPPET ===');
console.log(nextSnippet);
console.log('\n(NOTE: Utiliser --raw pour bloc seul, pas d\'autosave)');
