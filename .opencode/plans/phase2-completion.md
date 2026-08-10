# Phase 2 → Completion Roadmap

Overview of all remaining phases to take BRUNO from the current state (rooms + design port done)
to a complete game. Execution order matters — each phase is verifiable and depends on the last.

## Current state

- **Done:** `@bruno/shared` types/data/tests (Phase 1); client design port (Home, Rooms, Lobby,
  Game, AfterGame, GameCard, modals, board components); Phase 2a plan approved.
- **Card data:** 90 vault cards in `packages/shared/src/cards/cards.ts` (27 silver / 21 gold /
  42 diamond; 83 `draft`, 7 `tentative`). Locations (2), origins (5), artifacts (2), mayhem (9)
  exist **only as docs** — no data in shared yet.
- **Base deck:** 110 cards via `buildBaseDeck(DEFAULT_DECK_COMPOSITION)` (numbers 0–9 ×1, skip/
  reverse/+2 ×5/color, +4 ×10). Deal 8, seed pile, random first turn, direction `1`
  (`docs/game/rules.md` §1).

## Phases

| #   | Phase                         | Deliverable bar                                                         | Depends on |
| --- | ----------------------------- | ----------------------------------------------------------------------- | ---------- |
| 2a  | Basic room lifecycle          | Create/list/join/leave rooms, lobby, host-only start, real deal → board | —          |
| 2b  | Base game engine (pure TS)    | Playable UNO rules, unit-tested, zero socket imports                    | 2a         |
| 2c  | Socket actions + game end     | play/draw/choose-color, `game:ended`, integration tests                 | 2b         |
| 4   | Client completion (base game) | Color picker, real timer, AfterGame, legality highlight, playtest       | 2c         |
| 5   | Extended card set + effects   | Vault/location/origin/artifact data + resolvers, sub-systems            | 4          |
| 6   | Quality tooling + deploy      | ESLint, CI, served client, README, production build                     | 5          |

## Completion bar (Definition of Done)

- Engine is pure TS with unit tests, no socket imports.
- Socket layer validates every payload; no hand/pile leaks (`PlayerView` only).
- Client is a React SPA with typed socket events.
- All stable PDF cards are data + resolvers; tentative ones flagged.
- `npm run typecheck && npm run lint && npm test` pass from the workspace root.

## Open design questions (resolve with the user; gates for 2b/5)

| Area          | Questions                                                                                          | Doc                           |
| ------------- | -------------------------------------------------------------------------------------------------- | ----------------------------- |
| Rules         | Deck exhaustion behavior; does drawing end your turn; does +4 require a color; min/max enforcement | `game/rules.md` §9            |
| Deck          | Vault counts in the deck (or strictly effect-granted)                                              | `game/deck-composition.md` §3 |
| Mayhem        | Target ambiguity on several rolls                                                                  | `game/mayhem.md` §2           |
| Fateweaver    | Streak column mapping (3–11 vs 12+); the `???` prize                                               | `game/special-systems.md` §5  |
| Pandora's Box | Upgrade-tier timing when a vault is used                                                           | `game/special-systems.md` §5  |
| Boot/Leg      | How they enter play; what powers Bootleg grants                                                    | `game/special-systems.md` §5  |
| Locations     | Unlock mechanism (Fateweaver rank vs standalone)                                                   | `game/locations.md`           |
| Origins       | Exclusivity; change between games; Grand Architect activation timing                               | `game/origins.md` §3          |

See the per-phase docs in this directory: `phase2-rooms-basic.md`, `phase2b-base-engine.md`,
`phase2c-socket-actions.md`, `phase4-client-completion.md`, `phase5-extended-cards.md`,
`phase6-quality-deploy.md`.
