# Phase 2b — Base Game Engine (pure TS)

Extend the Phase 2a room model into the full rules engine for the **base deck only**
(no vault/location/origin/mayhem). Zero socket imports in `packages/server/src/game`.

## Scope

`docs/game/rules.md` §1–8:

- **Setup:** shuffle 110-card deck, deal 8, seed pile, random first turn, direction `1`.
- **Play validation:** a card matches the pile top by color, number, or symbol; `+4` is always
  playable (wild). Reject when a draw effect is pending unless the card continues the stack.
- **Draw stacking:** `+2`/`+4` while a draw is pending add to the running total; the player who
  cannot continue draws the total at once, then resets to 0.
- **Skip:** advances turn index by 2.
- **Reverse:** 2 players → acts as skip; 3+ → flips `currentDirection` between `1`/`-1`.
- **Turn timer:** 5s (configurable) via a `setTimeout` chain owned by `turn-manager.ts` — no
  leaked `setInterval` (rules.md §10 bug list; modernization.md cross-cutting).
- **Timeout draw:** auto-draw the pending stack total (or 1) when a turn expires.
- **Win detection:** a player emptying their hand ends the game (`status: "concluding"`); winner
  recorded. `game:ended` emission is Phase 2c.

## Fix known bugs from `legacy/game.js`

- `distributeCards` `deck.cards.size` guard (line 684) → use `.length`.
- Reverse/skip `instanceof` validation inversion (lines 369-375, 404-410).
- `currentPlayerDirection` uninitialized in constructor (line 256).

## Module layout (`packages/server/src/game/`)

| Module            | Owns                                                                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `deck.ts`         | Build (shared `buildBaseDeck`), shuffle (injectable RNG), draw (recycles pile on exhaustion), deal, `seedPile`/`reshuffleFromPile` |
| `engine.ts`       | `isPlayable`, `playCard`, `applyTimeoutDraw`, `advanceTurn`/`nextIndex`, win check, `EngineError` codes                            |
| `turn-manager.ts` | Per-room 5s timer (injectable `setTimer`), schedule/cancel, timeout auto-draw hook                                                 |
| `room.ts`         | Room model (players, deck, pile, status, turn state, `activeColor`, `pendingDraw`, winner)                                         |
| `room-manager.ts` | Registry: create/join/leave/start + `performAction` (play), `onTurnTimeout`, `PlayerView` derivation, `RoomEventSink`              |
| `player-view.ts`  | `PlayerView`/`LobbyPlayer`/`RoomSummary` projections (no leaks)                                                                    |

## Tests (Vitest)

- Deck composition counts (110); shuffle determinism with seeded RNG; two shuffles differ.
- Deal sizes; pile seeding; deck exhaustion reshuffle.
- Play validation matrix (color/number/symbol match, +4 wild, invalid rejections).
- Draw stacking: +2 then +2 → 4; +2 then +4 → 6; non-stack player draws total once.
- Skip (2-index advance) and reverse (2 vs 3+ players) with direction flips.
- Turn timeout → auto-draw; timer never double-fires; win detection.

## Gate

Open questions resolved with the user before implementation (2026-08-10):

- **Deck exhaustion** → shuffle the pile (minus the top card) back into the deck.
- **Does drawing end the turn?** → Yes: a timeout draw is the only draw action; it ends the turn.
- **Does +4 require a chosen color?** → Yes in this phase; the engine rejects `+4` without a `chosenColor` (color-picker UI is 2c/4).
- **Min player count** → keep 1 (solo preview); no enforcement change.

## Status: IMPLEMENTED (engine-only; socket wiring is Phase 2c)

- `engine.ts`/`turn-manager.ts`/`room-manager.ts` (performAction, onTurnTimeout) + unit suites; server typecheck, build, format, and 49 vitest tests green.

## Bugs found and fixed during implementation

- **Infinite loop in `startGame` re-seed**: rejecting a `draw4` pile top with `deck.push(pop())` re-popped the same card forever. Fixed with `deck.unshift(...)` so the next `seedPile` draws a different card. (This was also the cause of the earlier vitest "hang" reports.)
