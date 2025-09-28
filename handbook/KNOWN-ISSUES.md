# Known Issues

| ID | Title | Impact | Status | Last Reviewed | Summary |
|----|-------|--------|--------|---------------|---------|
| KI-001 | Web build fails (Node-only imports in core) | Browser bundle bloque (Vite) | ACCEPTED | 2025-09-28 | Node built-ins référencés depuis surface partagée.

## KI-001 – Web build fails (Node-only imports in core)
Conflit Node/browser: services exportent des imports `stream`, `fs`, etc. → Vite échoue. Solution: surface split + conditional exports. Voir TECH-DEBT TD-001 pour stratégie complète.

Exit Criteria: Build web sans warnings Node builtin + guard script vert.
