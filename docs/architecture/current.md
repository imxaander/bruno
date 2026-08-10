---
title: Current Architecture
status: draft
source: "source code: legacy/index.js, legacy/game.js, legacy/views/, legacy/assets/"
updated: 2026-08-09
tags: [architecture, current]
---

# Current Architecture

> The implementation described here lives in `legacy/` and is kept runnable for reference.
> It is being replaced by the modernized packages (`packages/server`, `packages/client`).

## 1. Overview

A single Node.js process serves both the HTTP pages and the realtime Socket.io layer.
The game engine lives entirely in one file (`legacy/game.js`, 857 lines). The client is
static HTML with inline `<script>` blocks in `legacy/views/game.html`.

```
Browser (legacy/views/game.html, inline JS)
   │  socket.io-client (autoloaded from /socket.io/socket.io.js)
   ▼
Node process
   ├─ legacy/index.js   Express app + Socket.io wiring + ALL socket handlers
   └─ legacy/game.js    BrunoSystem → Game → Player / Deck / Pile / Card classes
   ▼
   └─ legacy/assets/    static css + card PNG images
```

## 2. Server files

| File              | Responsibility                                                                                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `legacy/index.js` | Creates Express app, HTTP server, Socket.io `Server`. Serves `/` → `views/game.html`, static assets. Registers one `io.on('connection')` block with every socket handler. Global `var System = new BrunoSystem()`.                    |
| `legacy/game.js`  | Defines everything: card classes (`NumberCards`, `SkipCards`, `ReverseCards`, `Draw2Cards`, `Draw4Cards`, `SwitchColorCards`, `ShuffleCards`, `SpecialCards`, `DrawCards`), `Player`, `Deck`, `Pile`, `Game`, `BrunoSystem`, `g_log`. |

## 3. Key classes in legacy/game.js

| Class           | Role                            | Notable members                                                                                                                                                                                                                    |
| --------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BrunoSystem`   | Global registry of games/rooms. | `games[]`, `newGame`, `getRooms`, `getGameIndexWithId`, `playerJoinGame`, `playerLeaveGame`, `getPlayersInGame`, `startGame`, `getClientGameState`, `gameActionHandle`.                                                            |
| `Game`          | One room + game state machine.  | `players[]`, `deck`, `pile`, `turnCounter`, `currentPlayerId/Index`, `currentPlayerDirection`, `currentPlayerEndedTurn`, `currentPlayerTimer`, `currentAdditionalCards`, `drawCardStatus`, flags (`is_prepping`, `is_ongoing`, …). |
| `Player`        | One player.                     | `id`, `name`, `hand[]`, `handAmount`, `isTurn`, `isHost`.                                                                                                                                                                          |
| `Deck` / `Pile` | Draw stack / played stack.      | `Draw()`, `Insert()`, `Shuffle()` (deck), `getTop()` (pile).                                                                                                                                                                       |
| Card classes    | Card model.                     | `id`, `display_name`, `image`, color/number/effect metadata.                                                                                                                                                                       |

## 4. Client (`legacy/views/game.html`)

A single 590-line HTML file containing:

- **Tabs** implemented as `div.game-tabcontents` + `openTab()`: `about`, `rooms`, `in-lobby`,
  `in-game`, `in-aftergame`.
- **State** in globals: `game_state`, `rooms`, `players_in_lobby`, `lastPlayerIndex`.
- **Player identity** via `localStorage.player_info` = `{ id, name, in_game, in_game_id }`.
- **Socket listeners** for every server event (see `socket-contract.md`).
- **UI rendering** by string interpolation into `innerHTML` (no templating, no framework).
- Known stubs: `drawCard()` is empty; the color-picker modal duplicates the new-game modal.

## 5. Known architectural flaws

| #   | Flaw                                                                                                                                                                                                                  | Location                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1   | **All hands leaked to every client.** `getPlayerGameState` assigns `cGS.players = this.players` (each `Player` object includes `.hand`), and `cGS.pile_state = this.pile.cards`. Any client can read everyone's hand. | `game.js:581`, `game.js:579` |
| 2   | Everything in one file. Card classes, engine, and system are 857 lines of mixed concerns with no modules.                                                                                                             | `game.js`                    |
| 3   | All socket handlers inline in one `io.on('connection')` block; no validation, no typed payloads.                                                                                                                      | `index.js:37-151`            |
| 4   | Client logic and markup co-located with inline scripts; UI state globals; string-built DOM.                                                                                                                           | `views/game.html`            |
| 5   | No tests, no type checking, no linting, no build step.                                                                                                                                                                | —                            |
| 6   | Unused/disabled code paths: `SwitchColorCards` and `ShuffleCards` are constructed 0 times (`DeckCardSet`).                                                                                                            | `game.js:36-41`              |
| 7   | Dead code: `Game.socket` is set but only `socket`/`io` passed to `start()`.                                                                                                                                           | `game.js:203`                |
| 8   | Test players auto-added in the `Game` constructor; game hard-wired to one lobby.                                                                                                                                      | `game.js:237`                |

> All `Location` references above are relative to `legacy/` (i.e. `legacy/game.js:581`).

## 6. What works today

- Room list, create/join/leave lobby, host can start.
- Deck population + shuffle, 8-card deal, turn timer (5s), turn advancing with direction + skip.
- Play validation for number/skip/reverse/+2/+4 with draw stacking.
- Server→client game-state push and log/turn events.
