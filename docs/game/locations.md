---
title: Locations
status: draft
source: "1.4 BRUNO.pdf p.8, p.11-12"
updated: 2026-08-13
tags: [game, locations]
---

# Locations

Locations are environment cards that modify the rules for the whole game. The PDF lists two
distinct groups: **color/range locations** (p.8) and **rank/companion locations** (p.11–12).

## 1. Color/range locations (PDF p.8)

Each is bound to a color + number range. The number range likely refers to the number of the
card on top of the pile (open question, see `rules.md`).

| Id                   | Name              | Binding       | Effect (verbatim)                                                                                    | Source | Status |
| -------------------- | ----------------- | ------------- | ---------------------------------------------------------------------------------------------------- | ------ | ------ |
| `loc-fields`         | Fields ☁          | green 0–6     | All players draw 1 card at the beginning of the game.                                                | p.8    | draft  |
| `loc-silver-prairie` | Silver Prairie 🌄 | green 7–9     | You can trade a card with everyone only once.                                                        | p.8    | draft  |
| `loc-desert`         | Desert 🌞         | yellow 0–7    | A random player is skipped at the beginning of the game.                                             | p.8    | draft  |
| `loc-scorched-earth` | Scorched Earth 🏜  | yellow 8–9    | If the player has only 1 card left, the player with the most cards gives them 3 cards and skip them. | p.8    | draft  |
| `loc-ocean`          | Ocean 🌊          | blue 0–8      | The first vault any player will play is a Diamond Vault.                                             | p.8    | draft  |
| `loc-abyssal-depths` | Abyssal Depths 🌀 | blue 9        | All vaults are Diamond Vault.                                                                        | p.8    | draft  |
| `loc-volcano`        | Volcano 🌋        | red 0–9       | Silver and Gold effects are doubled.                                                                 | p.8    | draft  |
| `loc-hell-gate`      | Hell Gate         | Diamond Vault | Mayhem occurs each round.                                                                            | p.8    | stable |

> Hell Gate's effect is **Mayhem**: while it is the active location a random Mayhem event
> occurs at the start of each round (see `mayhem.md`). Its PDF binding reads "Diamond Vault";
> whether that binding also triggers Diamond-vault behavior is an open question.

## 2. Rank/companion locations (PDF p.11–12)

These appear in the Fateweaver section (p.11) and continue onto p.12. Each has a companion
nickname in brackets. Only Forest's effect is readable in the PDF.

| Id               | Name       | Companion | Effect                  | Source | Status |
| ---------------- | ---------- | --------- | ----------------------- | ------ | ------ |
| `loc-boneyard`   | Boneyard   | Bone      | (unreadable in PDF)     | p.11   | draft  |
| `loc-hollows`    | Hollows    | Bowl      | (unreadable in PDF)     | p.11   | draft  |
| `loc-barren`     | Barren     | Ball      | (unreadable in PDF)     | p.11   | draft  |
| `loc-meadows`    | Meadows    | Leash     | (unreadable in PDF)     | p.11   | draft  |
| `loc-fields-2`   | Fields     | Paw       | (unreadable in PDF)     | p.11   | draft  |
| `loc-forest`     | Forest     | King Cat  | All Vaults are Diamond. | p.12   | draft  |
| `loc-mountain`   | Mountain   | Frisbee   | (unreadable in PDF)     | p.12   | draft  |
| `loc-steppe`     | Steppe     | Dog Meat  | (unreadable in PDF)     | p.12   | draft  |
| `loc-yggdrasil`  | Yggdrasil  | Squirrel  | (unreadable in PDF)     | p.12   | draft  |
| `loc-veterinary` | Veterinary | Dog House | (unreadable in PDF)     | p.12   | draft  |

> These companion locations are adjacent to the Fateweaver tables in the PDF. Whether they
> are unlocked by Fateweaver rank or are standalone location cards is an open question.

## 3. Open questions

1. What determines the active color/range location during a game (rotation? chosen at start?)?
2. Does Hell Gate's "Diamond Vault" binding trigger Diamond-vault behavior (not just Mayhem)?
3. Are rank/companion locations part of the same system as color/range locations?
4. What are the unreadable companion-location effects?

## 4. Implementation status

- `loc-volcano`: Silver and Gold vault `+N` effects are doubled (Diamond and non-`+N` parts are
  not) — see `vault-mechanism.md` §3.1.
- `loc-hell-gate`: activates Mayhem — a random event at the start of each round (see
  `mayhem.md`).
- Start-of-game effects, `effectiveVaultTier` (Ocean first-vault / Abyssal Depths all-vaults
  upgrade) and `loc-fields` draw are implemented in `packages/server/src/game/systems.ts`.
- The full location selection/rotation flow (open question 1) is not implemented yet.
