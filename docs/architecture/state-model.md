---
title: State Model
status: draft
source: "source code: legacy/game.js, legacy/views/game.html"
updated: 2026-08-09
tags: [architecture, state]
---

# State Model

How game state is represented, who sees what, and how players are identified.

## 1. Server-side state

### `ClientGameState` (server class, `legacy/game.js:4`)

| Field               | Type       | Meaning                                      |
| ------------------- | ---------- | -------------------------------------------- |
| `playerCount`       | number     | Number of players.                           |
| `players`           | `Player[]` | **Full player objects including each hand.** |
| `playerInTurn`      | player id  | Current player's id.                         |
| `pile_state`        | `Card[]`   | **Entire pile.**                             |
| `hand_state`        | `Card[]`   | Requesting player's hand.                    |
| `deckCount`         | number     | Deck size.                                   |
| `player_index`      | number     | Requesting player's index.                   |
| `playerInTurnIndex` | number     | Current player's index.                      |

> `playerInTurn`/`playerInTurnIndex` are written into `getPlayerGameState` at
> `legacy/game.js:580` and `legacy/game.js:585` but **not declared** in the
> `ClientGameState` constructor — they are
> added dynamically. This is loose typing, not a bug per se.

### `Player` (`legacy/game.js:130`)

`{ id, name, hand: Card[], handAmount, isTurn, isHost }`

### `Game` flags / state

`is_prepping`, `is_ongoing`, `is_concluding`, `drawCardStatus`, `currentAdditionalCards`,
`turnCounter`, `currentPlayerId`, `currentPlayerIndex`, `currentPlayerDirection`,
`currentPlayerEndedTurn`, `currentPlayerTimer`, `currentPlayerTimeFunc`, `turnDuration`.

## 2. Player identity (client)

Stored in `localStorage.player_info`:

```json
{ "id": "PID...", "name": "...", "in_game": false, "in_game_id": null }
```

- `id` is generated client-side with `Math.random().toString(36).replace('0.', 'PID')`.
- Identity is not server-authenticated. `player_id` from clients is trusted.
- On join success the client sets `in_game = true` and `in_game_id`.

## 3. Visibility rules (current, buggy)

| Data                 | Visible to whom                 | Correct?     |
| -------------------- | ------------------------------- | ------------ |
| Your hand            | You (via `hand_state`)          | Yes          |
| Other players' hands | **Everyone** (via `players`)    | **No — bug** |
| Full pile            | **Everyone** (via `pile_state`) | **No — bug** |
| Deck count           | Everyone                        | OK           |
| Turn indicator       | Everyone                        | OK           |

## 4. Target visibility rules

Define explicit per-player projections. Only derive what each client may see.

```
PlayerView (per client) = {
  playerCount,
  players: [ { id, name, isHost, isTurn, handCount } ],   // NO hands of others
  you: { playerIndex, hand: CardView[] },                  // only your hand
  pileTop: CardView,                                       // only the top card
  deckCount,
  currentTurnIndex,
  currentDirection,
  status: "prepping" | "ongoing" | "concluding",
}
```

`CardView` hides nothing needed to render (`id`, `image`, color/number for legality UI) but
the server keeps authority. Effects that reveal cards (Future Sight, All Seeing Eye, etc.)
must add explicit `revealed` payloads scoped to the target player.

## 5. Room/lobby lifecycle

| State              | Transitions                           |
| ------------------ | ------------------------------------- |
| `prepping` (lobby) | Players join/leave; host starts.      |
| `ongoing`          | Setup → turns → win.                  |
| `concluding`       | After-game; post-win effects resolve. |

Current code sets `is_prepping=false`, `is_ongoing=true` in `start()`; `is_concluding` is
never used.

## 6. Anti-cheat notes

- The server must never serialize a `Player` object wholesale.
- `card_index` in `game_input_action` is index-based; the server should validate the index
  against the acting player's current hand size.
- Because player ids are client-generated, treat them as untrusted for anything but
  identification (no account data).
