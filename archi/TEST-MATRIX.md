# Test Coverage Matrix

| Area | Script / Test | Status | Gaps |
|------|---------------|--------|------|
| Kernel bootstrap | bootstrap-selftest.ts | ✅ | Add failure injection |
| Event wiring | kernel-selftest.ts | ✅ | Need assertion on event order |
| Repository (in-memory) | repository-selftest.ts | ✅ | None critical |
| Bridge (engine→repo) | bridge-selftest.ts | ✅ | Conflict path not covered |
| Validation + Zod | validation-selftest.ts | ✅ | Add negative measurement test |
| Resource deletion | deletion-selftest.ts | ✅ | Verify index removal depth |
| Metrics aggregation | metrics-selftest.ts | ✅ | Add p95 assertion |
| Health snapshot | health-selftest.ts | ✅ | Add pending migrations scenario |
| Note migration | migration-selftest.ts | ✅ | Multi-type chain scenario missing |
| Measurement migration | measurement-migration-selftest.ts | ✅ | Edge: already up-to-date |
| Export NDJSON | export-selftest.ts | ✅ | Large dataset chunk simulation |
| Tool execution | tool-execution-selftest.ts | ✅ | Invalid input schema case |
| Indexer basics | indexer-selftest.ts | ✅ | Full-text ranking (future) |
| Conflicts | conflict-selftest.ts | ✅ | Consider multi-conflict race test |
| SQLite filters | (planned) sqlite-filters-selftest.ts | ❌ | Implement |
| Export manifest | export-manifest-selftest.ts | ✅ | Hash + incremental future |
| Reindex | (planned) reindex-selftest.ts | ❌ | Implement |
| Workspace key migration | (planned) key-migration-selftest.ts | ❌ | Implement |

---
## Priorities (Next)
1. sqlite-filters-selftest.ts
2. reindex-selftest.ts (after filters)
3. chunked-export-selftest.ts (future)
