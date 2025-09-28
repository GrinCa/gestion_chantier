#!/usr/bin/env node
// Automated Pull Request Creation Script
// Requirements: Node >=18 (global fetch), env GITHUB_TOKEN with 'repo' scope.
// Usage: npm run pr:create [-- base=main]
// Optional env: BASE_BRANCH, PR_DRAFT=true

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const ENHANCED = process.env.PR_ENHANCED !== 'false';

// Optional lightweight env loaders (support priority: .env.pr > .env.local > .env)
function parseEnvFile(path) {
  const map = {};
  if (!existsSync(path)) return map;
  try {
    const raw = readFileSync(path, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      if (!line || line.trim().startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const k = line.slice(0, eq).trim();
      let v = line.slice(eq + 1).trim();
      v = v.replace(/^['"]|['"]$/g, '');
      if (k) map[k] = v;
    }
  } catch {/* ignore parsing errors */}
  return map;
}
const dotenvPriority = ['.secrets/.env.pr', '.env.local', '.env'];
const dotenvVals = {};
for (const p of dotenvPriority) {
  Object.assign(dotenvVals, parseEnvFile(p));
}

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function log(msg) { process.stdout.write(msg + '\n'); }
function error(msg) { process.stderr.write('\n[PR][ERROR] ' + msg + '\n'); }

// 1. Token Resolution (env or fallback)
// If user specifies an explicit file path for token
if (!process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN_FILE && existsSync(process.env.GITHUB_TOKEN_FILE)) {
  try { process.env.GITHUB_TOKEN = readFileSync(process.env.GITHUB_TOKEN_FILE, 'utf8').trim(); } catch {}
}
let token = process.env.GITHUB_TOKEN || dotenvVals.GITHUB_TOKEN;
if (!token) {
  // Fallback 1: .secrets/github_token
  try {
    if (existsSync('.secrets/github_token')) {
      token = readFileSync('.secrets/github_token', 'utf8').trim();
    }
  } catch {}
}
// Fallback 2 removed (handled by early loader)
if (!token) {
  // Fallback 3: git config github.token
  try {
    const cfg = sh('git config --get github.token');
    if (cfg) token = cfg.trim();
  } catch {}
}
if (!token) {
  error('GITHUB_TOKEN introuvable (env/.secrets/.env.pr/.env.local/.env/.secrets/github_token/git config). Fournis-le via setx GITHUB_TOKEN ou .secrets/.env.pr');
  if (process.env.PR_DEBUG === 'true') {
    log('[DEBUG] dotenv keys loaded: ' + Object.keys(dotenvVals).join(','));
    log('[DEBUG] Checked files order: ' + dotenvPriority.join(' -> '));
    log('[DEBUG] GITHUB_TOKEN_FILE=' + (process.env.GITHUB_TOKEN_FILE || 'not set'));
  }
  process.exit(1);
}

let headBranch = sh('git rev-parse --abbrev-ref HEAD');
if (headBranch === 'HEAD') {
  headBranch = sh('git branch --show-current');
}
if (!headBranch) {
  error('Impossible de déterminer la branche courante.');
  process.exit(1);
}
if (headBranch === 'main' || headBranch === 'master') {
  error('Branche courante = ' + headBranch + '. Crée une branche feature avant PR.');
  process.exit(1);
}

// Base branch
const baseBranch = process.env.BASE_BRANCH || 'main';

// Remote parsing
let remoteUrl = '';
try { remoteUrl = sh('git remote get-url origin'); } catch { error('Remote origin introuvable.'); process.exit(1); }

// Parse forms: git@github.com:Owner/Repo.git or https://github.com/Owner/Repo.git
const match = remoteUrl.match(/[/:]([^/]+)\/([^/.]+)(?:\.git)?$/);
if (!match) {
  error('Impossible de parser le remote origin: ' + remoteUrl);
  process.exit(1);
}
const owner = match[1];
const repo = match[2];

// Ensure branch pushed
try {
  sh(`git ls-remote --exit-code --heads origin ${headBranch}`);
} catch {
  log(`[PR] Branche distante absente → push: git push -u origin ${headBranch}`);
  process.exit(1);
}

// Collect diff summary vs base (file names + numstat)
let diffFilesRaw = '';
try { diffFilesRaw = sh(`git diff --name-only ${baseBranch}...${headBranch}`); } catch {
  try { sh(`git fetch origin ${baseBranch}:${baseBranch}`); diffFilesRaw = sh(`git diff --name-only ${baseBranch}...${headBranch}`); } catch(e){ error('Impossible d’obtenir le diff avec base='+baseBranch+' : '+e.message); }
}
const diffFiles = diffFilesRaw.split('\n').filter(Boolean);
let numstatRaw = '';
try { numstatRaw = sh(`git diff --numstat ${baseBranch}...${headBranch}`); } catch { /* ignore */ }
const numstats = numstatRaw.split(/\n/).filter(Boolean).map(l => {
  const parts = l.split(/\t/);
  if (parts.length < 3) return null;
  return { added: parseInt(parts[0],10)||0, removed: parseInt(parts[1],10)||0, file: parts[2] };
}).filter(Boolean);
const additions = numstats.reduce((a,b)=>a+b.added,0);
const deletions = numstats.reduce((a,b)=>a+b.removed,0);

function classify(file){
  if (file.startsWith('archi/')) return 'docs-archi';
  if (file.endsWith('.md')) return 'docs';
  if (file.startsWith('packages/core')) return 'core';
  if (file.startsWith('packages/web')) return 'web';
  if (file.startsWith('packages/server')) return 'server';
  if (file.startsWith('scripts/')) return 'scripts';
  if (file.includes('fts') || /fts|MATCH|sqlite/i.test(file)) return 'search';
  return 'other';
}
const categories = {};
for (const f of diffFiles){ const c = classify(f); categories[c]=(categories[c]||0)+1; }
const catSummary = Object.entries(categories).map(([k,v]) => `${k}(${v})`).join(', ');

// Latest conventional commit subject
let latestSubject = '';
try { latestSubject = sh('git log -1 --pretty=%s'); } catch { /* ignore */ }

// Read template to prefill
let template = '';
const templatePath = '.github/pull_request_template.md';
if (existsSync(templatePath)) {
  template = readFileSync(templatePath, 'utf8')
    .replace(/<!--[^]*?-->/g, '') // strip HTML comments
    .trim();
}

// Heuristic context extraction
function detectHighlights(files){
  const notes=[];
  if (files.some(f=>/fts|MATCH|sqlite/i.test(f))) notes.push('FTS / SQLite full-text modifications détectées');
  if (files.some(f=>f.includes('scripts/create-pr.mjs'))) notes.push('Outillage PR automatisé modifié');
  if (files.some(f=>f.startsWith('archi/'))) notes.push('Documentation architecture mise à jour');
  return notes;
}

const highlights = detectHighlights(diffFiles);
const autoSummary = `Branche: ${headBranch}\nBase: ${baseBranch}\nFichiers: ${diffFiles.length}\nCatégories: ${catSummary || 'n/a'}\nAdditions: ${additions}  Suppressions: ${deletions}`;

function buildEnhancedBody(){
  const changedSelftests = diffFiles.filter(f=>/selftest/i.test(f));
  const hasCore = !!categories.core;
  const sections = {
    resume: hasCore ? 'Extension du noyau + recherche plein texte + outillage PR.' : 'Mise à jour multi-surface.',
    contexte: highlights.join(' | ') || 'Évolution incrémentale.',
    changements: diffFiles.slice(0,50).map(f=>`- ${f}`).join('\n') + (diffFiles.length>50?'\n- ...':'') ,
    tests: changedSelftests.length ? `Self-tests modifiés/ajoutés:\n${changedSelftests.map(f=>' - '+f).join('\n')}` : 'Aucun nouveau self-test détecté (à vérifier).',
    risques: hasCore ? 'Impact potentiel sur requêtes repository / scoring. Vérifier fallback LIKE.' : 'Faible.',
    docs: Object.keys(categories).some(c=>c.startsWith('docs')) ? 'Docs mises à jour.' : 'Pas de docs modifiées (ajouter si nécessaire).',
    perf: highlights.some(h=>h.includes('FTS')) ? 'FTS: surveiller temps de création index & latence requêtes.' : 'Pas d’impact majeur attendu.',
    db: diffFiles.some(f=>/migration|sql/i.test(f)) ? 'Vérifier migrations.' : 'Pas de nouvelle migration détectée.',
    securite: 'Aucun changement surface réseau. Token automation local uniquement.'
  };
  return [
    template ? '## (Pré-rempli) Template\n' : '## PR\n',
    template || '',
    '---',
    '## Résumé Automatisé',
    sections.resume,
    '## Contexte (détecté)',
    sections.contexte,
    '## Changements (liste fichiers)',
    sections.changements,
    '## Tests',
    sections.tests,
    '## Performance',
    sections.perf,
    '## Sécurité',
    sections.securite,
    '## Base de Données',
    sections.db,
    '## Documentation',
    sections.docs,
    '## Risques / Revue',
    sections.risques,
    '## Auto-Analyse (statistiques)',
    '```',
    autoSummary,
    '```',
    latestSubject ? `Dernier commit: ${latestSubject}` : ''
  ].join('\n');
}

const body = ENHANCED ? buildEnhancedBody() : [
  template ? '## (Pré-rempli) Template\n' : '## PR\n',
  template || '',
  '---',
  '## Auto-Analyse (généré)',
  '```',
  autoSummary,
  '```',
  latestSubject ? `Dernier commit: ${latestSubject}` : ''
].join('\n');

const title = latestSubject || `feat: ${headBranch}`;

async function main() {
  // Check existing PR
  const searchUrl = `https://api.github.com/repos/${owner}/${repo}/pulls?head=${owner}:${encodeURIComponent(headBranch)}&base=${encodeURIComponent(baseBranch)}`;
  const existing = await fetch(searchUrl, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'pr-script', Accept: 'application/vnd.github+json' } });
  if (!existing.ok) {
    error('Recherche PR existante a échoué: HTTP ' + existing.status);
  } else {
    const arr = await existing.json();
    if (Array.isArray(arr) && arr.length) {
      log('[PR] Déjà existante: ' + arr[0].html_url);
      return;
    }
  }

  const createRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'pr-script',
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title,
      head: headBranch,
      base: baseBranch,
      body,
      draft: process.env.PR_DRAFT === 'true'
    })
  });
  if (!createRes.ok) {
    const txt = await createRes.text();
    error('Création PR a échoué: HTTP ' + createRes.status + '\n' + txt);
    process.exit(1);
  }
  const pr = await createRes.json();
  log('[PR] Créée: ' + pr.html_url);
}

main().catch(e => { error(e.stack || e.message); process.exit(1); });
