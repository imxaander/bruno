---
title: Mayhem
status: stable
source: "1.4 BRUNO.pdf p.9"
updated: 2026-08-13
tags: [game, mayhem, locations]
---

# Mayhem

**Mayhem is the effect of the Hell Gate location** (`loc-hell-gate`). It is **not** a
per-game default: only while Hell Gate is the active location does a random Mayhem event
occur, once per round. All Mayhem events are equally listed in the PDF; the PDF does not
give per-event probabilities (open question).

## Rolling

- A Mayhem event is rolled when the game starts **if and only if the active location is
  Hell Gate**, and again whenever the round advances (a full pass around the table, per
  `advanceTurn` in `engine.ts`). It applies immediately at that moment, before the new
  round's first turn.
- A re-roll never picks an event already used this game. Once all nine events have been
  used, the used-list resets and repeats become possible.
- Games in any other location never roll Mayhem, regardless of the `mayhemEventId` start
  override.
- Used event ids are tracked in `Room.usedMayhemIds`; the start-of-game event is recorded
  there too.

## Events

| Id         | Event (verbatim from PDF)                                       | Source | Notes                                             |
| ---------- | --------------------------------------------------------------- | ------ | ------------------------------------------------- |
| `mayhem-1` | +1 to a random player.                                          | p.9    |                                                   |
| `mayhem-2` | +4 to a random player.                                          | p.9    |                                                   |
| `mayhem-3` | +6 to all and an additional +4 to the least cards.              | p.9    | "least cards" = the player with the fewest cards. |
| `mayhem-4` | Skip 1 random player.                                           | p.9    |                                                   |
| `mayhem-5` | Skip 2 random players.                                          | p.9    |                                                   |
| `mayhem-6` | Skip all players except with the most cards for 6 turns.        | p.9    | "except [the player] with the most cards".        |
| `mayhem-7` | Swap cards with the least amount of cards to the most cards.    | p.9    | Target selection ambiguous.                       |
| `mayhem-8` | Discard your hand and replace it with the same amount of cards. | p.9    | Applied to whom? Ambiguous.                       |
| `mayhem-9` | Reduce the cards of all players to 1.                           | p.9    |                                                   |

## Open questions

1. Are all nine events equally likely, or weighted?
2. "Discard your hand and replace..." — whose hand?

## Implementation status

Implemented: `applyMayhem` in `packages/server/src/game/systems.ts` handles every event
(current resolutions: `mayhem-7` swaps least↔most hands, `mayhem-8` applies to every
player); per-round re-rolling lives in `rollNextMayhem` (same file), gated on
`room.locationId === "loc-hell-gate"`, and is wired into the round-advance paths of
`playCard`/`applyDraw` in `packages/server/src/game/engine.ts`. The first event is rolled
in `startGame` (`packages/server/src/game/room-manager.ts`) only when Hell Gate is the
active location. The client reveals each new event with a `MayhemEventReveal` modal keyed
on `PlayerView.mayhemEventId`.
