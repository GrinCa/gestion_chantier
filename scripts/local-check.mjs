#!/usr/bin/env node
// Local quality gate: lint baseline, build, tests (core)
// Usage: node scripts/local-check.mjs  (or npm run check)
// Exit codes: 0 success, 1 failure

import { execSync } from 'node:child_process';

function run(cmd, label){
  process.stdout.write(`\n[LOCAL-CHECK] ${label} → ${cmd}\n`);
  try {
    const out = execSync(cmd, { stdio: 'pipe', encoding: 'utf8' });
    process.stdout.write(out.split(/\r?\n/).slice(0,50).join('\n') + '\n');
    return { ok: true };
  } catch(e){
    process.stderr.write(`\n[LOCAL-CHECK][FAIL] ${label}: ${e.message}\n`);
    if (e.stdout) process.stderr.write(e.stdout.toString());
    if (e.stderr) process.stderr.write(e.stderr.toString());
    return { ok: false };
  }
}

const steps = [];
if (process.env.LOCAL_CHECK_SKIP_LINT !== 'true') {
  steps.push({ label:'Lint Gate', cmd: 'npm run lint:gate' });
}
if (process.env.LOCAL_CHECK_SKIP_BUILD !== 'true') {
  steps.push({ label:'Build (workspaces)', cmd: 'npm run build --if-present' });
}
if (process.env.LOCAL_CHECK_SKIP_TESTS !== 'true') {
  steps.push({ label:'Tests (core)', cmd: 'npm run test --workspace=packages/core' });
}

let allOk = true;
for (const s of steps){
  const res = run(s.cmd, s.label);
  if (!res.ok) { allOk = false; break; }
}

if (!allOk) {
  process.stderr.write('\n[LOCAL-CHECK][RESULT] FAIL – corriger avant commit final.\n');
  process.exit(1);
}
process.stdout.write('\n[LOCAL-CHECK][RESULT] OK – prêt pour commit.\n');
