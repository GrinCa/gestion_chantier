/**
 * tool-execution-selftest.ts
 * ---------------------------------------------------------------
 * Vérifie exécution outil via ToolExecutionService + events tool.executed.
 */
import { EventBus } from '../kernel/events/EventBus.js';
import { globalToolRegistry, ToolRegistry } from '../kernel/tools/ToolRegistry.js';
import { ToolExecutionService } from '../kernel/services/ToolExecutionService.js';

// Enregistrer outil de test
globalToolRegistry.register({
  key: 'calc:add',
  name: 'Addition',
  version: '1.0.0',
  async execute(input: { a: number; b: number }) {
    return { sum: input.a + input.b };
  }
});

async function main() {
  const bus = new EventBus();
  const events: any[] = [];
  bus.onAny(e => { if (e.entityType === 'tool') events.push(e); });
  const service = new ToolExecutionService(globalToolRegistry as ToolRegistry, bus, () => ({
    now: () => Date.now(),
    currentUser: () => 'u-test',
    workspaceId: () => 'w-test'
  }));
  const result = await service.run('calc:add', { a: 2, b: 5 });
  if (result.output.sum !== 7) { console.error('Wrong sum'); process.exit(1); }
  const executed = events.find(e => e.operation === 'executed');
  if (!executed) { console.error('Missing executed event'); process.exit(1); }
  console.log('ToolExecution self-test OK duration=', result.durationMs);
}
main().catch(e=>{console.error(e);process.exit(1);});
