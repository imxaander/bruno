# Phase 2c — Socket Adapter: Actions + Game End

Status: **IMPLEMENTED** (server + client wiring, verified green).

Wire the Phase 2b engine to the typed socket layer. The base game is playable across tabs.

## Scope (as planned)

- **`game:action`** — implement `play`, `choose-color` (Phase 2a left them `NOT_IMPLEMENTED`):
  - Validate payload with `GameActionSchema` (shared), then validate against the engine
    (is it the actor's turn, is the card index in range, is the card legal).
  - Apply via `RoomManager`, broadcast per-player `game:state` + `game:log` + `game:turn` to the room.
  - Rejections → `error` envelope (`{ ok: false, code, message }`) to the actor only.
- **Choose-color flow** (wild cards):
  - When a `+4` is played without a color, the card stays in hand, `room.pendingWild` is set,
    and the server emits `game:prompt { gameId, kind: "choose-color" }` **to the actor only**.
    The turn counter stays frozen until the color is chosen.
  - Client answers with `game:action { type: "choose-color", chosenColor }`; server applies and
    broadcasts the final state (`game:log`, `game:turn`, per-player `game:state`).
  - Resolves the Phase 2b gate: **yes, `+4` needs a color** (`docs/game/rules.md` §9).
- **`game:ended`** — added to `@bruno/shared` contract (`ServerToClientEvents`):
  `{ gameId, winner: { id, name } | null, players: { id, name, handCount }[], reason: "hand_emptied" }`.
  Emitted to the whole room on win; drives `AfterGame.tsx`. A final per-player `game:state` push
  goes out so the room can end on a "concluding" state.
- **Room-scoped broadcasts** — all game events (`game:log`, `game:turn`, `game:state`, `game:ended`)
  stay inside `io.to(gameId)`; `game:prompt` routes to the actor's socket only.
- **Integration tests** — `socket.io-client` against the real server (join → start → play → +4
  prompt → choose-color → timeout auto-draw → win), asserting no hand/pile leaks on the wire.

## Decisions resolved

- **Voluntary draw — superseded by [Phase 2d](./phase2d-voluntary-draw.md)**: Phase 2c shipped with
  `game:action { type: "draw" }` → `DRAW_NOT_ALLOWED` and the client DRAW button removed; Phase 2d
  replaces that with a strict voluntary-draw rule (draw allowed only when no card is playable, or
  when a draw stack is pending).
- **`registerSockets(io, options?)` returns the `RoomManager`** and accepts
  `{ turnManager?, rng? }`, giving integration tests deterministic control (manual timers, direct
  room mutation via `rooms.getRoom(gameId)`).
- **Timeout auto-draw ends the turn and clears `pendingWild`** (`onTurnTimeout`).
- `game:prompt` is delivered only to the actor, so no client-side "whose prompt?" ambiguity.

## Contract changes (`@bruno/shared`)

- `events/schemas.ts`: `GamePromptSchema` (`{ gameId, kind: "choose-color" }`),
  `GameEndedPlayerSchema`, `GameEndedPayloadSchema`.
- `events/contract.ts`: S→C `"game:prompt"` and `"game:ended"`.
- `game/state.ts`: `PlayerView.turnDuration` (seconds).

## Client wiring

- `Game.tsx`: emits `game:action` plays (already), handles `game:prompt` → `ColorPicker` overlay →
  `game:action { type: "choose-color", chosenColor }`; routes `game:ended` → `onEnded`; countdown
  driven by `view.turnDuration`; manual DRAW button removed.
- `App.tsx`: holds the `GameEndedPayload`, switches to `aftergame` on `game:ended`, passes
  winner/players to `AfterGame`.
- `AfterGame.tsx`: renders the real winner name and final-hand standings.
- `TurnTimer.tsx`: caption updated ("Play a card" / auto-draw on timeout).

## Verification

- `npm.cmd run typecheck` green (shared, server, client).
- `npm.cmd test` green: 58 server tests (deck 9, room-manager 16, engine 21, turn-manager 7,
  sockets integration 5) — includes +4 prompt/completion, choose-color rejection, timeout clearing
  `pendingWild`, `turnDuration` projection, and the full wire lifecycle.
- `npm.cmd run build` and `npm.cmd run format:check` green.
- Manual: full base-game round across 2+ tabs — play by color/number/symbol, +4 prompts for color,
  timeout auto-draw, win → AfterGame with the real winner.
