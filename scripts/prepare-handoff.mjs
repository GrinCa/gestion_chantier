#!/usr/bin/env node
// Generates a concise handoff block for the next LLM session.
// No external deps; relies on git + handbook files.
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

function sh(cmd){
  try { return execSync(cmd,{stdio:['ignore','pipe','ignore']}).toString().trim(); }
  catch { return ''; }
}

const branch = sh('git rev-parse --abbrev-ref HEAD');
const head = sh('git rev-parse --short HEAD');
const lastCommitsRaw = sh('git log -5 --oneline');
const lastCommits = lastCommitsRaw.split(/\r?\n/).filter(Boolean);
const status = sh('git status --porcelain');
const dirty = status.split(/\r?\n/).filter(Boolean);

// Helper to extract first N unchecked tasks from TODO.md
function extractTasks(){
  const path = 'handbook/TODO.md';
  if(!existsSync(path)) return [];
  const raw = readFileSync(path,'utf8').split(/\r?\n/);
  const candidates = raw.filter(l=> /^- \[ \]/.test(l)).slice(0,10).map(l=> l.replace(/^- \[ \] /,''));
  return candidates.slice(0,3);
}

// Extract top OPEN / HIGH debts + accepted issues
function extractDebts(){
  const path = 'handbook/TECH-DEBT.md';
  if(!existsSync(path)) return [];
  return readFileSync(path,'utf8').split(/\r?\n/)
    .filter(l=> /^\| TD-/.test(l))
    .map(l=> l.split('|').map(s=> s.trim()))
    .filter(cols=> /OPEN|PLANNED/i.test(cols[4]||''))
    .slice(0,3)
    .map(cols=> cols[1]);
}
function extractIssues(){ return []; } // issues file removed

const tasks = extractTasks();
const debts = extractDebts();
const issues = extractIssues();

// Produce block
const lines = [];
lines.push('Handoff:');
lines.push(`  GeneratedAt: ${new Date().toISOString()}`);
lines.push(`  Branch: ${branch} @ ${head}`);
lines.push(`  Dirty: ${dirty.length? 'YES':'NO'}`);
if(dirty.length){
  lines.push('  DirtyFiles:');
  dirty.slice(0,8).forEach(l=> lines.push('    - '+l));
  if(dirty.length>8) lines.push('    - ...');
}
lines.push(`  Focus: ${[...debts].join(', ') || 'NONE'}`);
lines.push('  LastCommits:');
lastCommits.forEach(c=> lines.push('    - '+c));
lines.push('  NextTasks:');
tasks.forEach((t,i)=> lines.push(`    ${i+1}. ${t}`));
if(!tasks.length) lines.push('    (none detected)');
lines.push('  ProposedDeliverable: <remplir avant fin de session>');
lines.push('  Risks: <1 ligne>');
lines.push('');
lines.push('Instructions: Copier ce bloc dans la prochaine session, compléter ProposedDeliverable + Risks, puis demander patch tâche 1.');

process.stdout.write(lines.join('\n')+'\n');
