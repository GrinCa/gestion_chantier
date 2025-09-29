#!/usr/bin/env node
/**
 * Auto PR Labeler (TD-003)
 * ------------------------------------------------------------
 * Applies repository labels to a Pull Request based on:
 *  - Changed file path category (docs, scripts, server, frontend, search, core, mobile, web)
 *  - Conventional commit type of latest commit (feat, fix, chore, docs, refactor, test, perf, ci, build)
 *  - Detected Technical Debt references (TD-00X) => debt:TD-00X
 *  - Known Issue references (KI-00X) => issue:KI-00X
 *  - Risk & size heuristics (additions threshold + elevated categories from pr-automation.config.json)
 * Idempotent: only adds labels not already present. Creates missing labels with neutral color.
 */

import { readFileSync, existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const token = process.env.GITHUB_TOKEN;
const repoFull = process.env.GITHUB_REPOSITORY; // owner/repo
const prNumber = process.env.PR_NUMBER;
if (!token || !repoFull || !prNumber) {
  console.error('[labeler] Missing required env (GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER).');
  process.exit(1);
}

const [owner, repo] = repoFull.split('/');

// Load optional shared config (re-use same categories & risk rules)
let prConfig = {};
try { if (existsSync('pr-automation.config.json')) prConfig = JSON.parse(readFileSync('pr-automation.config.json','utf8')); } catch {}

// Helper: glob-ish to regex (same logic as create-pr.mjs simplified)
function globToRegex(glob){
  glob = glob.replace(/^[.]/,'').replace(/^\//,'');
  let out='';
  for (let i=0;i<glob.length;i++) {
    const ch = glob[i];
    if (ch==='*') {
      const dbl = glob[i+1]==='*';
      if (dbl) { i++; out+='.*'; }
      else out+='[^/]*';
    } else if (/[-/\\^$+?.()|{}\[]/.test(ch)) out += '\\'+ch; else out+=ch;
  }
  return new RegExp('^'+out+'$','i');
}

// Category definitions (merge config + extended monorepo surfaces)
const categoryDefs = [
  { name: 'docs', patterns: ['handbook/**','**/*.md'] },
  { name: 'scripts', patterns: ['scripts/**'] },
  { name: 'server', patterns: ['server/**'] },
  { name: 'frontend', patterns: ['web/src/**','web/public/**','packages/web/**'] },
  { name: 'mobile', patterns: ['packages/mobile/**'] },
  { name: 'core', patterns: ['packages/core/**'] },
  { name: 'web', patterns: ['web/**','packages/web/**'] },
  { name: 'search', patterns: ['**/*fts*','**/*MATCH*','**/*sqlite*'] },
];
// Merge any external categories (avoid duplicates)
if (Array.isArray(prConfig.categories)) {
  for (const ext of prConfig.categories) {
    if (!categoryDefs.some(c=>c.name===ext.name)) categoryDefs.push(ext);
  }
}
for (const c of categoryDefs) c._regex = c.patterns.map(globToRegex);

const riskRules = prConfig.riskRules || { highRiskIfAdditionsOver: 800, elevatedRiskCategories: ['server','search'] };

// Fetch helpers
async function gh(path, init={}) {
  const res = await fetch(`https://api.github.com${path}`, { ...init, headers: { ...(init.headers||{}), Authorization: `Bearer ${token}`, 'User-Agent': 'auto-label-script', Accept: 'application/vnd.github+json' } });
  if (res.status === 403 && res.headers.get('x-ratelimit-remaining')==='0') {
    console.error('[labeler] Rate limited.');
  }
  return res;
}

async function listPrFiles(number) {
  const files = [];
  let page=1;
  while(true){
    const res = await gh(`/repos/${owner}/${repo}/pulls/${number}/files?per_page=100&page=${page}`);
    if(!res.ok){ throw new Error('Cannot list PR files: HTTP '+res.status); }
    const arr = await res.json();
    files.push(...arr);
    if(arr.length<100) break; page++;
  }
  return files;
}

function classify(file){
  for (const cat of categoryDefs) if (cat._regex.some(r=>r.test(file))) return cat.name;
  return null;
}

async function getPr(number){
  const res = await gh(`/repos/${owner}/${repo}/pulls/${number}`);
  if(!res.ok) throw new Error('Cannot get PR: HTTP '+res.status);
  return res.json();
}

async function getCommits(number){
  const res = await gh(`/repos/${owner}/${repo}/pulls/${number}/commits?per_page=250`);
  if(!res.ok) throw new Error('Cannot list commits: HTTP '+res.status);
  return res.json();
}

async function listLabels(){
  const labels=[]; let page=1;
  while(true){
    const res = await gh(`/repos/${owner}/${repo}/labels?per_page=100&page=${page}`);
    if(!res.ok) throw new Error('Cannot list labels: HTTP '+res.status);
    const arr = await res.json(); labels.push(...arr); if(arr.length<100) break; page++;
  }
  return labels;
}

async function ensureLabel(name, color='ededed', description=''){
  const existing = existingLabelsMap.get(name.toLowerCase());
  if (existing) return existing;
  const res = await gh(`/repos/${owner}/${repo}/labels`, { method:'POST', body: JSON.stringify({ name, color, description }) });
  if (!res.ok) {
    // If race (already created), refresh later
    console.warn('[labeler] Failed to create label', name, 'HTTP', res.status);
  } else {
    const created = await res.json();
    existingLabelsMap.set(name.toLowerCase(), created);
    await sleep(50); // tiny chill to avoid secondary rate bursts
    return created;
  }
}

async function addLabels(number, labels){
  if(!labels.length) return;
  const res = await gh(`/repos/${owner}/${repo}/issues/${number}/labels`, { method:'POST', body: JSON.stringify({ labels }) });
  if(!res.ok) console.error('[labeler] Failed to add labels HTTP '+res.status);
}

function deriveTypeLabelFromCommit(msg){
  const m = msg.match(/^(feat|fix|docs|chore|refactor|test|perf|ci|build)(?:\([^)]*\))?:/i);
  if (m) return 'type:'+m[1].toLowerCase();
  return null;
}

function deriveSizeLabel(additions){
  if (additions <= 100) return 'size:s';
  if (additions <= 300) return 'size:m';
  if (additions <= 800) return 'size:l';
  return 'size:xl';
}

function extractDebtLabels(text){
  const set = new Set();
  const td = text.match(/TD-00\d/gi) || [];
  for (const t of td) set.add('debt:'+t.toUpperCase());
  const ki = text.match(/KI-00\d/gi) || [];
  for (const k of ki) set.add('issue:'+k.toUpperCase());
  return [...set];
}

// MAIN
(async () => {
  console.log('[labeler] Fetching PR data #' + prNumber);
  const pr = await getPr(prNumber);
  const commits = await getCommits(prNumber);
  const files = await listPrFiles(prNumber);

  const changedFiles = files.map(f=>f.filename);
  const additions = files.reduce((a,f)=>a+ (f.additions||0),0);

  const categories = new Set();
  for (const f of changedFiles){ const c = classify(f); if (c) categories.add('scope:'+c); }

  // Elevated risk?
  const categoryNames = [...categories].map(s=>s.replace(/^scope:/,''));
  const elevated = categoryNames.some(c => (riskRules.elevatedRiskCategories||[]).includes(c));
  const highBySize = riskRules.highRiskIfAdditionsOver && additions > riskRules.highRiskIfAdditionsOver;

  const latestCommit = commits[commits.length-1];
  const latestMsg = latestCommit?.commit?.message || '';
  const typeLabel = deriveTypeLabelFromCommit(latestMsg);

  const debtLabels = new Set();
  // Aggregate all commit messages + PR title/body
  const aggregateText = [pr.title, pr.body || '', ...commits.map(c=>c.commit.message)].join('\n');
  for (const l of extractDebtLabels(aggregateText)) debtLabels.add(l);

  const sizeLabel = deriveSizeLabel(additions);
  if (sizeLabel) categories.add(sizeLabel);
  if (typeLabel) categories.add(typeLabel);
  if (highBySize) categories.add('risk:high'); else if (elevated) categories.add('risk:elevated');
  for (const d of debtLabels) categories.add(d);

  const desired = [...categories];
  console.log('[labeler] Desired labels:', desired.join(', ')||'(none)');

  // Fetch existing labels for repo & PR
  const existingRepoLabels = await listLabels();
  const existingPrLabels = (pr.labels||[]).map(l=>typeof l === 'string'? l : l.name);
  globalThis.existingLabelsMap = new Map(existingRepoLabels.map(l=>[l.name.toLowerCase(), l]));

  // Ensure each desired label exists
  for (const name of desired){
    await ensureLabel(name, 'ededed');
  }

  const toAdd = desired.filter(l=> !existingPrLabels.includes(l));
  if (!toAdd.length) { console.log('[labeler] No new labels to add.'); return; }
  await addLabels(prNumber, toAdd);
  console.log('[labeler] Added labels:', toAdd.join(', '));
})().catch(e=>{ console.error('[labeler] Error', e); process.exit(1); });
