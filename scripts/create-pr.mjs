#!/usr/bin/env node
// Automated Pull Request Creation Script
// Requirements: Node >=18 (global fetch), env GITHUB_TOKEN with 'repo' scope.
// Usage: npm run pr:create [-- base=main]
// Optional env: BASE_BRANCH, PR_DRAFT=true

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function log(msg) { process.stdout.write(msg + '\n'); }
function error(msg) { process.stderr.write('\n[PR][ERROR] ' + msg + '\n'); }

// 1. Token Resolution (env or fallback)
let token = process.env.GITHUB_TOKEN;
if (!token) {
  // Fallback 1: .secrets/github_token
  try {
    if (existsSync('.secrets/github_token')) {
      token = readFileSync('.secrets/github_token', 'utf8').trim();
    }
  } catch {}
}
if (!token) {
  // Fallback 2: .env (parse simple lines KEY=VALUE)
  try {
    if (existsSync('.env')) {
      const envRaw = readFileSync('.env', 'utf8');
      for (const line of envRaw.split(/\r?\n/)) {
        if (!line || line.trim().startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq === -1) continue;
        const k = line.slice(0, eq).trim();
        const v = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
        if (k === 'GITHUB_TOKEN' && v) { token = v; break; }
      }
    }
  } catch {}
}
if (!token) {
  // Fallback 3: git config github.token
  try {
    const cfg = sh('git config --get github.token');
    if (cfg) token = cfg.trim();
  } catch {}
}
if (!token) {
  error('GITHUB_TOKEN introuvable (env/.secrets/.env/git config). Fournis-le via setx GITHUB_TOKEN ou .secrets/github_token.');
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

// Collect diff summary vs base
let diffFilesRaw = '';
try { diffFilesRaw = sh(`git diff --name-only ${baseBranch}...${headBranch}`); } catch {
  // fallback try fetching base
  try { sh(`git fetch origin ${baseBranch}:${baseBranch}`); diffFilesRaw = sh(`git diff --name-only ${baseBranch}...${headBranch}`); } catch(e){ error('Impossible d’obtenir le diff avec base='+baseBranch+' : '+e.message); }
}
const diffFiles = diffFilesRaw.split('\n').filter(Boolean);
const topLevelBuckets = {};
for (const f of diffFiles) {
  const seg = f.split('/')[0];
  topLevelBuckets[seg] = (topLevelBuckets[seg] || 0) + 1;
}
const bucketSummary = Object.entries(topLevelBuckets).map(([k,v]) => `${k}(${v})`).join(', ');

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

// Auto sections
const autoSummary = `Branche: ${headBranch}\nBase: ${baseBranch}\nFichiers modifiés: ${diffFiles.length}\nZones: ${bucketSummary || 'n/a'}`;

const body = [
  template ? '## (Pré-rempli) Template\n' : '## PR\n',
  template || '',
  '\n---',
  '## Auto-Analyse (généré)',
  '```',
  autoSummary,
  '```',
  latestSubject ? `\nDernier commit: ${latestSubject}` : ''
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
