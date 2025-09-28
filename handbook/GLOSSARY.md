# Glossary

| Term | Definition |
|------|------------|
| Workspace | Canonical logical container (previously Project). Holds resources & data entries. |
| Project (Deprecated) | Legacy name for Workspace, kept with wrapper methods until migration complete. |
| Resource | Versioned polymorphic entity (type + payload + metadata + schemaVersion). |
| DataEntry | Lightweight legacy record stored by DataEngine (will converge into Resource). |
| DomainEvent | Immutable event emitted by services or engine (entityType + operation + payload). |
| Migration | Schema upgrade logic for resources of a data type. |
| DataTypeRegistry | Registry containing validation schemas & migration hooks per data type. |
| Tool | Executable plugin providing domain operation (e.g., calculator). |
| ToolExecutionService | Service running tools with validation + emitting tool.executed. |
| Indexer | Component maintaining searchable projection of resources. |
| ResourceRepository | Abstraction for persistence (InMemory, SQLite). |
| ExportService | Serializes resources to NDJSON (future: manifest + chunking). |
| MetricsService | Aggregates counters & tool execution timings. |
| HealthService | Aggregates snapshot of system status (migrations, index size, events). |
| MigrationService | Detects & applies pending schema upgrades. |
| AccessPolicy | Hook for authorization decisions. Currently allow-all stub. |
| Optimistic Lock | Version check strategy; update must match expectedVersion to proceed. |
| Conflict | Event representing version mismatch during update (resource.conflict). |
| NDJSON | Newline Delimited JSON export format (1 JSON object per line). |
| Manifest (Planned) | Metadata summary file for export batch (counts, versions, hash). |
| FTS | Full Text Search (future: SQLite virtual table). |
| Changelog Anchor | Section in ARCHITECTURE.md tracking summarized evolution for agents. |
