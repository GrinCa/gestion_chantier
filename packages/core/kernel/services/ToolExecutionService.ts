/**
 * ToolExecutionService.ts
 * ---------------------------------------------------------------------------
 * Orchestrateur d'exécution d'outils déclarés dans le ToolRegistry.
 * Emission d'un événement `tool.executed` après succès (ou `tool.failed` possible futur).
 */
import type { EventBus } from '../events/EventBus.js';
import type { ToolRegistry, ToolContext, ToolDefinition } from '../tools/ToolRegistry.js';
import type { DomainEvent } from '../events/DomainEvent.js';

export interface ToolExecutionResult<O = any> {
  output: O;
  durationMs: number;
  startedAt: number;
  finishedAt: number;
  tool: string;
  version: string;
}

export interface ToolContextFactory {
  (): ToolContext;
}

export class ToolExecutionService {
  constructor(private registry: ToolRegistry, private events: EventBus, private ctxFactory: ToolContextFactory) {}

  private id() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

  async run<I = any, O = any>(key: string, input: I): Promise<ToolExecutionResult<O>> {
    const tool = this.registry.get<I, O>(key);
    if (!tool) throw new Error(`Tool not found: ${key}`);
    const ctx = this.ctxFactory();
    const started = Date.now();
    let output: O;
    try {
      output = await tool.execute(input, ctx);
    } catch (err: any) {
      await this.emit('tool', key, 'failed', { error: err?.message || String(err) }, started, ctx.currentUser() || undefined);
      throw err;
    }
    const finished = Date.now();
    const result: ToolExecutionResult<O> = {
      output,
      durationMs: finished - started,
      startedAt: started,
      finishedAt: finished,
      tool: tool.key,
      version: tool.version
    };
    await this.emit('tool', tool.key, 'executed', {
      durationMs: result.durationMs,
      startedAt: started,
      finishedAt: finished,
      version: tool.version
    }, finished, ctx.currentUser() || undefined);
    return result;
  }

  private async emit(entityType: string, entityId: string, operation: string, payload: any, timestamp: number, actor?: string) {
    const evt: DomainEvent = { id: this.id(), entityType, entityId, operation, timestamp, payload, actor };
    try { await this.events.emit(evt); } catch (e) { console.warn('[ToolExecutionService] emit failed', e); }
  }
}
