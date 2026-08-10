---
title: Target Architecture
status: proposed
source: modernization plan
updated: 2026-08-09
tags: [architecture, target]
---

# Target Architecture

Proposed structure for the modernized codebase. See `../modernization.md` for the phased
migration plan and `../stack.md` for library choices.

## 1. Monorepo layout (npm workspaces)

```
bruno/
├─ package.json               # workspace root (scripts, tooling)
├─ packages/
│  ├─ shared/                 # types + data + constants used by both ends
│  │  ├─ src/
│  │  │  ├─ cards/            # card types, card data (the PDF catalog), deck composition
│  │  │  ├─ events/           # typed socket event contracts + Zod schemas
│  │  │  ├─ game/             # pure game-state types (PlayerView, PublicGameState, …)
│  │  │  └─ index.ts
│  │  └─ package.json         # @bruno/shared
│  ├─ server/                 # Node + Express + Socket.io
│  │  ├─ src/
│  │  │  ├─ index.ts          # bootstrap (http + socket + static)
│  │  │  ├─ http/             # express routes
│  │  │  ├─ sockets/          # typed socket handler registration + auth
│  │  │  ├─ game/             # framework-agnostic engine (pure TS, unit-testable)
│  │  │  │  ├─ engine.ts      # Game state machine
│  │  │  │  ├─ turn-manager.ts
│  │  │  │  ├─ deck.ts / pile.ts
│  │  │  │  ├─ effects/       # card effect resolvers (per card id)
│  │  │  │  └─ room-manager.ts
│  │  │  └─ config.ts         # env-driven config (PORT, etc.)
│  │  └─ package.json
│  └─ client/                 # React + Vite + TS
│     ├─ src/
│     │  ├─ pages/            # Home, Rooms, Lobby, Game, AfterGame
│     │  ├─ features/
│     │  │  ├─ game/          # useGame hook, board, hand, pile, turn label
│     │  │  └─ lobby/         # rooms list, join/create
│     │  ├─ socket/           # typed socket client wrapper
│     │  ├─ components/
│     │  └─ assets/           # moved card PNGs
│     ├─ index.html
│     ├─ vite.config.ts
│     └─ package.json
```

## 2. Design principles

1. **Engine is transport-agnostic.** `packages/server/src/game` imports only from
   `@bruno/shared`. Socket.io is a thin adapter. This makes the engine unit-testable
   with Vitest and portable.
2. **Single source of truth for cards.** Card catalog + deck composition live in
   `@bruno/shared` (see `../card-data-schema.md`). Docs reference it; never duplicate
   data into server/client.
3. **Per-player views.** The server derives a `PlayerView` for each client so hands are
   never serialized to others (fixes flaw #1 in `current.md`).
4. **Typed events.** All socket events have runtime-validated payloads (Zod) and TS types.
5. **No secrets in client.** Player auth/id stays client-generated for now (existing model);
   a future `session` upgrade is possible.

## 3. Data flow

```
Client (React) ──typed socket.io event──▶ Server socket adapter
    ▲                                       │ validates (Zod)
    │                                       ▼
    │                              Game engine (pure TS)
    │                                       │ applies effect, mutates state
    │                                       ▼
    └──typed event / PlayerView◀── server socket adapter ── room-manager emits
```

## 4. Module boundaries

| Boundary             | Owns                                 | Does not own          |
| -------------------- | ------------------------------------ | --------------------- |
| `@bruno/shared`      | Types, schemas, card data, constants | Runtime behavior, I/O |
| `server/src/sockets` | Event wiring, validation, auth       | Game logic            |
| `server/src/game`    | Rules, state, effects                | Transport             |
| `client`             | Rendering, input, local UI state     | Authority/validation  |

## 5. Migration order

Full detail in `../modernization.md`. Summary:

1. `@bruno/shared` (types + data).
2. Server engine port (pure TS) + Vitest.
3. Socket adapter typed + Zod.
4. Client React SPA.
5. PDF card set as data + effects.
6. Quality tooling (ESLint, Prettier, CI).

## 6. Open decisions

- Whether to keep the current 5-second turn timer or make it configurable (see `rules.md`).
- Whether card image assets stay as static PNGs or move under `client/src/assets`.
- Authentication: keep `localStorage` player ids vs. server-issued sessions.
