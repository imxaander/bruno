---
title: Socket Event Contract
status: draft
source: "source code: legacy/index.js, legacy/views/game.html"
updated: 2026-08-09
tags: [architecture, sockets]
---

# Socket Event Contract

Every message between client and server, transcribed from `legacy/index.js` (server side)
and `legacy/views/game.html` (client side).

## Conventions

- Direction `C→S` = client sends, `S→C` = server sends.
- `game_id` is the room/game id. `player_id` is the `localStorage` player id (`PID…`).
- Responses are broadcast with `io.sockets.emit` (all sockets) — there is **no room scoping**
  today; clients filter by `game_id` themselves.

## Current events

### Client → Server

| Event                   | Payload                                                                    | Purpose                                                                                |
| ----------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `get_rooms`             | `—`                                                                        | Request room list.                                                                     |
| `create_new_game`       | `{ name: string, player_info: { id, name, in_game, in_game_id } }`         | Create a room (host).                                                                  |
| `player_join_game`      | `{ game_id, game_name, player_info }`                                      | Join a room.                                                                           |
| `player_game_start`     | `game_id`                                                                  | Host starts the game.                                                                  |
| `get_players_in_lobby`  | `game_id`                                                                  | Request current lobby players.                                                         |
| `player_leave_game`     | `{ game_id, player_id }`                                                   | Leave/kick.                                                                            |
| `get_client_game_state` | `{ game_id, player_id }`                                                   | Request this client's game-state view.                                                 |
| `game_input_action`     | `{ game_id, type: "play" \| "draw", player_index, player_id, card_index }` | Perform an action. `draw` is handled (no-op) on server; client `drawCard()` is a stub. |
| `disconnect`            | `—`                                                                        | Socket closed (server emits `client_disconnect` back).                                 |

### Server → Client

| Event                          | Payload                                      | Purpose                                                                            |
| ------------------------------ | -------------------------------------------- | ---------------------------------------------------------------------------------- |
| `room_list_return`             | `[{ id, name, playerCount }] \| null`        | Rooms list.                                                                        |
| `player_join_return`           | `{ failed, game_id?, game_name?, host_id? }` | Join result; `host_id` lets the joiner know if they are host.                      |
| `players_in_lobby_return`      | `Player[]`                                   | Lobby players (includes full `Player` objects, i.e. hands leak here pre-game too). |
| `player_leave_return`          | `{ failed }`                                 | Leave result.                                                                      |
| `player_game_start_return`     | `{ failed, game_id }`                        | Start result (broadcast to all).                                                   |
| `get_client_game_state_return` | `ClientGameState`                            | Per-player state view. **Leaks all hands + pile** (see flaws).                     |
| `game_force_update_game_state` | `game_id`                                    | Ping all clients to re-fetch state.                                                |
| `game_log`                     | `{ game_id, message }`                       | A game log line.                                                                   |
| `game_turn`                    | `{ game_id, player_index }`                  | Whose turn it is.                                                                  |
| `client_disconnect`            | `—`                                          | Sent on the socket's own disconnect.                                               |

## Known contract issues

1. No rooms/namespaces: every event goes to every socket; clients filter by `game_id`.
2. `get_client_game_state_return` exposes every player's full hand and the whole pile.
3. `game_input_action` `type: "draw"` does nothing server-side (`playerAction` `draw` branch
   is empty); drawing only happens on turn timeout.
4. No validation or error contract: handlers return inconsistent shapes (`false`,
   `undefined`, objects).
5. `players_in_lobby_update` is referenced in the client (`legacy/views/game.html:303`) but
   never emitted
   by the server — dead listener.
6. `disconnect` → the server emits `client_disconnect` to the closing socket, which is
   useless; real cleanup (`player_leave_game`) is triggered from the client listener.

## Proposed typed contract (target)

All payloads defined in `@bruno/shared` with Zod schemas. Events grouped and namespaced:

| Area  | Proposed events                                                                                                                                                                                      |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rooms | `rooms:list`, `rooms:list:return`, `rooms:create`, `rooms:create:return`                                                                                                                             |
| Lobby | `lobby:join`, `lobby:join:return`, `lobby:leave`, `lobby:update`, `game:start`, `game:start:return`                                                                                                  |
| Game  | `game:action` (play/draw/choose-color/vault-choice/choose-targets), `game:prompt` (choose-color/vault-choice/pick-players), `game:state` (typed `PlayerView`), `game:log`, `game:turn`, `game:ended` |
| Meta  | `error` (typed error envelope)                                                                                                                                                                       |

Every server handler validates its payload with Zod before touching engine state; every
client handler gets a typed payload. See `target.md` and `card-data-schema.md`.

`game:action` `choose-targets` resolves a pending target-pick prompt: payload includes
`targetIds: string[]` (Zod-validated count, distinct, seated, actor excluded unless the
resolver declared `allowSelf`). Emitted with the `pick-players` `game:prompt` kind whenever a
chosen vault offer declares a `targets` input spec. See `../game/vault-mechanism.md` §3.
