#!/usr/bin/env node
// Automated Pull Request Creation Script
// Requirements: Node >=18 (global fetch), env GITHUB_TOKEN with 'repo' scope.
// Usage: npm run pr:create [-- base=main]
// Optional env: BASE_BRANCH, PR_DRAFT=true

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const ENHANCED = process.env.PR_ENHANCED !== 'false';

// Load external config (optional) to keep script generic
let prConfig = {};
try {
  if (existsSync('pr-automation.config.json')) {
    prConfig = JSON.parse(readFileSync('pr-automation.config.json','utf8'));
  }
} catch { prConfig = {}; }

function globToRegex(glob){
  glob = glob.replace(/^\.\//,'');
  let out='';
  for (let i=0;i<glob.length;i++){
    const ch = glob[i];
    if (ch==='*'){
      const dbl = glob[i+1]==='*';
      if (dbl){ i++; out+='.*'; }
      else out+='[^/]*';
    } else if (/[-/\\^$+?.()|{}\[]/.test(ch)) {
      out += '\\'+ch;
    } else out += ch;
  }
  return new RegExp('^'+out+'$','i');
}

const categoryDefs = prConfig.categories || [
  { name:'docs', patterns:['archi/**','**/*.md'] },
  { name:'scripts', patterns:['scripts/**'] },
  { name:'server', patterns:['server/**'] },
  { name:'frontend', patterns:['src/**','public/**'] },
  { name:'search', patterns:['**/*fts*','**/*MATCH*','**/*sqlite*'] }
];
for (const c of categoryDefs){ c._regex = c.patterns.map(globToRegex); }

const highlightDefs = prConfig.highlights || [
  { patterns:['**/*fts*','**/*MATCH*','**/*sqlite*'], message:'Recherche plein texte / SQLite FTS modifiée' },
  { patterns:['scripts/create-pr.mjs','scripts/update-pr.mjs'], message:'Outillage PR modifié' },
  { patterns:['archi/**','**/*.md'], message:'Documentation mise à jour' }
];
for (const h of highlightDefs){ h._regex = h.patterns.map(globToRegex); }

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
  for (const def of categoryDefs){
    if (def._regex.some(r=>r.test(file))) return def.name;
  }
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
  const notes=new Set();
  for (const f of files){
    for (const h of highlightDefs){
      if (h._regex.some(r=>r.test(f))) notes.add(h.message);
    }
  }
  return [...notes];
}

const highlights = detectHighlights(diffFiles);
const autoSummary = `Branche: ${headBranch}\nBase: ${baseBranch}\nFichiers: ${diffFiles.length}\nCatégories: ${catSummary || 'n/a'}\nAdditions: ${additions}  Suppressions: ${deletions}`;

function buildEnhancedBody(){
  const changedSelftests = diffFiles.filter(f=>/selftest/i.test(f));
  const hasRiskCat = Object.keys(categories).some(k=>['server','search'].includes(k));
  const riskRules = prConfig.riskRules || {};
  const highRiskBySize = riskRules.highRiskIfAdditionsOver && additions > riskRules.highRiskIfAdditionsOver;
  const sections = {
    resume: highlights.length ? highlights.join(' | ') : 'Mise à jour multi-surface.',
    contexte: highlights.join(' | ') || 'Évolution incrémentale.',
    changements: diffFiles.slice(0,50).map(f=>`- ${f}`).join('\n') + (diffFiles.length>50?'\n- ...':'') ,
    tests: changedSelftests.length ? `Self-tests modifiés/ajoutés:\n${changedSelftests.map(f=>' - '+f).join('\n')}` : 'Aucun nouveau self-test détecté.',
    risques: highRiskBySize ? 'Risque ÉLEVÉ (volume important de changements).' : (hasRiskCat ? 'Risque modéré (zones sensibles touchées).' : 'Faible.'),
    docs: Object.keys(categories).some(c=>c==='docs') ? 'Documentation mise à jour.' : 'Pas de docs modifiées.',
    perf: Object.keys(categories).includes('search') ? 'Surveiller latence requêtes FTS.' : 'Impact performance négligeable.',
    db: diffFiles.some(f=>/migration|sql/i.test(f)) ? 'Vérifier migrations.' : 'Pas de migration détectée.',
    securite: 'Aucun changement surface réseau détecté.'
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

// Derive title (allow override via PR_TITLE)
const title = process.env.PR_TITLE || latestSubject || `feat: ${headBranch}`;

function deriveResume(){
  const parts=[];
  if (highlights.length) parts.push(highlights.join(' | '));
  parts.push('Catégories: '+Object.keys(categories).filter(k=>k!=='other').join(', ')||'n/a');
  parts.push(`Δ +${additions}/-${deletions}`);
  return parts.join(' · ');
}

const autoResume = deriveResume();

const body = ENHANCED ? (`## 🎯 Titre\n${title}\n\n## 📌 Résumé\n${autoResume}\n\n` + buildEnhancedBody()) : [
  '## 🎯 Titre',
  title,
  '## 📌 Résumé',
  autoResume,
  template ? '## (Pré-rempli) Template' : '## PR',
  template || '',
  '---',
  '## Auto-Analyse (généré)',
  '```',
  autoSummary,
  '```',
  latestSubject ? `Dernier commit: ${latestSubject}` : ''
].join('\n');

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
