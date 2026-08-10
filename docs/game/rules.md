---
title: Core Rules
status: draft
source: "1.4 BRUNO.pdf + current implementation (legacy/game.js)"
updated: 2026-08-10
tags: [game, rules]
---

# Core Rules

This document states how the game is played. Behavior marked **(impl)** comes from the
current implementation; behavior marked **(design)** comes from the PDF. Where they conflict,
both are recorded and the conflict is flagged.

## 1. Setup (impl)

- Each player is dealt **8 cards**.
- The deck is shuffled (Fisher–Yates).
- One card is drawn from the deck onto the pile to start.
- A random player is selected to take the first turn.
- Turn direction starts at `1` (increasing player-array index).

## 2. Turn structure (impl)

- A player has **5 seconds** to act (`Game.turnDuration = 5`).
- A turn is ended by: playing a valid card, voluntarily drawing, or the timer expiring.
- A **voluntary draw** is only allowed when the current player has no playable card, or when a
  draw-stack total is pending (see [draw stacking](#4-draw-stacking-24)). Drawing always ends the
  turn.
- On timer expiry the current player auto-draws 1 card (or the pending draw-stack total).
- After the turn ends, play advances to the next player (respecting skip).

## 3. Playing a card (design + impl)

A card is playable if it matches the top card of the pile by:

- **Color** (same color), or
- **Symbol/number** (same number or same special symbol), or
- It is a **wild** effect card that the rules allow (currently `+4`, and vault tokens, which
  are always playable on your turn unless a draw stack is pending).

### Number card validation (impl)

Current rule in `legacy/game.js:336`: a number card is valid if it matches color OR number of the
top card, AND the top card is a number card, AND no draw effect is pending. The current check
is buggy (see Known bugs) — the intended rule is _color or number match_.

## 4. Draw stacking (+2/+4)

- Playing a `+2` while **no draw effect is pending** is only legal if it matches the top
  card's color (design intent; current check requires color match).
- Playing a `+2` or `+4` while a draw effect **is pending** is legal and **adds** its value
  to the running total (`pendingDraw`).
- The next player has a choice: **continue the stack** (play a `+2`/`+4`), or **eat the
  stack** by drawing the **total** amount in one go. Drawing always ends the turn and resets
  the stack to 0. While a stack is pending, no non-stack card can be played.

> Reference link anchor: [draw stacking rule](#draw-stacking-24)

## 5. Skip (impl)

- Playing a `Skip` skips the next player (moves turn index by 2 instead of 1).

## 6. Reverse (impl)

- With **2 players**: reverse behaves as a skip (the same player effectively plays again).
- With **3+ players**: flips `currentPlayerDirection` between `1` (forward) and `0` (backward).

## 7. Draw-4 wild (impl)

- `+4` can always be played and sets the draw effect regardless of color match.
- Playing a `+4` without a chosen color prompts the actor to **choose a color**; the card is
  not committed to the pile until the color is chosen. The turn timer pauses while the choice
  is pending.
- **Design note:** the PDF does not give `+4` a color-choice/wild rule. Color-choice was
  added in the current implementation so a `+4` can set `activeColor`.

## 8. Vaults (design + impl)

- The deck holds **vault tokens** (5 silver / 3 gold / 1 diamond) rather than the catalog
  cards. Playing a token is always legal on your turn (wild-like) unless a draw stack is
  pending.
- Playing a token offers the actor **5 random distinct effects** from that token's tier; the
  actor picks exactly one (no decline, no re-roll). The token is placed on the pile and the
  chosen effect resolves. The turn timer pauses while the choice is pending.
- Vaults are **ignored** by the voluntary-draw gate: holding only vaults never blocks a
  voluntary draw.
- See [vault-mechanism.md](./vault-mechanism.md) for the full flow.

## 9. Win condition (design)

- Empty your hand to win.
- Post-win behavior: Ticket to Paradise and Arise (see tier docs) modify winners/losers.
- Alternative win conditions exist as passives: `Greed is Good` (exactly 20 cards),
  `Doomsday Button` (win in 60 rounds), `Cosmic Alignment` (collect blue 0–9), `Finality`
  (all 0s).

## 10. Known gaps / open design questions

| #   | Question                                                 | Status                                             |
| --- | -------------------------------------------------------- | -------------------------------------------------- |
| 1   | What happens when the deck runs out? Reshuffle the pile? | Resolved: reshuffle the pile (minus the top card). |
| 2   | Does drawing a card end your turn, or may you continue?  | Resolved: drawing ends your turn.                  |
| 3   | Does `+4` require a chosen color?                        | Resolved: yes, via a color prompt.                 |
| 4   | Lobby minimum/maximum player enforcement                 | Resolved: min 1 (solo preview), max 8.             |

## 11. Implementation status

The rules in this document are **not** all implemented. `legacy/game.js` implements: number/skip/
reverse/+2/+4 play validation, draw stacking, turn timer, turn advancing. It does NOT
implement: deck exhaustion handling, vault cards, locations, mayhem, origins, color-choice
for wilds, or win resolution.

The modernized stack (`packages/server`) additionally implements: color-choice prompt for
`+4`, vault token play flow with a `vault-choice` offer prompt, effect resolver wiring, and
voluntary-draw gating (see `vault-mechanism.md`, `card-data-schema.md`).

### Known bugs in current engine

| Bug                            | Location                 | Description                                                                                        |
| ------------------------------ | ------------------------ | -------------------------------------------------------------------------------------------------- |
| `distributeCards` length check | `legacy/game.js:684`     | Uses `this.deck.cards.size` (undefined) instead of `.length`; the guard never fires.               |
| Client sees all hands          | `legacy/game.js:579-586` | `getPlayerGameState` sends the full `players` array (including every hand) and the entire pile.    |
| Reverse validation             | `legacy/game.js:369-375` | `instanceof` logic is inverted/wrong; `console.log` inside the condition never prints as intended. |
| Skip validation                | `legacy/game.js:404-410` | Same broken `instanceof` pattern as reverse.                                                       |
| `currentPlayerDirection` init  | `legacy/game.js:256`     | Only set in `start()`; constructor leaves it `undefined` until a game starts.                      |
