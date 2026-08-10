# AGENTS.md

Instructions for coding agents and contributors working in this repository.

## Project

BRUNO is a realtime multiplayer card game ("UNO with superpowers"). It is being modernized
from a vanilla JS prototype into a TypeScript monorepo. The game design and full card set are
documented in `docs/` (sourced from `1.4 BRUNO.pdf`).

## Repository layout

```
docs/                 # Game design, architecture, stack, roadmap (markdown only)
legacy/               # Old working prototype (CommonJS Express + Socket.io). Do not modify.
packages/
  shared/             # @bruno/shared — types, Zod schemas, card data, game state
  server/             # @bruno/server — Express + Socket.io (TypeScript)
  client/             # @bruno/client — Vite + React (TypeScript)
```

- `legacy/` is the old prototype, kept runnable for reference. **Do not edit it.**
- `docs/` is the source of truth for game design. Read `docs/STYLE.md` before writing docs.
- Card data lives in `packages/shared/src/cards/` and must stay in sync with
  `docs/game/cards-*.md`.

## Commands (run from the repo root)

| Command                           | What it does                                      |
| --------------------------------- | ------------------------------------------------- |
| `npm install`                     | Install all workspace dependencies.               |
| `npm run dev`                     | Start server (:3000) and client (:5173) together. |
| `npm run dev:server`              | Server only (tsx watch).                          |
| `npm run dev:client`              | Client only (Vite dev server).                    |
| `npm run test`                    | Run tests (currently `@bruno/shared`).            |
| `npm run typecheck`               | Typecheck all three packages.                     |
| `npm run build`                   | Production build (currently client).              |
| `npm run format` / `format:check` | Prettier write / check.                           |

On Windows PowerShell, use `npm.cmd` if `npm` is blocked by the execution policy.

## Conventions

- TypeScript, strict mode. No `any` without a documented reason.
- All packages are ESM (`"type": "module"`).
- `@bruno/shared` is source-first: packages import its `src` directly; there is no build
  step for shared in dev.
- Socket payloads MUST be validated with Zod schemas defined in `@bruno/shared` before
  reaching the game engine.
- Never serialize a player's full hand or the entire pile to clients. See
  `docs/architecture/state-model.md`.
- Do not add code comments unless they explain non-obvious behavior.
- Docs are markdown only, follow `docs/STYLE.md`.

## Verification

Always run `npm run typecheck` and `npm test` after changes. Run `npm run format` before
committing.
