---
title: Modernization Roadmap
status: proposed
source: modernization plan
updated: 2026-08-09
tags: [roadmap, migration]
---

# Modernization Roadmap

Agent-executable plan to rebuild BRUNO into the target architecture
(`architecture/target.md`) using the target stack (`stack.md`). Each phase is independent and
verifiable. Work phases in order; never start a later phase with an earlier one failing.

## Phase 0 — Prerequisites

- [x] Confirm Node LTS (>= 20) is installed (Node v22.21.1 on this machine).
- [ ] Confirm open design questions in `game/rules.md#9-known-gaps--open-design-questions`
      with the user before implementing engine rules.
- [ ] Decide deck-composition values (vault inclusion) with the user
      (`game/deck-composition.md`).
- [x] Create `AGENTS.md` at repo root documenting how to run, test, and lint the project.
- [x] Move the old prototype into `legacy/` (kept runnable, **do not edit**). All references
      in docs point at `legacy/` paths.

## Phase 1 — `@bruno/shared` (types + data)

- [x] Scaffold `packages/shared` (tsconfig, package.json `@bruno/shared`).
- [x] Implement types + Zod schemas per `card-data-schema.md`:
      `Card`, `DeckComposition`, `CardView`, `PublicPlayer`, `PlayerView`, socket payloads.
- [x] Add Zod for socket events (`architecture/socket-contract.md`).
- [x] Create `cards.ts` from the catalogs in `docs/game/cards-*.md`
      (Silver/Gold/Diamond tiers). Every card must be included; keep `tentative`/unreadable
      flags.
- [x] Verify: `packages/shared` typechecks; export tests assert every documented card id exists.
      (10 Vitest tests pass in `cards.test.ts`; server and client also boot/build clean.)

## Phase 2 — Server engine port (pure TS, no sockets)

- [ ] Scaffold `packages/server` depending on `@bruno/shared`.
- [ ] Port `legacy/game.js` logic into `packages/server/src/game` modules:
      `deck.ts`, `pile.ts`, `player.ts`, `turn-manager.ts`, `engine.ts`, `room-manager.ts`.
- [ ] Fix known bugs while porting (`docs/game/rules.md#known-bugs`): `cards.size` check,
      reverse/skip `instanceof` logic, direction init.
- [ ] Replace leaking `ClientGameState` with `PlayerView` derivation
      (`card-data-schema.md#3`). **Do not serialize hands/pile.**
- [ ] Write Vitest unit tests: deck composition counts, shuffle determinism, deal sizes,
      draw stacking (+2/+4), skip/reverse with 2 vs 3+ players, turn advance, timeout draw.
- [ ] Verify: `npm test` green; engine has zero imports of socket.io.

## Phase 3 — Server socket adapter (typed)

- [ ] Port `legacy/index.js` handlers into `packages/server/src/sockets` with Zod-validated
      payloads and typed emit helpers.
- [ ] Move broadcasts into per-room namespaces/rooms so clients stop filtering by `game_id`.
- [ ] Implement `game:action` `draw` path (currently a no-op) and an error envelope
      (`{ ok: false, code, message }`) for invalid actions.
- [ ] Remove dead code: `players_in_lobby_update`, disconnect self-emit, test players in the
      `Game` constructor.
- [ ] Keep `legacy/views/game.html` working against the new server during transition (serve it
      unchanged) OR gate the client migration as Phase 4.
- [ ] Verify: integration tests with `socket.io-client` cover join → start → play → win.

## Phase 4 — Client rewrite (React + Vite + TS)

- [ ] Scaffold `packages/client` (Vite + React + TS), wire `/` and `/assets` from the server
      or a dev proxy.
- [ ] Port the five tabs as pages: Home, Rooms, Lobby, Game, AfterGame.
- [ ] Implement typed socket client wrapper; replace inline `socket.on(...)` blocks.
- [ ] Build `useGame` hook consuming `PlayerView`; render hand, pile top, deck, turn label,
      profiles. Replace `innerHTML` string building.
- [ ] Implement the empty `drawCard()` and the color-picker for wilds.
- [ ] Move card PNGs into `client/src/assets` (or serve via `/assets`).
- [ ] Delete `legacy/views/*` once the SPA replaces them.
- [ ] Verify: manual playtest of full lobby → game flow; typecheck + lint clean.

## Phase 5 — PDF card set as data + effects

- [ ] Add `location`, `origin`, `artifact` card types and the data for
      `game/locations.md`, `game/origins.md`, `game/special-systems.md`.
- [ ] Implement effect resolvers for each implemented card; keep `[Tentative]` and unreadable
      cards defined as data but **not** wired to resolvers.
- [ ] Implement Mayhem roll at round start (`game/mayhem.md`).
- [ ] Implement Locations application, Origin selection UI, and Fateweaver/Masterchef/
      Pandora's Box tables (`game/special-systems.md`).
- [ ] Verify: engine unit tests for representative effects; data test asserts all cards with
      `status: stable` have a resolver.

## Phase 6 — Quality tooling

- [ ] ESLint + Prettier config at the workspace root; format the whole repo.
- [ ] `npm run typecheck` across all packages (strict).
- [ ] CI workflow (GitHub Actions): install → typecheck → lint → test → build client.
- [ ] Add `README.md` rewrite with dev setup, scripts, and doc links.
- [ ] Port `legacy/assets/css/game.css` to the new UI (or replace with a modern approach).

## Cross-cutting recommendations (agent checklist)

| Topic              | Recommendation                                                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language           | TypeScript strict everywhere; `@bruno/shared` exports all shared types.                                                                                                          |
| Runtime validation | Zod on every socket boundary + env config.                                                                                                                                       |
| Testing            | Vitest: engine (pure) + socket integration + data integrity.                                                                                                                     |
| Determinism        | Injectable RNG in the engine for reproducible tests.                                                                                                                             |
| Security           | Never serialize full `Player`/hand; validate `cardIndex`; treat client ids as untrusted.                                                                                         |
| Timers             | Extract turn timer into `turn-manager` with configurable duration; use `setTimeout` chains or a scheduler, not per-turn `setInterval` (current code leaks intervals on endTurn). |
| Logging            | Replace `g_log` with a tiny typed logger in `server/src` (levels: DEBUG/INFO/WARN/ERROR/SUCCESS).                                                                                |
| Docs               | Keep `docs/game/cards-*.md` in sync with `shared/src/cards` — add a data test that compares ids.                                                                                 |

## Definition of done

- Server engine is pure TS with unit tests, no socket imports.
- Socket layer validates every payload; no hand/pile leaks.
- Client is a React SPA with typed socket events.
- All stable PDF cards are data + resolvers; tentative ones are flagged.
- `npm run typecheck && npm run lint && npm test` pass from the workspace root.
