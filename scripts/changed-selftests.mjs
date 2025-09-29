#!/usr/bin/env node
/**
 * changed-selftests.mjs (TD-007)
 * ---------------------------------------------------------------
 * Exécute uniquement les self-tests Core pertinents selon les fichiers modifiés.
 *
 * Usage:
 *   node scripts/changed-selftests.mjs --since HEAD~1 --list
 *   node scripts/changed-selftests.mjs --since origin/main --run
 *   node scripts/changed-selftests.mjs --staged --run
 *
 * Options:
 *   --since <ref>   Git ref de base pour diff (mutuellement exclusif avec --staged)
 *   --staged        Utilise l'index (git diff --cached)
 *   --list          Affiche les tests détectés sans exécuter
 *   --run           Exécute les tests détectés séquentiellement
 *   --verbose       Affiche mapping détaillé
 *   --json          Sortie JSON (résumé final)
 *
 * Exit codes:
 *   0 = succès (tests exécutés ou listés)
 *   1 = au moins un test a échoué
 *   2 = aucun test mappé (peut signaler configuration manquante)
 *   3 = erreur d'exécution script
 *
 * Mapping: basé sur inclusion de segments de chemin (lowercase contains).
 * Ajout facile en modifiant la table PATH_TEST_MAP ci-dessous.
 */

import { execSync, spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

// 1. Mapping path substring -> array of selftest npm scripts (core workspace) (dist déjà build requis)
// L'ordre est important: tests plus généraux en dernier.
const PATH_TEST_MAP = [
  { match: 'kernel/repository', tests: ['repository-selftest', 'metrics-selftest', 'deletion-selftest'] },
  { match: 'kernel/services/metricsservice', tests: ['metrics-selftest'] },
  { match: 'kernel/services/healthservice', tests: ['health-selftest'] },
  { match: 'kernel/services/exportservice', tests: ['export-selftest', 'export-manifest-selftest'] },
  { match: 'kernel/indexer', tests: ['indexer-selftest', 'reindex-selftest'] },
  { match: 'tools/calculatrice', tests: ['tool-execution-selftest'] },
  { match: 'migration', tests: ['migration-selftest', 'measurement-migration-selftest', 'sqlite-migration-selftest'] },
  { match: 'sqlite', tests: ['sqlite-filters-selftest', 'sqlite-migration-selftest'] },
  { match: 'data-engine', tests: ['bridge-selftest', 'bootstrap-selftest'] },
  { match: 'scripts/', tests: ['kernel-selftest'] }
];

function parseArgs(argv) {
  const args = { since: null, staged: false, list: false, run: false, verbose: false, json: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--since') { args.since = argv[++i]; }
    else if (a === '--staged') { args.staged = true; }
    else if (a === '--list') { args.list = true; }
    else if (a === '--run') { args.run = true; }
    else if (a === '--verbose') { args.verbose = true; }
    else if (a === '--json') { args.json = true; }
    else {
      console.error(`Argument inconnu: ${a}`);
      process.exit(3);
    }
  }
  if (args.since && args.staged) {
    console.error('Utiliser soit --since <ref> soit --staged, pas les deux.');
    process.exit(3);
  }
  if (!args.since && !args.staged) {
    args.since = 'HEAD~1';
  }
  if (!args.list && !args.run) {
    // Par défaut list
    args.list = true;
  }
  return args;
}

function getChangedFiles(args) {
  try {
    let cmd;
    if (args.staged) {
      cmd = 'git diff --name-only --cached';
    } else {
      cmd = `git diff --name-only ${args.since}`;
    }
    const out = execSync(cmd, { encoding: 'utf8' }).trim();
    if (!out) return [];
    return out.split(/\r?\n/).filter(Boolean);
  } catch (e) {
    console.error('[changed-selftests] Erreur récupération diff:', e.message);
    process.exit(3);
  }
}

function mapTests(changedFiles) {
  const set = new Set();
  const lowerFiles = changedFiles.map(f => f.toLowerCase());
  for (const { match, tests } of PATH_TEST_MAP) {
    if (lowerFiles.some(f => f.includes(match))) {
      tests.forEach(t => set.add(t));
    }
  }
  return Array.from(set);
}

function runTest(script) {
  const start = performance.now();
  const r = spawnSync('npm', ['run', script, '--workspace=packages/core'], { stdio: 'inherit', shell: false });
  const dur = performance.now() - start;
  return { script, code: r.status ?? 1, durationMs: Math.round(dur) };
}

function main() {
  const args = parseArgs(process.argv);
  const changed = getChangedFiles(args);

  if (args.verbose) {
    console.log('Fichiers modifiés détectés:\n', changed.length ? changed.join('\n') : '(aucun)');
  }

  const tests = mapTests(changed);

  if (!tests.length) {
    const msg = 'Aucun self-test mappé pour ce diff.';
    if (args.json) {
      console.log(JSON.stringify({ changed, tests: [], message: msg }));
    } else {
      console.log(msg);
    }
    process.exit(2);
  }

  if (args.list) {
    if (args.json) {
      console.log(JSON.stringify({ changed, tests }));
    } else {
      console.log('Self-tests candidats:');
      tests.forEach(t => console.log(' -', t));
    }
    if (!args.run) process.exit(0);
  }

  if (args.run) {
    console.log('\nExécution séquentielle des self-tests pertinents...');
    const results = tests.map(runTest);
    const failed = results.filter(r => r.code !== 0);
    if (args.json) {
      console.log(JSON.stringify({ changed, results }));
    } else {
      console.log('\nRésumé:');
      for (const r of results) {
        console.log(`${r.code === 0 ? '✔' : '✖'} ${r.script} (${r.durationMs} ms)`);
      }
      console.log(`\nTotal: ${results.length}, Succès: ${results.length - failed.length}, Échecs: ${failed.length}`);
    }
    process.exit(failed.length ? 1 : 0);
  }
}

main();
