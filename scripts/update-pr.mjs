#!/usr/bin/env node
// Update existing PR for current branch using same enhanced body generation logic as create-pr.mjs
// Usage: npm run pr:update  (env vars PR_ENHANCED, PR_DRAFT, BASE_BRANCH honored)

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const ENHANCED = process.env.PR_ENHANCED !== 'false';

// External config loading for generic behavior
let prConfig = {};
try {
  if (existsSync('pr-automation.config.json')) {
    prConfig = JSON.parse(readFileSync('pr-automation.config.json','utf8'));
  }
} catch { prConfig = {}; }

function globToRegex(glob){
  // Normalize leading ./
  glob = glob.replace(/^\.\//,'');
  // Escape regex special chars except *
  let out = '';
  for (let i=0;i<glob.length;i++){
    const ch = glob[i];
    if (ch === '*') {
      // check if it's a double star
      const isDouble = glob[i+1] === '*';
      if (isDouble){
        // Consume second *
        i++;
        out += '.*';
      } else {
        out += '[^/]*';
      }
    } else if (/[-/\\^$+?.()|{}\[]/.test(ch)) {
      out += '\\' + ch;
    } else {
      out += ch;
    }
  }
  return new RegExp('^'+out+'$','i');
}

const categoryDefs = prConfig.categories || [
  { name:'docs', patterns:['handbook/**','archi/**','**/*.md'] },
  { name:'scripts', patterns:['scripts/**'] },
  { name:'server', patterns:['server/**'] },
  { name:'frontend', patterns:['src/**','public/**'] },
  { name:'search', patterns:['**/*fts*','**/*MATCH*','**/*sqlite*'] }
];
for (const c of categoryDefs){ c._regex = c.patterns.map(globToRegex); }

const highlightDefs = prConfig.highlights || [
  { patterns:['**/*fts*','**/*MATCH*','**/*sqlite*'], message:'Recherche plein texte / SQLite FTS modifiée' },
  { patterns:['scripts/create-pr.mjs','scripts/update-pr.mjs'], message:'Outillage PR modifié' },
  { patterns:['handbook/**','archi/**','**/*.md'], message:'Documentation mise à jour' }
];
for (const h of highlightDefs){ h._regex = h.patterns.map(globToRegex); }

function sh(cmd){ return execSync(cmd,{encoding:'utf8'}).trim(); }
function log(m){ process.stdout.write(m+'\n'); }
function error(m){ process.stderr.write('\n[PR][ERROR] '+m+'\n'); }

// Lightweight env parsing (reuse priority)
function parseEnvFile(path){
  const map={};
  if(!existsSync(path)) return map;
  try {
    const raw=readFileSync(path,'utf8');
    for(const line of raw.split(/\r?\n/)){
      if(!line || line.trim().startsWith('#')) continue;
      const eq=line.indexOf('='); if(eq===-1) continue;
      const k=line.slice(0,eq).trim(); let v=line.slice(eq+1).trim();
      v=v.replace(/^['"]|['"]$/g,''); if(k) map[k]=v;
    }
  } catch {}
  return map;
}
const dotenvPriority=['.secrets/.env.pr','.env.local','.env'];
const dotenvVals={};
for(const p of dotenvPriority){ Object.assign(dotenvVals, parseEnvFile(p)); }

if(!process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN_FILE && existsSync(process.env.GITHUB_TOKEN_FILE)) {
  try { process.env.GITHUB_TOKEN = readFileSync(process.env.GITHUB_TOKEN_FILE,'utf8').trim(); } catch {}
}
let token = process.env.GITHUB_TOKEN || dotenvVals.GITHUB_TOKEN;
if(!token){
  try { if(existsSync('.secrets/github_token')) token = readFileSync('.secrets/github_token','utf8').trim(); } catch {}
}
if(!token){
  try { const cfg = sh('git config --get github.token'); if(cfg) token = cfg.trim(); } catch {}
}
if(!token){
  error('GITHUB_TOKEN introuvable – fournir via env ou .secrets/.env.pr');
  process.exit(1);
}

let headBranch = sh('git rev-parse --abbrev-ref HEAD');
if(headBranch==='HEAD') headBranch = sh('git branch --show-current');
if(!headBranch){ error('Branche courante introuvable'); process.exit(1); }
if(headBranch==='main' || headBranch==='master'){ error('Sur branche principale – rien à mettre à jour.'); process.exit(1); }

// Optional pre-check before updating PR (ensures branch still builds)
if (process.env.PR_SKIP_CHECK !== 'true') {
  try {
    log('[PR][CHECK] Lancement pre-check (scripts/pr-check.mjs)');
    sh('node scripts/pr-check.mjs');
  } catch (e) {
    error('Pre-check a échoué. Annulation update PR. (export PR_SKIP_CHECK=true pour bypass)');
    process.exit(1);
  }
}

const baseBranch = process.env.BASE_BRANCH || 'main';
let remoteUrl='';
try { remoteUrl = sh('git remote get-url origin'); } catch { error('Remote origin manquant'); process.exit(1); }
const match = remoteUrl.match(/[/:]([^/]+)\/([^/.]+)(?:\.git)?$/);
if(!match){ error('Impossible de parser remote: '+remoteUrl); process.exit(1); }
const owner = match[1];
const repo = match[2];

// Diff collection
let diffFilesRaw='';
try { diffFilesRaw = sh(`git diff --name-only ${baseBranch}...${headBranch}`);} catch {
  try { sh(`git fetch origin ${baseBranch}:${baseBranch}`); diffFilesRaw = sh(`git diff --name-only ${baseBranch}...${headBranch}`);} catch(e){ error('Diff impossible: '+e.message); }
}
const diffFiles = diffFilesRaw.split('\n').filter(Boolean);
let numstatRaw='';
try { numstatRaw = sh(`git diff --numstat ${baseBranch}...${headBranch}`);} catch {}
const numstats = numstatRaw.split(/\n/).filter(Boolean).map(l=>{ const p=l.split(/\t/); if(p.length<3) return null; return {added:parseInt(p[0],10)||0,removed:parseInt(p[1],10)||0,file:p[2]}; }).filter(Boolean);
const additions = numstats.reduce((a,b)=>a+b.added,0);
const deletions = numstats.reduce((a,b)=>a+b.removed,0);

function classify(file){
  for (const def of categoryDefs){ if (def._regex.some(r=>r.test(file))) return def.name; }
  return 'other';
}
const categories={};
for(const f of diffFiles){ const c=classify(f); categories[c]=(categories[c]||0)+1; }
const catSummary = Object.entries(categories).map(([k,v])=>`${k}(${v})`).join(', ');

let latestSubject='';
try { latestSubject = sh('git log -1 --pretty=%s'); } catch {}

let template='';
if (existsSync('.github/pull_request_template.md')) {
  template = readFileSync('.github/pull_request_template.md','utf8').replace(/<!--[^]*?-->/g,'').trim();
}

function detectHighlights(files){
  const notes = new Set();
  for (const f of files){
    for (const h of highlightDefs){ if (h._regex.some(r=>r.test(f))) notes.add(h.message); }
  }
  return [...notes];
}
const highlights = detectHighlights(diffFiles);
const autoSummary = `Branche: ${headBranch}\nBase: ${baseBranch}\nFichiers: ${diffFiles.length}\nCatégories: ${catSummary||'n/a'}\nAdditions: ${additions}  Suppressions: ${deletions}`;

function buildBody(){
  if(!ENHANCED){ return [template ? '## (Pré-rempli) Template' : '## PR', template, '```', autoSummary,'```', latestSubject?`Dernier commit: ${latestSubject}`:''].join('\n'); }
  const changedSelftests = diffFiles.filter(f=>/selftest/i.test(f));
  const riskRules = prConfig.riskRules || {};
  const highRiskBySize = riskRules.highRiskIfAdditionsOver && additions > riskRules.highRiskIfAdditionsOver;
  const sensitive = Object.keys(categories).some(k=> (riskRules.elevatedRiskCategories||['server','search']).includes(k));
  const sections={
    resume: highlights.length? highlights.join(' | ') : 'Évolution multi-surface.',
    contexte: highlights.join(' | ') || 'Évolution incrémentale.',
    changements: diffFiles.slice(0,60).map(f=>`- ${f}`).join('\n') + (diffFiles.length>60?'\n- ...':'') ,
    tests: changedSelftests.length?`Self-tests touchés:\n${changedSelftests.map(f=>' - '+f).join('\n')}`:'Aucun self-test détecté.',
    risques: highRiskBySize ? 'Risque ÉLEVÉ (volume important).' : (sensitive ? 'Risque modéré (zones sensibles).' : 'Faible.'),
    docs: Object.keys(categories).includes('docs')?'Documentation modifiée.':'Pas de documentation modifiée.',
    perf: Object.keys(categories).includes('search')?'Surveiller latence FTS.':'Impact performance négligeable.',
    db: diffFiles.some(f=>/migration|sql/i.test(f))?'Vérifier migrations.':'Pas de migration.',
    securite: 'Pas de nouvelle surface réseau.'
  };
  return [
    template? '## (Pré-rempli) Template':'## PR',
    template||'',
    '---','## Résumé Automatisé',sections.resume,
    '## Contexte (détecté)', sections.contexte,
    '## Changements (liste fichiers)', sections.changements,
    '## Tests', sections.tests,
    '## Performance', sections.perf,
    '## Sécurité', sections.securite,
    '## Base de Données', sections.db,
    '## Documentation', sections.docs,
    '## Risques / Revue', sections.risques,
    '## Auto-Analyse (statistiques)','```',autoSummary,'```',
    latestSubject?`Dernier commit: ${latestSubject}`:''
  ].join('\n');
}

// Derive title override
const title = process.env.PR_TITLE || latestSubject || `feat: ${headBranch}`;
function deriveResume(){
  const parts=[];
  if (highlights.length) parts.push(highlights.join(' | '));
  parts.push('Catégories: '+Object.keys(categories).filter(k=>k!=='other').join(', ')||'n/a');
  parts.push(`Δ +${additions}/-${deletions}`);
  return parts.join(' · ');
}
const autoResume = deriveResume();
const body = ENHANCED ? (`## 🎯 Titre\n${title}\n\n## 📌 Résumé\n${autoResume}\n\n` + buildBody()) : [
  '## 🎯 Titre', title,
  '## 📌 Résumé', autoResume,
  buildBody()
].join('\n');

async function main(){
  // Locate existing PR
  const searchUrl = `https://api.github.com/repos/${owner}/${repo}/pulls?head=${owner}:${encodeURIComponent(headBranch)}&base=${encodeURIComponent(baseBranch)}`;
  const res = await fetch(searchUrl,{headers:{Authorization:`Bearer ${token}`,'User-Agent':'pr-update-script',Accept:'application/vnd.github+json'}});
  if(!res.ok){ error('Recherche PR échouée: HTTP '+res.status); process.exit(1); }
  const arr = await res.json();
  if(!Array.isArray(arr) || !arr.length){ error('Aucune PR existante trouvée pour cette branche.'); process.exit(1); }
  const pr = arr[0];
  const prNumber = pr.number;
  const patchRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,{
    method:'PATCH',
    headers:{Authorization:`Bearer ${token}`,'User-Agent':'pr-update-script',Accept:'application/vnd.github+json','Content-Type':'application/json'},
    body: JSON.stringify({ title, body })
  });
  if(!patchRes.ok){ const txt = await patchRes.text(); error('Mise à jour PR échouée: HTTP '+patchRes.status+'\n'+txt); process.exit(1); }
  const updated = await patchRes.json();
  log('[PR] Mise à jour: '+updated.html_url);
}

main().catch(e=>{ error(e.stack||e.message); process.exit(1); });
