---
title: Deck Composition
status: draft
source: "current implementation (legacy/game.js DeckCardSet) + design intent"
updated: 2026-08-09
tags: [game, deck]
---

# Deck Composition

This document defines what goes into the deck. The current code hard-codes this in
`DeckCardSet` in `legacy/game.js:29-42`.

## 1. Base deck (current implementation)

The current `DeckCardSet` produces the following 110-card deck:

| Card         | Per color | Colors | Total | Notes                                             |
| ------------ | --------- | ------ | ----- | ------------------------------------------------- |
| Number 0     | 1         | 4      | 4     |                                                   |
| Numbers 1–9  | 1 each    | 4      | 36    | `DeckCardSet.NumberCards = [1,1,1,1,1,1,1,1,1,1]` |
| Skip         | 5         | 4      | 20    |                                                   |
| Reverse      | 5         | 4      | 20    |                                                   |
| +2           | 5         | 4      | 20    |                                                   |
| +4           | —         | —      | 10    | Wild, colorless                                   |
| Switch Color | 0         | —      | 0     | Defined but disabled                              |
| Shuffle      | 0         | —      | 0     | Defined but disabled                              |

**Total: 110 cards.**

> Note: the code comment in `legacy/game.js:31` says `1, 2, 2, 2, ...` (implying 0×1 and 1–9×2)
> but the active array is all `1`s. The comment is stale; the active config is 1× each.

### Card image assets

Each card has a PNG in `legacy/assets/images/cards/` named by the pattern used in `game.js`
(NumberCards/Skip/Reverse/+2 build filenames; `+4` and `switch_color` are static):

| Card         | Filename pattern      | Example                                   |
| ------------ | --------------------- | ----------------------------------------- |
| Number       | `{color}_{n}.png`     | `blue_3.png`                              |
| Skip         | `{color}_skip.png`    | `red_skip.png`                            |
| Reverse      | `{color}_reverse.png` | `yellow_reverse.png`                      |
| +2           | `{color}_+2.png`      | `green_+2.png`                            |
| +4           | `+4.png`              | `+4.png`                                  |
| Back face    | `backface.png`        | `backface.png`                            |
| Switch Color | `swap color.png`      | `swap color.png` (note the space; unused) |

## 2. Deck constants (proposed target)

In the modernized code (`packages/shared`), deck composition must be a typed, configurable
value rather than a hard-coded class. Proposed shape:

```ts
interface DeckComposition {
  number: { countPerColor: number; numbers: number[] }; // numbers = [0,1,...,9]
  skip: number; // per color
  reverse: number; // per color
  draw2: number; // per color
  draw4: number; // total, colorless
  switchColor: number; // total, wild
  shuffle: number; // total, wild
}
```

See `../card-data-schema.md` for the full type contract.

## 3. Vault / special cards in the deck?

| Card family            | In base deck? | How it enters play                                                                                               |
| ---------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| Vaults (Tier I/II/III) | **No**        | Via vault-giving effects (Offerings, Ruin, Pandora's Box, Masterchef, Fateweaver spins), Origins, and Locations. |
| Locations              | **No**        | Selected/assigned at game start (see `locations.md`).                                                            |
| Mayhem                 | **No**        | A Mayhem is rolled at the start of each round (see `mayhem.md`).                                                 |
| Origin Vaults          | **No**        | Chosen before the game starts (see `origins.md`).                                                                |

> The PDF does **not** specify per-card quantities for the Vault families. Until the user
> provides counts, vault cards are treated as effect-granted (one instance per trigger),
> never as part of the shuffled deck.

## 4. Implementation status

- Base deck: implemented in `legacy/game.js` (`populateDeck`).
- Vaults / Locations / Mayhem / Origins: not implemented.
- The stale comment at `legacy/game.js:31` should be corrected during modernization.
