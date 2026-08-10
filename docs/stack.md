---
title: Technology Stack
status: proposed
source: package.json + modernization plan
updated: 2026-08-09
tags: [stack]
---

# Technology Stack

## 1. Current stack

| Layer       | Choice                   | Version         | Notes                                                          |
| ----------- | ------------------------ | --------------- | -------------------------------------------------------------- |
| Language    | JavaScript (CommonJS)    | —               | `"type": "commonjs"`                                           |
| Server      | Node + Express           | express ^4.21.2 | Serves HTML + static assets                                    |
| Realtime    | Socket.io                | ^4.8.1          | Both server and client (served from `/socket.io/socket.io.js`) |
| Client      | Vanilla JS + inline HTML | —               | No framework, no build                                         |
| Build       | None                     | —               | No bundler/transpiler                                          |
| Tests       | None                     | —               |                                                                |
| Lint/format | None                     | —               |                                                                |

## 2. Target stack

| Layer              | Choice                                                     | Why                                                                                                   |
| ------------------ | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Language           | **TypeScript (strict)**                                    | Type safety across server/client/shared; catches state-shape bugs like the hand leak at compile time. |
| Repo               | **npm workspaces monorepo** (`shared`, `server`, `client`) | Single source of truth for types/data; one install; shared tooling.                                   |
| Server             | **Node + Express + Socket.io** (kept)                      | Already proven for this app; low migration risk. Migrated to TS with typed events.                    |
| Client             | **React + Vite + TS**                                      | Component model fits the tab/lobby/game UI; Vite gives dev server + HMR + build.                      |
| Runtime validation | **Zod**                                                    | Schemas for socket payloads and config (see `card-data-schema.md`).                                   |
| Tests              | **Vitest**                                                 | Same toolchain for server engine unit tests; `socket.io-client` for integration tests.                |
| Lint/format        | **ESLint + Prettier**                                      | Consistent style; run in CI.                                                                          |
| Engine             | **Pure TS modules** (transport-agnostic)                   | Unit-testable game logic without sockets.                                                             |

## 3. Dependency map (target)

```
@bruno/shared   (deps: zod)
@bruno/server   (deps: express, socket.io, @bruno/shared, zod)
@bruno/client   (deps: react, react-dom, socket.io-client, @bruno/shared)
                 dev: vite, @vitejs/plugin-react, typescript, vitest, eslint, prettier
```

## 4. Node/TypeScript baseline

- Node LTS (>= 20) as the runtime floor.
- TypeScript `~5.x`, `"strict": true`, `"moduleResolution": "bundler"` for client,
  `"node16"/"nodenext"` for server.
- Shared package compiled to both ESM and CJS (or `type: module` throughout the repo).
