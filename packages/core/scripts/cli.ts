#!/usr/bin/env node
/**
 * cli.ts - Outil ligne de commande minimal pour le noyau
 * Usage:
 *   node cli.ts migrate --workspace w1
 *   node cli.ts export --workspace w1 > export.ndjson
 */
import { bootstrapKernel } from '../kernel/bootstrap/KernelBootstrap.js';
import { MigrationService } from '../kernel/services/MigrationService.js';

function parseArgs(argv: string[]) {
  const args: Record<string,string|boolean> = {}; let current: string | null = null;
  for (const a of argv) {
    if (a.startsWith('--')) { current = a.slice(2); args[current] = true; }
    else if (current) { args[current] = a; current = null; }
    else if (!args._) { (args as any)._ = [a]; } else { (args as any)._ .push(a); }
  }
  return args;
}

async function main(){
  const argv = parseArgs(process.argv.slice(2));
  const cmd = (argv._ && (argv as any)._[0]) || Object.keys(argv).find(k=>!k.includes('='));
  const workspace = (argv.workspace as string) || (argv.w as string) || 'default';
  const kernel = bootstrapKernel();
  if (cmd === 'migrate') {
    const migrator = new MigrationService(kernel.repository);
    const res = await migrator.migrateWorkspace(workspace);
    console.log(JSON.stringify({ ok:true, migrated: res.migrated, touched: res.touchedIds.length }));
  } else if (cmd === 'export') {
    const data = await kernel.exporter.exportWorkspace(workspace);
    process.stdout.write(data + '\n');
  } else if (cmd === 'health') {
    const snap = await kernel.health.snapshot(workspace, async ()=>({ status:'synced', pending_changes:0 }));
    console.log(JSON.stringify(snap, null, 2));
  } else {
    console.log('Commands: migrate | export | health  --workspace <id>');
    process.exit(1);
  }
}
main().catch(e=>{ console.error(e); process.exit(1); });