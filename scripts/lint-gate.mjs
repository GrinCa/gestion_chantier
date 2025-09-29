#!/usr/bin/env node
// Lint gate with baseline (TD-005)
// Strategy:
//  - Baseline stores per-file counts of each rule violation.
//  - Gate fails if any (file, rule) count exceeds baseline (no regression).
//  - New files must be clean (any issue triggers failure unless baseline updated).
//  - Reductions are allowed (improvements) without updating baseline.
//  - Use --update (or env LINT_GATE_UPDATE=1) to regenerate baseline snapshot.

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BASELINE_PATH = path.join(ROOT, '.lint-baseline.json');

function runESLintJSON() {
  try {
    const out = execSync('npx eslint . -f json --no-error-on-unmatched-pattern', { encoding: 'utf8', stdio: ['ignore','pipe','pipe'] });
    return out;
  } catch (e) {
    // Even with errors ESLint exits >0; we still want its JSON (in stdout)
    if (e.stdout) return e.stdout.toString();
    throw e;
  }
}

function summarize(results) {
  // results: array (ESLint JSON)
  const counts = {}; // file -> rule -> count
  let total = 0;
  for (const fileResult of results) {
    if (!fileResult.messages) continue;
    for (const m of fileResult.messages) {
      if (!m.ruleId) continue; // ignore parsing errors without rule id
      total++;
      const file = fileResult.filePath.replace(/\\/g,'/');
      counts[file] = counts[file] || {};
      counts[file][m.ruleId] = (counts[file][m.ruleId] || 0) + 1;
    }
  }
  return { counts, total };
}

function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return null;
  try { return JSON.parse(readFileSync(BASELINE_PATH,'utf8')); } catch { return null; }
}

function saveBaseline(summary) {
  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    totalProblems: summary.total,
    rulesByFile: summary.counts
  };
  writeFileSync(BASELINE_PATH, JSON.stringify(payload, null, 2)+'\n','utf8');
}

function compare(current, baseline) {
  const regressions = [];
  for (const [file, rules] of Object.entries(current.counts)) {
    const baseRules = baseline.rulesByFile[file] || {};
    for (const [rule, count] of Object.entries(rules)) {
      const baseCount = baseRules[rule] || 0;
      if (count > baseCount) {
        regressions.push({ file, rule, base: baseCount, current: count, delta: count - baseCount });
      }
    }
  }
  return regressions;
}

function main() {
  const args = process.argv.slice(2);
  const update = args.includes('--update') || process.env.LINT_GATE_UPDATE === '1';

  const raw = runESLintJSON();
  let parsed;
  try { parsed = JSON.parse(raw); } catch (e) {
    console.error('[lint-gate] Failed to parse ESLint JSON output.');
    console.error(raw.slice(0, 1000));
    process.exit(2);
  }
  const summary = summarize(parsed);

  if (update || !existsSync(BASELINE_PATH)) {
    saveBaseline(summary);
    console.log(`[lint-gate] Baseline ${existsSync(BASELINE_PATH)?'updated':'created'}: ${summary.total} problems tracked.`);
    process.exit(0);
  }

  const baseline = loadBaseline();
  if (!baseline) {
    console.error('[lint-gate] Baseline missing or unreadable. Run with --update first.');
    process.exit(2);
  }

  const regressions = compare(summary, baseline);
  if (regressions.length === 0) {
    console.log(`[lint-gate] PASS – no lint regression (current: ${summary.total}, baseline: ${baseline.totalProblems}).`);
    // Optionally show improvements summary
    const improvement = baseline.totalProblems - summary.total;
    if (improvement > 0) console.log(`[lint-gate] Improvements: -${improvement} total problems (nice!).`);
    process.exit(0);
  }

  regressions.sort((a,b)=> b.delta - a.delta);
  console.error(`[lint-gate] FAIL – lint regression detected in ${regressions.length} (file,rule) pairs.`);
  for (const r of regressions.slice(0, 25)) {
    console.error(`  ${r.file}  ${r.rule}  +${r.delta} (baseline ${r.base} -> ${r.current})`);
  }
  if (regressions.length > 25) console.error(`  ... ${regressions.length - 25} more`);
  console.error('\nTo accept current state (after cleanup), run: node scripts/lint-gate.mjs --update');
  process.exit(1);
}

main();
