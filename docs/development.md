---
title: Local Development
status: stable
source: project setup
updated: 2026-08-09
tags: [development, setup]
---

# Local Development

How to set up and run the modernized BRUNO monorepo.

## Prerequisites

- **Node.js >= 20** (LTS recommended).
- **npm >= 10**. On Windows PowerShell, `npm` may be blocked by the execution policy; use
  `npm.cmd` instead (e.g. `npm.cmd install`).

## Install

```bash
npm install        # or: npm.cmd install
```

This installs all workspaces (`packages/*`) and hoists dependencies to the root
`node_modules/`.

## Run

| Command              | What it does                                   | URL                                                            |
| -------------------- | ---------------------------------------------- | -------------------------------------------------------------- |
| `npm run dev`        | Server + client together (concurrently).       | server `http://localhost:3000`, client `http://localhost:5173` |
| `npm run dev:server` | Server only, `tsx watch` (restarts on change). | `http://localhost:3000`                                        |
| `npm run dev:client` | Client only, Vite dev server.                  | `http://localhost:5173`                                        |

The Vite dev server proxies `/socket.io` to the backend, so the client can talk to the
server without CORS issues.

## Verify

```bash
npm run typecheck   # strict TS check across shared, server, client
npm test            # Vitest suite (currently @bruno/shared)
npm run build       # production build of the client
npm run format      # Prettier write
npm run format:check
```

## Legacy prototype

The old working prototype lives in `legacy/` (CommonJS Express + Socket.io). It is kept
runnable for reference and is **not** part of the workspace.

```bash
cd legacy
npm install
npm start           # serves on http://localhost:3000
```

Do not edit `legacy/`. It is replaced by `packages/server` + `packages/client`.

## Project layout

```
docs/                 # design + architecture + roadmap (source of truth for the game)
legacy/               # old prototype (do not modify)
packages/
  shared/             # @bruno/shared — types, Zod schemas, card data, game state
    src/cards/        #   card catalog (cards.ts), deck composition, card types
    src/events/       #   socket payload schemas + typed event contract
    src/game/         #   CardView / PublicPlayer / PlayerView state shapes
  server/             # @bruno/server — Express + Socket.io (tsx dev)
    src/index.ts      #   bootstrap: http + socket + health route
    src/config.ts     #   env config (PORT, CLIENT_URL)
    src/sockets/      #   typed socket handlers (Zod-validated)
  client/             # @bruno/client — Vite + React
    src/App.tsx       #   placeholder page
    src/socket/       #   typed socket.io-client wrapper
```

## Configuration (server)

| Env var      | Default                 | Purpose                                     |
| ------------ | ----------------------- | ------------------------------------------- |
| `PORT`       | `3000`                  | HTTP + Socket.io port.                      |
| `CLIENT_URL` | `http://localhost:5173` | CORS origin allowed for socket connections. |

## Notes / gotchas

- `@bruno/shared` is **source-first**: consumers import its `src/index.ts` directly. There
  is no build step for shared in dev (tsx and Vite handle TS). Keep its `"exports"` pointing
  at `./src/index.ts`.
- If you add a new package, add it to `packages/*` and run `npm install` so it is linked.
- Run `npm run format` before committing; Prettier config is at the root.
- Socket payloads MUST be Zod-validated before reaching the game engine
  (`docs/architecture/socket-contract.md`).
- Never serialize a full player hand or the whole pile to clients
  (`docs/architecture/state-model.md`).

## What is scaffolded vs not yet

| Area                                                                           | Status                                    |
| ------------------------------------------------------------------------------ | ----------------------------------------- |
| Monorepo + workspaces                                                          | Done                                      |
| `@bruno/shared` types + card data (90 vault cards)                             | Done                                      |
| Zod socket schemas + typed event contract                                      | Done                                      |
| Server bootstrap (Express + Socket.io, typed)                                  | Skeleton only                             |
| Client bootstrap (Vite + React, typed socket)                                  | Skeleton only                             |
| Game engine (rules, turns, effects)                                            | Not started — see `docs/modernization.md` |
| Card data: locations, origins, artifacts, mayhem, fateweaver/masterchef tables | Not started (Phase 5)                     |
| ESLint / CI                                                                    | Not started (Phase 6)                     |
