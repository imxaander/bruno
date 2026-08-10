---
title: Mayhem
status: draft
source: "1.4 BRUNO.pdf p.9"
updated: 2026-08-09
tags: [game, mayhem]
---

# Mayhem

At the start of each round, a random **Mayhem** event occurs. All Mayhem events are equally
listed in the PDF; the PDF does not give per-event probabilities or an inclusion rule
(open question).

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
3. Does Mayhem trigger before or after the active player's turn each round?

## Implementation status

No Mayhem events are implemented in the current codebase.
