---
title: Deck Composition
status: draft
source: "current implementation (packages/shared/src/cards/deck.ts) + design intent"
updated: 2026-08-10
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

In the modernized code (`packages/shared`), deck composition is a typed, configurable value
rather than a hard-coded class:

```ts
interface DeckComposition {
  number: { countPerColor: number; numbers: number[] }; // numbers = [0,1,...,9]
  skip: number; // per color
  reverse: number; // per color
  draw2: number; // per color
  draw4: number; // total, colorless
  switchColor: number; // total, wild
  shuffle: number; // total, wild
  vaultSilver: number; // silver vault tokens (5)
  vaultGold: number; // gold vault tokens (3)
  vaultDiamond: number; // diamond vault tokens (1)
}
```

Default (`DEFAULT_DECK_COMPOSITION`): 10/5/5/5/10/0/0 base cards per the table above plus
5/3/1 vault tokens = **119 cards total**. See `../card-data-schema.md` for the full type
contract and `vault-mechanism.md` for how the tokens resolve.

## 3. Vault / special cards in the deck?

| Card family            | In base deck? | How it enters play                                                                                                                                |
| ---------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vaults (Tier I/II/III) | **Tokens**    | 9 vault tokens (5 silver / 3 gold / 1 diamond) are shuffled in; playing one offers up to 3 random same-tier effects (implemented resolvers only). |
| Locations              | **No**        | Selected/assigned at game start (see `locations.md`).                                                                                             |
| Mayhem                 | **No**        | Hell Gate's location effect: a random event per round while it is active (see `mayhem.md`).                                                       |
| Origin Vaults          | **No**        | Chosen before the game starts (see `origins.md`).                                                                                                 |

> Decision (2026-08-10, revised): the 90 catalog vault cards are the **offer pool only** and
> are never shuffled into the deck. Instead the deck holds 9 vault **tokens** (5/3/1), each
> worth a choice of up to 3 random effects from its tier (sampled from cards with a
> registered resolver; when fewer than 3 exist — silver 19, gold 17, diamond 26 — all are
> offered). The default composition is **119 cards**
> (110 base + 9 tokens). Tokens are always playable on your turn (wild-like) unless a draw
> stack is pending; during a pending stack only `+2`/`+4` may be played. Vault tokens drawn
> as the opening pile top are re-seeded (like `+4`) so the game always opens on a colored
> card. Full flow in `vault-mechanism.md`.

## 4. Implementation status

- Base deck: implemented in `packages/shared/src/cards/deck.ts` (`buildBaseDeck`).
- Vault tokens: implemented (5/3/1 = 9 tokens, 119-card deck); catalog stays as offer pool.
- Vault play flow: implemented (offer prompt + resolver wiring + client `VaultPicker`).
- Locations / Origins: data defined in `packages/shared/src/cards/`; gameplay wiring pending.
- Mayhem: implemented, wired to `loc-hell-gate` (see `mayhem.md`).
- The stale comment at `legacy/game.js:31` remains unmodified (legacy is frozen).
