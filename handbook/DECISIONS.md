# Architectural Decisions (ADR Log)
Format: reverse chronological (append at top). Keep entries short.

## [2025-09-28] Universal Architecture Phase 1 Completed
Reason: Extraire logique métier calculatrice du front pour réutilisation future (mobile / backend).
Decision: Création package core avec Engine/DataManager/Tool; Web consomme core uniquement.
Consequences: Phase 1 close; fichier de statut détaillé supprimé (contenu synthétisé ici). Prochaines phases: mobile package + tests + sync offline.

## [2025-09-28] Introduce Optimistic Locking
Reason: Prevent lost updates & enable future merge strategies.
Decision: `ResourceService.update` accepts `expectedVersion`; conflict → event + throw.
Consequences: Requires clients to fetch version; DataEngine can surface conflicts.

## [2025-09-28] Workspace Terminology Adoption
Reason: Broader scope than "Project".
Decision: Added Workspace interface + createWorkspace; legacy wrappers @deprecated.
Consequences: Dual naming in code until key migration; docs updated incrementally.

## [2025-09-28] Event-Centric Observability First
Reason: Faster iteration and testability than early full persistence complexity.
Decision: All domain changes emit events; MetricsService aggregates from stream.
Consequences: Replay not yet implemented; future log persistence needed for durability.

## [2025-09-28] In-Memory + SQLite Dual Repository Strategy
Reason: Fast iteration + future persistence path.
Decision: Keep repository interface slim; implement SQLite stub early.
Consequences: Missing filters/pagination; safe surface for later extension.
