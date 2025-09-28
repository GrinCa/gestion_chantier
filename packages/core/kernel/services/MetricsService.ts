/**
 * MetricsService.ts
 * ---------------------------------------------------------------------------
 * Collecte métriques simples en mémoire: compte d'événements par type, temps moyen
 * d'exécution d'outils, taille index. Peut être étendu vers un export Prometheus.
 */
import type { EventBus } from '../events/EventBus.js';
import type { DomainEvent } from '../events/DomainEvent.js';
import type { Indexer } from '../indexer/Indexer.js';

/** Internal bounded array helper (keeps last N durations for percentile calcs). */
class DurationBucket {
  private values: number[] = [];
  constructor(private maxSize = 500) {}
  push(v: number){
    if (typeof v !== 'number' || Number.isNaN(v) || v < 0) return;
    this.values.push(v);
    if (this.values.length > this.maxSize) {
      // drop oldest
      this.values.splice(0, this.values.length - this.maxSize);
    }
  }
  snapshot(){
    const count = this.values.length;
    if (!count) return { count: 0, avg: 0, p95: 0 };
    const sorted = [...this.values].sort((a,b)=> a-b);
    const p95 = sorted[Math.floor(0.95*(count-1))];
    const avg = this.values.reduce((a,b)=> a+b, 0)/count;
    return { count, avg, p95 };
  }
}

export interface MetricsSnapshot {
  timestamp: number;
  events: Record<string, number>;
  toolExec: { count: number; avgDurationMs: number; p95DurationMs: number; };
  indexSize?: number;
  /** Repository operation latencies */
  repository?: {
    ops: Record<string, { count: number; avgMs: number; p95Ms: number }>;
    totalOps: number;
  };
  /** Access denied counters */
  accessDenied?: { total: number; byAction: Record<string, number> };
  /** Export counters */
  export?: { total: number; byKind: Record<string, { count: number; resources: number; lastDurationMs: number }> };
}

export class MetricsService {
  private eventCounts: Record<string, number> = {};
  private toolDurations = new DurationBucket();
  private indexer?: Indexer;

  // repo instrumentation
  private repoDurations: Record<string, DurationBucket> = {};
  private repoCounts: Record<string, number> = {};

  // access denied
  private accessDeniedTotal = 0;
  private accessDeniedByAction: Record<string, number> = {};

  // export metrics
  private exportByKind: Record<string, { count: number; resources: number; lastDurationMs: number }> = {};
  private exportTotal = 0;

  constructor(bus: EventBus, indexer?: Indexer){
    this.indexer = indexer;
    bus.on('*', (e)=> this.track(e));
  }

  private track(e: DomainEvent){
    const key = `${e.entityType}.${e.operation}`;
    this.eventCounts[key] = (this.eventCounts[key]||0)+1;
    if(e.entityType==='tool' && e.operation==='executed'){
      const d = e.payload?.durationMs;
      if(typeof d === 'number') this.toolDurations.push(d);
    }
  }

  recordRepositoryOp(op: string, durationMs: number){
    this.repoCounts[op] = (this.repoCounts[op]||0)+1;
    if(!this.repoDurations[op]) this.repoDurations[op] = new DurationBucket();
    this.repoDurations[op].push(durationMs);
  }

  recordAccessDenied(action: string){
    this.accessDeniedTotal += 1;
    this.accessDeniedByAction[action] = (this.accessDeniedByAction[action]||0)+1;
  }

  recordExport(kind: string, resourceCount: number, durationMs: number){
    this.exportTotal += 1;
    const k = this.exportByKind[kind] || { count: 0, resources: 0, lastDurationMs: 0 };
    k.count += 1;
    k.resources += resourceCount;
    k.lastDurationMs = durationMs;
    this.exportByKind[kind] = k;
  }

  snapshot(): MetricsSnapshot {
    const toolSnap = this.toolDurations.snapshot();
    const repoOps: Record<string, { count: number; avgMs: number; p95Ms: number }> = {};
    let totalOps = 0;
    for (const op of Object.keys(this.repoCounts)) {
      const snap = this.repoDurations[op]?.snapshot();
      totalOps += this.repoCounts[op];
      repoOps[op] = { count: this.repoCounts[op], avgMs: Math.round(snap.avg||0), p95Ms: Math.round(snap.p95||0) };
    }
    return {
      timestamp: Date.now(),
      events: { ...this.eventCounts },
      toolExec: { count: toolSnap.count, avgDurationMs: Math.round(toolSnap.avg), p95DurationMs: Math.round(toolSnap.p95) },
      indexSize: this.indexer?.size(),
      repository: Object.keys(repoOps).length ? { ops: repoOps, totalOps } : undefined,
      accessDenied: this.accessDeniedTotal ? { total: this.accessDeniedTotal, byAction: { ...this.accessDeniedByAction } } : undefined,
      export: this.exportTotal ? { total: this.exportTotal, byKind: { ...this.exportByKind } } : undefined
    };
  }

  reset(){
    this.eventCounts = {};
    this.toolDurations = new DurationBucket();
    this.repoDurations = {};
    this.repoCounts = {};
    this.accessDeniedTotal = 0;
    this.accessDeniedByAction = {};
    this.exportByKind = {};
    this.exportTotal = 0;
  }
}
