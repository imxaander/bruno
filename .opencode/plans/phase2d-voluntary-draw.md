# Phase 2d — Voluntary Draw, Legal-Play Dimming, Pending-Draw Label

Status: **IMPLEMENTED** (server + client + docs, verified green).

Let players draw on their turn when the rules allow it, dim unplayable cards, and surface an
in-progress draw stack on the table. Resolves `docs/game/rules.md` §9 Q2 ("does drawing end your
turn?") and completes §4 (eat-the-stack).

## Scope (as planned)

- **Strict draw gating (server-owned)** — `RoomManager.performAction` draw branch:
  - `room.pendingWild` set → `DRAW_NOT_ALLOWED` (choose a color first).
  - `pendingDraw === 0` and the player holds a playable card → `DRAW_NOT_ALLOWED` (you must play).
  - Otherwise `applyDraw` draws `pendingDraw` (else 1), clears the stack, ends the turn, and
    schedules the next turn.
- **`PlayerView.you.playable: boolean[]`** — server computes a per-card legal-play mask via
  `isPlayable` (`engine.ts`) so the client never duplicates the rule. Projected in
  `player-view.ts`; no import cycle (engine does not import player-view).
- **Client**:
  - `PlayerHand.tsx`: `playable[]` prop — cards are disabled/dimmed and do not lift unless
    `myTurn && playable[i]`.
  - `Game.tsx`: re-added DRAW button (always rendered on your turn, disabled when drawing is not
    allowed), passes `playable` through.
  - `TableOval.tsx`: optional `pendingDraw?: number` → pulsing `+N` chip ("PENDING — draw or stack").
- **Docs**: `rules.md` §2 (turn ends on draw), §4 (eat-the-stack choice), §7 (+4 color), §9 table
  resolved; `overview.md` round flow + player count.

## Decisions resolved

- **Both Phase 2c caveats closed via the server-computed `playable[]` mask** — the server owns the
  legal-move rule; the client only renders it. No duplicated rule on the client.
- **Strict draw gating (user-confirmed)**: `pendingDraw === 0` → draw only when nothing is playable;
  `pendingDraw > 0` → draw is always allowed (eat the stack, per §4). Drawing ends your turn.
- **Draw during `pendingWild` rejected** — you must choose a color first.
- **DRAW button affordance**: rendered on your turn even when disabled (discoverability), gated by
  `canDraw = myTurn && !prompt && (pendingDraw > 0 || !playable.some(Boolean))`.
- **`DRAW_NOT_ALLOWED` message reworded** — it now covers both the "must play" and "must choose a
  color" rejections.

## Contract changes

- `packages/shared/src/game/state.ts`: `PlayerView.you.playable: boolean[]`.

## Server changes

- `packages/server/src/game/engine.ts`: `hasPlayableCard(room, player)`; `applyTimeoutDraw` renamed
  `applyDraw` (also clears `room.pendingWild`).
- `packages/server/src/game/room-manager.ts`: strict draw branch; `onTurnTimeout` uses `applyDraw`.
- `packages/server/src/game/player-view.ts`: computes `playable[]` via `isPlayable`.
- `packages/server/src/sockets/index.ts`: `ERROR_MESSAGES.DRAW_NOT_ALLOWED` reworded.

## Client changes

- `packages/client/src/components/board/PlayerHand.tsx`, `TableOval.tsx`,
  `packages/client/src/pages/Game.tsx` — as in Scope above.

## Tests added (66 server + 10 shared green)

- `engine.test.ts` (+3): `hasPlayableCard` true/false/stack-only cases; `applyTimeoutDraw` describe
  renamed to `applyDraw`.
- `turn-manager.test.ts` (+1 net): "rejects a voluntary draw" replaced by pinned-hand tests — draws
  when no card is playable (ends turn, logs, emits turn), rejects a draw while holding a playable card.
- `room-manager.test.ts` (+3): `playable[]` projection mask; draw eats a pending stack while holding
  a `+2`; draw rejected while `pendingWild` is set.
- `index.integration.test.ts` (+1): wire test — no-playable-card hand → voluntary draw → log, turn
  advance, state updated (`playable` all-false asserted before the draw).

## Verification

- `npm.cmd run typecheck` green (shared, server, client).
- `npm.cmd test` green: 66 server tests + 10 shared tests.
- `npm.cmd run build` green (client production build).
- `npm.cmd run format:check` green.
