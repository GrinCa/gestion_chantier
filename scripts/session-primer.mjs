#!/usr/bin/env node
// DEPRECATED: Use handbook/LLM-ENTRYPOINT.md as the single source of truth.
// Generates a concise session primer snippet (markdown) to paste as first prompt to LLM.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function sh(cmd){ return execSync(cmd,{stdio:['ignore','pipe','ignore']}).toString().trim(); }
function safe(fn, def=''){ try { return fn(); } catch { return def; } }

const branch = safe(()=> sh('git rev-parse --abbrev-ref HEAD'));
const head = safe(()=> sh('git rev-parse --short HEAD'));

// Extract first few unchecked TODO tasks from handbook/TODO.md
let todoRaw = safe(()=> readFileSync('handbook/TODO.md','utf8'));
let todoLines = [];
if(todoRaw){
  todoLines = todoRaw.split(/\r?\n/)
    .filter(l=> /^- \[ \]/.test(l) || /^- \[~\]/.test(l) || /^- \[x\]/.test(l))
    .slice(0,40); // limit scanning window
}
const candidateTasks = todoLines.filter(l=> l.startsWith('- [ ]') || l.startsWith('- [~]')).slice(0,5).map(l=> l.replace(/^- \[( |~)\] /,''));

// Extract debt IDs from TECH-DEBT.md (first table rows)
let debtRaw = safe(()=> readFileSync('handbook/TECH-DEBT.md','utf8'));
let debts = [];
if(debtRaw){
  debts = debtRaw.split(/\r?\n/)
    .filter(l=> /^\| TD-/.test(l))
    .map(l=> l.split('|').map(s=> s.trim()))
    .map(cols=> ({ id: cols[1], title: cols[3], status: cols[4] }))
    .slice(0,3);
}

// Issues deprecated: KNOWN-ISSUES.md removed -> fallback placeholder only
const debtFocus = debts.length ? debts[0].id : 'TD-XXX';
const issueFocus = 'N/A';

const primer = `Session Primer Draft (complete the <...> parts)\n\n`+
`Objectif principal: <décrire en une phrase>\n`+
`Objectifs secondaires: <optionnel>\n`+
`Branche: ${branch} @ ${head}\n`+
`Build: <OK|FAIL + résumé>\n`+
`Tests: <non lancés|OK|FAIL + test clé>\n`+
`Focus Debt: ${debtFocus}\n`+
`Tâches ciblées:\n`+
candidateTasks.map((t,i)=>`  ${i+1}. ${t}`).join('\n') + (candidateTasks.length? '\n': '') +
`Contraintes: <ne pas toucher X / style commit>\n`+
`Livrable 1: <ex: squelette dual export>\n`+
`Sortie attendue: patch direct + commit atomique\n`;

process.stdout.write(primer);
