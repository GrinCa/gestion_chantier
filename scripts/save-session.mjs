#!/usr/bin/env node
// save-session.mjs
// Automatisation "sauvegarde travail" :
// 1. Commit auto (si sale) avec message horodaté
// 2. Génère handoff (réutilise prepare-handoff.mjs)
// 3. Ajoute une suggestion de ProposedDeliverable si vide (TD-001 prioritaire)
// 4. (Supprimé) LAST-HANDOFF.md n'est plus maintenu
// 5. Affiche un snippet minimal à coller en ouverture de prochaine session.

import { execSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';

function sh(cmd, opts={}) { try { return execSync(cmd, { stdio:['ignore','pipe','ignore'], ...opts }).toString().trim(); } catch { return ''; } }

const status = sh('git status --porcelain');
const dirty = status.split(/\r?\n/).filter(Boolean);
if (dirty.length) {
  // Stage tout puis commit
  try {
    execSync('git add -A', { stdio:'ignore' });
    const ts = new Date().toISOString().replace(/[:T]/g,'-').slice(0,19);
    const msg = `chore(session): autosave before handoff ${ts}`;
    execSync(`git commit -m "${msg}"`, { stdio:'ignore' });
    console.log(`✔ Autosave commit créé: ${msg}`);
  } catch (e) {
    console.log('⚠ Impossible de créer le commit autosave (continuer quand même).');
  }
} else {
  console.log('✔ Aucun changement à committer.');
}

// Récupérer handoff brut
let handoff = sh('node scripts/prepare-handoff.mjs');
if (!handoff) {
  console.error('Échec génération handoff.');
  process.exit(1);
}

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

console.log('\n=== HANDOFF BLOCK (no file persisted) ===');
console.log(handoff);
console.log('\n=== NEXT SESSION SNIPPET ===');
console.log(nextSnippet);
console.log('\n(NOTE: LAST-HANDOFF.md deprecated, nothing written)');
