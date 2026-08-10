# Plan: Port Figma Make design into `@bruno/client`

Status: approved (hybrid styling; board first, then continue all screens).
Repo root: `C:\Users\xande\Documents\Dev\bruno`
Design source: `C:\Users\xande\Documents\Dev\bruno-figma` (React 19 + Tailwind v4 — port values only, no new deps).

## Goal

Replace the CSS-class scaffold UI with the Figma Make visual design, preserving the typed
socket wiring, `@bruno/shared` types, ESM `.js` imports, React 18 + Vite 5 constraints.

## Decisions

- **Hybrid styling**: visual/dynamic components (GameCard, board, screens, modals) ported with
  the plugin's inline styles for fidelity; generic UI (Button, Seat, Badge, Modal) stays
  CSS-class based, driven by updated `--bruno-*` tokens in `theme/tokens.css`.
- Drop the plugin's demo 4/8 variant toggle; derive layout from `PlayerView.playerCount`
  (<=4 players → top row; else `SEATS_8P` ring).
- Drop mock data (ZEPHYR/NOVA/etc., ROUND 3, NEON BLAZE room name) — feed real socket state.
- `RoomSummary` has no host/status: derive status from `playerCount` (>=8 → full, else open),
  drop the host column.

## Steps

### A. Tokens & fonts

1. `packages/client/src/theme/tokens.css` — rewrite to plugin palette:
   - accents `#00eeff`/`#ff00cc`/`#aaff00`/`#ffaa00`/`#ffcc00`
   - card suite `#e0001e`/`#0044dd`/`#00bb44`/`#ffcc00`
   - vault `#c8dce8`/`#ffd040`/`#d8f0ff`
   - surfaces `#080810`/`#0b0b12`/`#0e0e1a`/overlay `rgba(5,5,9,0.72)`
   - text `#c8d8f0` + dim/micro, fonts Barlow Condensed + Rajdhani, plugin type scale, radii.
2. `packages/client/index.html` — Google Fonts `<link>` (Barlow Condensed 400-900, Rajdhani 400-700).

### B. Components

3. `components/GameCard.tsx` (new) — port plugin `GameCard` 1:1 (gradients, vault tiers, hex
   card back, sizes xs–xl, `lifted`/`dimmed`, dark face for wild/draw4). Add optional
   `card?: CardView` bridge: `color`→gradient, `vault-silver|gold|diamond`→tier, number/skip/
   reverse/draw2/draw4/switch-color/shuffle→face label, vault value from `getCard(id).name`.
   Delete `components/Card.tsx` (`CardFace`/`CardBack` superseded).
4. `components/Button.tsx` — variants `primary`/`cta`/`outline`/`ghost`; migrate `secondary`→`outline`.
5. `components/Seat.tsx` — keep `PublicPlayer` prop; render avatar (color hashed from id),
   name, face-down card fan (min(handCount,5)), count, active ring on `isTurn`.
6. `components/TurnTimer.tsx` — inline SVG drain ring (plugin `TimerCircle`), props
   `{ seconds, active, total? }`.
7. `components/modals.tsx` (new) — `ColorPicker`, `OriginSelect`, `MayhemReveal`, `RewardSpin`
   ported from `bruno-figma/src/screens/Modals.tsx`, typed for later engine wiring (not mounted yet).

### C. Game board

8. `pages/Game.tsx` — rebuild from `bruno-figma/src/screens/GameBoard.tsx`:
   - header: BRUNO wordmark, room name, live dot, LOG toggle
   - table oval: deck stack + count, clockwise direction SVG, glowing pile top
   - timer controls + DRAW button
   - player hand fan (lift when `myTurn`, dim otherwise; `playCard(index)`)
   - opponent seats (top row for <=4, ring positions otherwise)
   - "Seat 1 · You" label, collapsible log panel, error line
   - all fed by `PlayerView`; socket wiring unchanged (`game:state`/`game:log`/`game:turn`/`error`).

### D. Remaining screens (socket wiring preserved)

9. `pages/Home.tsx` — hex grid, floating cards, hero wordmark, handle input, PLAY.
10. `pages/Rooms.tsx` — plugin header, room rows (StatusDot/StatusBadge from playerCount),
    refresh/create controls, create modal, stats sidebar (keep real socket `rooms:*`).
11. `pages/Lobby.tsx` — plugin seat grid + rules strip, leave/start; keep `lobby:*` wiring.
12. `pages/AfterGame.tsx` — starfield, crown, winner card, stats, CTAs.

### E. CSS & verify

13. `src/index.css` — keep base (bg `#080810`, text `#c8d8f0`, fonts), scrollbar, keyframes
    (neon-pulse, card-float, timer-drain, spin-wheel, reveal-in, shimmer), button/badge/modal
    classes matching new tokens; prune dead page/seat/card CSS.
14. Run `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build`, `npm.cmd run format`.

## Verification notes

- Server not required for client typecheck/build. Dev: `npm.cmd run dev` (Vite proxies `/socket.io`).
- No new dependencies beyond existing React; no Tailwind.
