---
title: Figma Make Prompt Guide
status: draft
source: user-defined art direction + legacy/views/game.html + architecture/target.md
updated: 2026-08-09
tags: [design, ui, figma]
---

# Figma Make Prompt Guide

How to use **Figma Make** to design the BRUNO client UI, plus a ready-to-paste prompt that
produces a coherent first draft of every screen. Run Figma Make drafts past a human before
implementation; this guide only shapes the tool output.

## 1. How to use this guide

1. In Figma, open or create a file, then launch **Make** (the AI design tool).
2. Paste the prompt in [§5](#5-the-figma-make-prompt) verbatim into the prompt box.
3. Generate. Figma Make produces a multi-frame draft (one frame per screen).
4. Iterate on the draft using the snippets in [§6](#6-iteration-prompts).
5. Convert reusable elements into components and variables (see
   [§6.6](#66-publish-components-and-variables)) so the React client can consume them.

Notes:

- The prompt is written for a **desktop-first, 16:9** game client (the target client is a
  React SPA, see `architecture/target.md`).
- Figma Make drafts are proposals, not specs. Treat this document as the source of truth
  for behavior; the prompt encodes the look only.
- If a single prompt output is too large, generate in passes: flow screens (§3.1–3.3) first,
  then the game board (§3.4), then the modals (§3.5), then AfterGame (§3.6).

## 2. Project context

BRUNO is a real-time multiplayer card game — "goono with superpowers". Players race to empty
their hands by matching the top card of the pile by **color or number**, with UNO-style
actions (skip, reverse, draw, wild) layered on top of powerful **Vault cards**, **Locations**,
**Mayhem**, and **Origin Vaults** (see `game/overview.md`).

| Fact          | Value                                                                              |
| ------------- | ---------------------------------------------------------------------------------- |
| Players       | 1–8 per room (seat map scales 2–8)                                                 |
| Core loop     | Match color/number → play or draw → resolve effect → next turn                     |
| Turn timer    | 5 seconds (current implementation)                                                 |
| Vault tiers   | Silver (Tier III) < Gold (Tier II) < Diamond (Tier I)                              |
| Extra systems | Locations, Mayhem per round, Origin selection, Fateweaver/Masterchef/Pandora's Box |
| Anti-cheat    | Opponents' hands are **never** shown — only face-down card counts                  |

The current prototype (`legacy/views/game.html`) is a bare tabs UI; it is a structural
reference only, not a visual one. The screens below mirror its flow.

## 3. Screens to design

Design all of the following in one draft. Each row lists the required elements.

| #   | Screen            | Purpose          | Required elements                                                                                                                                |
| --- | ----------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Home**          | Identity + entry | Logo/title "BRUNO", one-line tagline ("goono, but with superpowers"), player name input, big PLAY button, (subtle) background art                |
| 2   | **Rooms**         | Browse + create  | Room list (`name`, `X / 8`, JOIN button), Refresh button, New Game button, New Game modal (`name` input + Create)                                |
| 3   | **Lobby**         | Pre-game room    | Room name, player list (avatar, name, Host/Member badge), Leave button, Start Game button (host only)                                            |
| 4   | **In-game board** | The game         | Your hand fan (bottom), opponent seats (face-down counts), deck, pile, turn indicator, 5s turn timer, game log, Draw button, direction indicator |
| 5   | **Modals**        | Game decisions   | Color picker, Origin select, Mayhem reveal, Fateweaver/Masterchef spin, Pandora's Box reward                                                     |
| 6   | **AfterGame**     | Post-game        | Winner card, streaks/records, Play Again / Leave buttons                                                                                         |

### 3.1 Home

- Centered hero with the BRUNO wordmark on a dark neon backdrop.
- A single `Player Name` input and a large call-to-action button.
- Background should hint at "superpowers" (light trails, card silhouettes) without noise.

### 3.2 Rooms

- A list of existing rooms: room name, player count (`4 / 8`), and a JOIN button per row.
- Empty state: "No rooms yet — create one".
- Secondary actions: Refresh Rooms, New Game (opens modal).

### 3.3 Lobby

- Room name header with a seat grid (up to 8 seats; empty seats shown as placeholders).
- Each joined player: avatar, name, Host/Member badge.
- Actions: Leave (all), Start Game (host only, disabled under 2 players).

### 3.4 In-game board

The core screen. Layout:

```
┌──────────────────────────────────────────────────────┐
│  header: room name · round/rounds · game log (right) │
├──────────────────────────────────────────────────────┤
│   opponent seats around the table (top + sides)     │
│          (face-down card counts, active-turn glow)   │
│                                                      │
│             DECK            PILE                     │
│          (back face)   (top card, glow)              │
│                                                      │
│   direction arrow · turn label · 5s timer           │
├──────────────────────────────────────────────────────┤
│           YOUR HAND FAN (bottom, playable glow)      │
│                          [DRAW]                      │
└──────────────────────────────────────────────────────┘
```

Rules to encode:

- **Opponents are always rendered as a card count**, never as card faces (anti-cheat).
- The player in turn gets a neon ring/glow on their seat.
- The pile shows only the top card, emphasized with glow.
- The deck shows the back face with a deck count badge.
- Playable cards in your hand highlight (brighten/lift); unplayable ones dim.
- Direction (forward/backward) is visible (arrows or a clockwise/counterclockwise sweep).

### 3.5 Modals

| Modal                                          | Trigger                                  | Content                                                          |
| ---------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------- |
| Color picker                                   | Playing a wild / effects needing a color | 4 color swatches (red/blue/green/yellow)                         |
| Origin select                                  | Before first game                        | Pick 1 of 5 Origin Vaults (card preview + name + effect line)    |
| Mayhem reveal                                  | Round start                              | Big Mayhem card + one-line effect + dismiss                      |
| Spin (Fateweaver / Masterchef / Pandora's Box) | Effect triggers                          | Spinning wheel / grid of reward cards, "result" card highlighted |
| AfterGame                                      | Game end                                 | Winner card + records + actions                                  |

### 3.6 AfterGame

- Winner card (or tied winners), Fateweaver streak/record line, Play Again, Leave.

## 4. Visual system

### 4.1 Palette

Dark cyberpunk/neon base, card colors kept from the legacy set, vault tiers via metal
frame + glow.

| Token            | Hex                        | Usage                         |
| ---------------- | -------------------------- | ----------------------------- |
| `bg/base`        | `#0B0B12`                  | App background                |
| `bg/panel`       | `#14141E`                  | Panels, modals, cards surface |
| `bg/panel-2`     | `#1C1C2A`                  | Raised surfaces, seat tiles   |
| `line`           | `#2A2A3E`                  | Borders, dividers             |
| `text/hi`        | `#F2F3FF`                  | Primary text                  |
| `text/lo`        | `#8B8BA0`                  | Secondary text, empty state   |
| `accent/cyan`    | `#22E5FF`                  | Turn glow, focus, links       |
| `accent/magenta` | `#FF3DF0`                  | Play / action call-to-action  |
| `accent/lime`    | `#B7FF3D`                  | Success, "valid" states       |
| `card/red`       | `#E53935`                  | Red cards                     |
| `card/blue`      | `#1E88E5`                  | Blue cards                    |
| `card/green`     | `#43A047`                  | Green cards                   |
| `card/yellow`    | `#FDD835`                  | Yellow cards                  |
| `tier/silver`    | `#C0C7D1` (frame)          | Tier III vaults               |
| `tier/gold`      | `#E9B54A` (frame)          | Tier II vaults                |
| `tier/diamond`   | `#F2F4FF` + prismatic glow | Tier I vaults                 |

Neon accents emit a soft outer glow (`box-shadow`-like) so cards and the active seat pop
against the near-black background.

### 4.2 Typography

- **Display / numbers:** a chunky condensed typeface (Balatro-style) for card numbers, card
  names, and the wordmark — high weight, tight tracking.
- **UI / labels:** a clean techy sans (e.g. Inter, Rajdhani, or Orbitron for headings) for
  buttons, room lists, timers, log text.
- Set an explicit scale: display XL (wordmark), display M (card values), body M (labels),
  caption S (badges, counts).

### 4.3 Card anatomy

A glossy, emissive tile with rounded corners:

- **Base cards:** colored gradient face (per-color), chunky value glyph center, subtle
  highlight along the top edge, thin inner border.
- **Action cards (skip / reverse / draw / wild):** same tile language with an icon instead
  of a number; `+4` and wilds use a neutral dark face with a neon glyph.
- **Vault cards:** a metal gradient frame (silver / gold / diamond), a **tier glow** of the
  matching color, the effect name, and room for the effect text/icon.
- **Back face:** dark tile with a repeating BRUNO monogram/hex pattern + neon edge.

### 4.4 Seat map (fixed, scales 2–8)

Player 1 (you) is always bottom-center. Opponents fill fixed slots counterclockwise:
left bottom → left → top-left → top → top-right → right → right-bottom. Empty seats render
as dim placeholders ("waiting…"). Turn order never re-arranges seats; only the active glow
moves.

## 5. The Figma Make prompt

Copy everything between the `PROMPT` fences.

```text
Design the UI for BRUNO, a realtime multiplayer card game described as "goono, but with
superpowers". Desktop-first, 16:9 frames, dark theme. Produce one frame per screen listed.

CONTEXT
- 1-8 players per room. The local player sits bottom-center; opponents occupy fixed seats
  around the table (2-8 scale).
- Core loop: match the top card of the pile by color or number, play a card or draw, then
  the turn passes. A 5-second turn timer is always visible.
- Anti-cheat: opponents are ALWAYS shown as face-down card counts. Never show opponent card
  faces.
- Cards: glossy 3D / emissive rounded tiles. Base cards use the 4 classic colors (red,
  blue, green, yellow) with a chunky condensed number or action icon. Vault cards use a
  metal gradient frame + glow that signals tier: silver (steel + silver glow), gold
  (gold + amber glow), diamond (white/ice + prismatic rainbow glow).
- Vibe: dark cyberpunk / neon. Near-black backgrounds, glowing neon accents (cyan,
  magenta, lime), Balatro-style juicy card presentation and bold typography. Use a chunky
  condensed display face for card values and a clean techy sans for UI labels.

SCREENS (one 1440x900 frame each)
1. HOME - BRUNO wordmark, tagline, player-name input, big PLAY button.
2. ROOMS - room list rows (name, "4 / 8", JOIN), Refresh + New Game buttons, New Game modal.
3. LOBBY - room name, 8-seat grid with avatar/name/Host or Member badge, Leave + Start
   (host) buttons, empty seats as placeholders.
4. IN-GAME BOARD - header (room, round, game log), opponent seats with face-down card
   counts and active-turn neon ring, deck with count badge, glowing pile top card,
   direction indicator, turn label + 5s timer, your hand fan at the bottom with playable
   cards highlighted and unplayable cards dimmed, DRAW button.
5. MODALS - (a) color picker: 4 swatches; (b) origin select: 1-of-5 vault cards;
   (c) mayhem reveal: big effect card; (d) reward spin wheel/grid: outcome highlighted.
6. AFTERGAME - winner card, streak/record line, Play Again + Leave buttons.

RULES
- Keep a consistent design system: define named color tokens, a type scale, and reusable
  components (Button, Card base, Seat, Modal frame, Badge).
- Neon accents should glow, not clip; contrast must stay readable on dark panels.
- All screens share the same header/nav language so the flow feels connected.

OUTPUT
- One frame per screen labeled exactly: "Home", "Rooms", "Lobby", "In-game Board",
  "Modals", "AfterGame".
- Within each frame, keep layers named by their role (e.g. "card-back", "seat-active").
```

## 6. Iteration prompts

Apply these follow-ups in Figma Make after the first draft.

### 6.1 Tune the theme

- "Darker background, less blue — push panels toward #0B0B12."
- "Make the neon glow softer; reduce it on inactive seats."
- "Increase glow on the pile top card and on playable hand cards."

### 6.2 Card look

- "Cards should read Balatro-like: sharper top highlight, chunkier value glyph."
- "Give vault cards a stronger metal gradient and bigger tier glow."
- "Redraw the card back: hex/monogram pattern with a neon edge."

### 6.3 Seats / layout

- "Show a 4-player variant of the In-game board."
- "Show the 8-player variant; keep me bottom-center, opponents in fixed seats."
- "Make empty lobby seats clearly visible but dim."

### 6.4 Focus flow

- "Design the turn hand-off: seat glow + turn label + timer together."
- "Show the DRAW button only when it is the local player's turn."

### 6.5 Modals

- "Redo the color picker as 4 large glowing swatches."
- "Make the mayhem reveal fill the frame — it should feel like an event."

### 6.6 Publish components and variables

- "Convert Buttons, Seat, Card base, Modal frame, Badge into components."
- "Publish the color palette and type scale as Figma variables named like the tokens in
  this guide."

## 7. Constraints and anti-patterns

- **Never show opponent hands.** Opponents render as counts; only the local player's hand
  and the pile top card are faces. (Matches the anti-cheat rules in `architecture/state-model.md`.)
- **The board must scale 2–8 players** without re-flowing; seats are fixed slots.
- **Turn feedback must be obvious** at a glance: one glowing seat + timer + turn label.
- **Do not design a mobile-first layout**; target desktop 16:9, browser client.
- **Cards must stay legible** when small (chunky glyphs, high contrast) — the 5s timer
  means readability under time pressure.
- Figma Make drafts are references for the React client, not a pixel contract; keep the
  component/token names so the SPA can mirror them.
