#!/usr/bin/env node
// Pre-PR quality gate: build (+ optional future lint/tests hooks)
// Usage: node scripts/pr-check.mjs  (or npm run pr:check)
// Exit codes: 0 success, 1 failure

import { execSync } from 'node:child_process';

function run(cmd, label){
  process.stdout.write(`\n[CHECK] ${label} → ${cmd}\n`);
  try {
    const out = execSync(cmd, { stdio: 'pipe', encoding: 'utf8' });
    process.stdout.write(out.split(/\r?\n/).slice(0,50).join('\n') + '\n');
    return { ok: true };
  } catch(e){
    process.stderr.write(`\n[CHECK][FAIL] ${label}: ${e.message}\n`);
    if (e.stdout) process.stderr.write(e.stdout.toString());
    if (e.stderr) process.stderr.write(e.stderr.toString());
    return { ok: false };
  }
}

const steps = [];
// Lint first (fast fail) unless skipped
if (process.env.PR_CHECK_SKIP_LINT !== 'true') {
  // Use lint gate (no-regression) instead of full strict lint
  steps.push({ label:'Lint Gate', cmd: 'npm run lint:gate' });
}
// Build (monorepo aware) unless skipped
if (process.env.PR_CHECK_SKIP_BUILD !== 'true') {
  steps.push({ label:'Build (workspaces)', cmd: 'npm run build --if-present' });
}
// Core tests now available; run by default (can skip with PR_CHECK_SKIP_TESTS=true)
if (process.env.PR_CHECK_SKIP_TESTS !== 'true') {
  steps.push({ label:'Tests (core)', cmd: 'npm run test --workspace=packages/core' });
}

let allOk = true;
for (const s of steps){
  const res = run(s.cmd, s.label);
  if (!res.ok) { allOk = false; break; }
}

if (!allOk) {
  process.stderr.write('\n[CHECK][RESULT] ÉCHEC – corriger avant PR.\n');
  process.exit(1);
}
process.stdout.write('\n[CHECK][RESULT] OK – prêt pour création / mise à jour PR.\n');
