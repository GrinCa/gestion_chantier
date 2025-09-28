/**
 * MetricsService.ts
 * ---------------------------------------------------------------------------
 * Collecte métriques simples en mémoire: compte d'événements par type, temps moyen
 * d'exécution d'outils, taille index. Peut être étendu vers un export Prometheus.
 */
import type { EventBus } from '../events/EventBus.js';
import type { DomainEvent } from '../events/DomainEvent.js';
import type { Indexer } from '../indexer/Indexer.js';

export interface MetricsSnapshot {
  timestamp: number;
  events: Record<string, number>;
  toolExec: {
    count: number;
    avgDurationMs: number;
    p95DurationMs: number;
  };
  indexSize?: number;
}

export class MetricsService {
  private eventCounts: Record<string, number> = {};
  private toolDurations: number[] = [];
  private indexer?: Indexer;

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

  snapshot(): MetricsSnapshot {
    const count = this.toolDurations.length;
    const sorted = [...this.toolDurations].sort((a,b)=>a-b);
    const p95 = count ? sorted[Math.floor(0.95*(count-1))] : 0;
    const avg = count ? this.toolDurations.reduce((a,b)=>a+b,0)/count : 0;
    return {
      timestamp: Date.now(),
      events: { ...this.eventCounts },
      toolExec: { count, avgDurationMs: Math.round(avg), p95DurationMs: p95 },
      indexSize: this.indexer?.size()
    };
  }

  reset(){
    this.eventCounts = {};
    this.toolDurations = [];
  }
}
