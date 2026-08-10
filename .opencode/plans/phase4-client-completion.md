# Phase 4 — Client Completion (Base Game)

Finish the React client so the base game is fully playable with the real engine. The design
port (Home/Rooms/Lobby/Game/AfterGame, GameCard, board, modals) is already done.

## Scope

- **Color picker** — mount the built `ColorPicker` modal (`components/modals.tsx`) on the
  choose-color prompt from Phase 2c; send `game:action { type: "choose-color", chosenColor }`.
- **TurnTimer** — replace the hard-coded `seconds={5}` in `pages/Game.tsx:225` with the engine's
  turn duration (from `PlayerView.turnDuration` when added in 2c); reset per turn.
- **AfterGame** — replace the placeholder "—" winner/stats with the real `game:ended` payload
  (winner, per-player hand counts, reason). Navigate from the board on `game:ended`.
- **Legality highlight** — `PlayerHand` dims non-playable cards by comparing each card's
  color/number/symbol against `pileTop` (UX only; the server stays authoritative and rejects
  invalid plays). Respect pending draw-stack state when known.
- **Error surface** — keep the `error` envelope banner; show per-action rejections in the log.
- **Playtest polish** — ring vs top-row layouts with real 2–8 player seats; card fan sizing with
  a full 8-card hand; LEAVE/log behavior during an ongoing game.

## Out of scope (Phase 5)

Vault/location/origin/mayhem UIs, effect target-selection prompts, OriginSelect/MayhemReveal/
RewardSpin mounting, dish/slot/Pandora's Box screens.

## Verification

- Manual full loop across tabs: create → lobby → start → play through a win → AfterGame shows
  the real winner.
- `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build`, `npm.cmd run format`.
