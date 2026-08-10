# Phase 6 — Quality Tooling + Deploy

Harden the repo and make it runnable in production. Final phase; nothing about game features.

## Scope

- **ESLint** — flat config at the workspace root, TS strict-ish rules, wired into a root
  `npm run lint`; resolve current warnings. Add to Definition of Done.
- **Prettier** — already configured; run `npm run format` and commit the result (only our files;
  `legacy/` stays excluded via `.prettierignore`).
- **CI** — GitHub Actions workflow: install → typecheck → lint → test → build client.
- **Serve client from server** — `express.static` for the built `dist` + `GET /` root route
  (currently "Cannot GET /"); keep `/health`. Verify SPA route fallback if paths are used.
- **README** — rewrite with dev setup, scripts, doc links (root README + per-package).
- **Production build** — `npm run build` + a smoke check that the served client connects
  through the Vite proxy or a same-origin socket path.
- **Cross-cutting** — recheck modernization.md cross-cutting list: typed logger in place of
  `console.log` (optional), deterministic RNG everywhere, timer cleanup audit.

## Verification

- `npm.cmd run typecheck && npm.cmd run lint && npm.cmd test` green from the root.
- CI workflow green on a fresh checkout.
- `GET /` serves the built app; game flow works against the production server.
