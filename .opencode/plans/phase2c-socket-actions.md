# Phase 2c — Socket Adapter: Actions + Game End

Wire the Phase 2b engine to the typed socket layer. The base game becomes playable across tabs.

## Scope

- **`game:action`** — implement `play` and `draw` (Phase 2a left them `NOT_IMPLEMENTED`):
  - Validate payload with `GameActionSchema` (already in shared), then validate the action
    against the engine (is it the actor's turn, is the card index in range, is the card legal).
  - Apply via `engine`, broadcast `game:state` (per-player), `game:log`, `game:turn` to the room.
  - Rejections → `error` envelope (`{ ok: false, code, message }`) to the actor only.
- **Choose-color flow** (wild cards):
  - When a `+4` (or future wild) needs a color, server marks the action pending and emits a
    `choose-color` prompt to the actor (needs a contract event, e.g. `game:prompt`).
  - Client answers with `game:action { type: "choose-color", chosenColor }`; server applies and
    broadcasts final state.
  - Only resolves if the pending-design answer in `rules.md` §9 is "yes, +4 needs a color".
- **`game:ended`** — add to `@bruno/shared` contract (`ServerToClientEvents`):
  `{ gameId, winner: { id, name } | null, players: { id, name, handCount }[], reason }`.
  Emitted to the room on win; drives `AfterGame.tsx`. Room transitions to `concluding`.
- **Room-scoped broadcasts** — everything stays inside `io.to(gameId)`; fix the legacy
  "every event to every socket" behavior for the remaining game events.
- **Integration tests** — `socket.io-client` against the real server (join → start → play →
  draw → win), asserting no hand/pile leaks on the wire.

## Contract changes (`@bruno/shared`)

- Add `"game:ended"` S→C event + Zod schema.
- Add prompt event(s) for choose-color (e.g. `game:prompt:choose-color` C→S ack or a single
  `game:prompt` payload with `kind`). Decide with the Phase 2b gate.
- `PlayerView` optionally gains `turnDuration` (seconds) so the client timer isn't hard-coded.

## Verification

- `npm.cmd run typecheck` and `npm.cmd test` (engine + integration suites) green.
- Manual: full base-game round across 2+ tabs — play by color/number/symbol, stack +2/+4,
  skip/reverse, timeout auto-draw, win → AfterGame with the real winner.
