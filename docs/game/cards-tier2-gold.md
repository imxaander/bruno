---
title: Tier II — Gold Vault Cards
status: draft
source: "1.4 BRUNO.pdf p.3-4"
updated: 2026-08-09
tags: [game, cards, tier2]
---

# Tier II — Gold Vault Cards

Gold Vault is the **middle** vault tier (Tier II). Effects are stronger versions of several
Tier III cards (Hush II, Mitosis II, Scrap Shot II, Trade Sector II) plus unique ones.
Vault cards are **not** dealt from the deck — they form the **offer pool** for vault tokens
(3 gold tokens per game, each offering up to 3 random gold effects, sampled from cards
with a registered resolver). See
[deck-composition.md](./deck-composition.md) and [vault-mechanism.md](./vault-mechanism.md).

## Notation reminder

- `+N` = give the target N cards.
- `[P]` = passive (permanent). `[sP]` = special passive (one-shot/temporary).
- `[Tentative]` = design not final. `NEW` = added in PDF 1.4.
- `To play:` = condition required to play this card.
- `(unreadable)` = the PDF text for this portion could not be extracted.

## Card table

| Id                    | Name             | Tags          | Effect (verbatim from PDF)                                                                                   | Source | Notes                                                                                       |
| --------------------- | ---------------- | ------------- | ------------------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------- |
| `t2-hush`             | Hush II          | —             | Skip 2 random players for 3 turns.                                                                           | p.3    |                                                                                             |
| `t2-mitosis`          | Mitosis II       | —             | Target 2 players and +3 them.                                                                                | p.3    |                                                                                             |
| `t2-scrap-shot`       | Scrap Shot II    | —             | Pick a player, +3 them and discard 3 cards without seeing their cards.                                       | p.3    |                                                                                             |
| `t2-force-of-will`    | Force of Will    | —             | Pick a player to play any + card, if they don't +5 them.                                                     | p.3    | Forces a draw-card play.                                                                    |
| `t2-trade-sector`     | Trade Sector II  | —             | Switch 3 cards in your hand with anyone without seeing their cards. If they have less than 3 cards, +2 them. | p.3    | "If they have less than 3 cards, +2 them." appears twice in the PDF (typo or emphasis).     |
| `t2-future-sight`     | Future Sight     | —             | See the hands of a player for 1 round.                                                                       | p.3    |                                                                                             |
| `t2-jettison`         | Jettison         | —             | Pick a color, discard all of those cards with the same color.                                                | p.3    | "Those cards" = the target player's cards of the chosen color (target selection ambiguous). |
| `t2-augmented-zep-y`  | Augmented Zep-y  | —             | Throw a coin, if it's heads skip yourself for 2 turns, otherwise +6 anyone.                                  | p.3    | Prerequisite for Zephyr.                                                                    |
| `t2-card-a-palooza`   | Card-a-Palooza   | —             | All players shuffle their cards with each other and return with the same amount of cards.                    | p.3    |                                                                                             |
| `t2-spell-counter`    | Spell Counter    | `[sP]`        | Return the next special card effect you receive to the sender, except Diamond Vault.                         | p.3    |                                                                                             |
| `t2-most-wanted`      | Most Wanted      | `[P]`         | Pick a player, that player will be +1 every time they play a blue or red card.                               | p.3    |                                                                                             |
| `t2-ruin`             | Ruin             | `NEW`         | Get a Gold Vault. Target 2 players and +2 them. **Requirement: Discard 5 red cards.**                        | p.3→4  | "To play" note continues on p.4.                                                            |
| `t2-foedus`           | Foedus           | `[sP]`        | Pick a player to ally with for 5 rounds. If one of you wins, reduce the cards of the other player to 1.      | p.4    |                                                                                             |
| `t2-cruelty`          | Cruelty          | `[sP]`        | Pick 2 players, neither of them can win until both of their hands are reduced to 1.                          | p.4    |                                                                                             |
| `t2-parasitism`       | Parasitism       | `[P]`         | Target a player, whenever they play a green card, discard a random card from your hand.                      | p.4    |                                                                                             |
| `t2-vault-hunter`     | Vault Hunter     | —             | Pick 1-3 players and steal up to 2 vault cards from them.                                                    | p.4    |                                                                                             |
| `t2-rummage`          | Rummage          | —             | Discard your hand. Draw 1 for each card discarded. It's your turn again.                                     | p.4    |                                                                                             |
| `t2-triple-threat`    | Triple Threat    | —             | Ally with 2 players forever, go between them. All of you share your cards and punishments.                   | p.4    |                                                                                             |
| `t2-twice-than-one`   | Twice than One!  | `[Tentative]` | Get 2 Silver Vaults.                                                                                         | p.4    |                                                                                             |
| `t2-sacrificial-lamb` | Sacrificial Lamb | —             | Draw 10. **Requirement: Discard 4 Special Cards.**                                                           | p.4    |                                                                                             |
| `t2-flight-of-icarus` | Flight of Icarus | `[Tentative]` | (effect unreadable in PDF).                                                                                  | p.4    | Shows as "???" in the PDF.                                                                  |

## Implementation status

The 21 Tier II cards are transcribed into `packages/shared/src/cards/cards.ts` and used as
the gold offer pool (`sampleVaultOffers`).

Implemented resolvers: `t2-scrap-shot` (stable — pick a player, +3 and blind-discard 3),
`t2-card-a-palooza` (stable — shuffle all hands, deal back same counts), `t2-vault-hunter`
(stable — pick 1-3 players, steal up to 2 vaults in total), plus the current batch
`t2-mitosis`, `t2-hush`, `t2-trade-sector`, `t2-augmented-zep-y`, `t2-rummage`, `t2-ruin`,
`t2-jettison`, `t2-future-sight` (all still `draft`), `t2-force-of-will` (draft — picked
player plays a + card or draws 5), `t2-twice-than-one`,
`t2-sacrificial-lamb` (`[Tentative]`), and the event-passive batch `t2-most-wanted`,
`t2-parasitism`, `t2-cruelty` (draft — see the Wave 5 section in
`vault-effects-tracking.md`). Cards without a registered resolver are excluded from the offer
pool until resolved (see `effects/registry.ts`).

Deferred resolver inventory (Phase 5c, Track A batch 1): reveal/steal/switch,
timed or burst draws, skip-for-N rounds, "to play" conditions, allies, `[Tentative]`, or
unreadable text (the gold `[P]`/`[sP]` passives shipped in Wave 5 — `t2-most-wanted`,
`t2-parasitism`, `t2-cruelty`). Examples: `t2-hush`/`t2-midas`/`t2-flood` (forced-color
markers / skip hooks), `t2-twice-than-one` (`[Tentative]`),
`t2-flight-of-icarus` (unreadable), `t2-triple-threat` (ally mechanic).

See `../modernization.md` and the tracking log in `vault-effects-tracking.md`.
