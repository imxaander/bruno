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
Vault cards are **not** part of the base 110-card deck.

## Notation reminder

- `+N` = give the target N cards.
- `[P]` = passive (permanent). `[sP]` = special passive (one-shot/temporary).
- `[Tentative]` = design not final. `NEW` = added in PDF 1.4.
- `To play:` = condition required to play this card.
- `(unreadable)` = the PDF text for this portion could not be extracted.

## Card table

| Id                    | Name             | Tags          | Effect (verbatim from PDF)                                                                                                                                              | Source | Notes                                                                                       |
| --------------------- | ---------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `t2-hush`             | Hush II          | —             | Skip 2 random players for 3 turns.                                                                                                                                      | p.3    |                                                                                             |
| `t2-mitosis`          | Mitosis II       | —             | +2 to 2 players.                                                                                                                                                        | p.3    |                                                                                             |
| `t2-scrap-shot`       | Scrap Shot II    | —             | Pick a player, +3 them and discard 3 cards without seeing their cards.                                                                                                  | p.3    |                                                                                             |
| `t2-force-of-will`    | Force of Will    | —             | Pick a player to play any + card, if they don't +5 them.                                                                                                                | p.3    | Forces a draw-card play.                                                                    |
| `t2-trade-sector`     | Trade Sector II  | —             | Switch 3 cards in your hand with anyone without seeing their cards. If they have less than 3 cards, +2 them.                                                            | p.3    | "If they have less than 3 cards, +2 them." appears twice in the PDF (typo or emphasis).     |
| `t2-future-sight`     | Future Sight     | —             | See the cards of a player.                                                                                                                                              | p.3    |                                                                                             |
| `t2-jettison`         | Jettison         | —             | Pick a color, discard all of those cards with the same color.                                                                                                           | p.3    | "Those cards" = the target player's cards of the chosen color (target selection ambiguous). |
| `t2-augmented-zep-y`  | Augmented Zep-y  | —             | Throw a coin, if it's heads skip yourself for 2 turns, otherwise +6 anyone.                                                                                             | p.3    | Prerequisite for Zephyr.                                                                    |
| `t2-card-a-palooza`   | Card-a-Palooza   | —             | All players shuffle their cards with each other and return with the same amount of cards.                                                                               | p.3    |                                                                                             |
| `t2-spell-counter`    | Spell Counter    | `[sP]`        | Return the next special card effect you receive to the sender, except Diamond Vault.                                                                                    | p.3    |                                                                                             |
| `t2-most-wanted`      | Most Wanted      | `[P]`         | Pick a player, that player will be +1 every time they play a blue or red card.                                                                                          | p.3    |                                                                                             |
| `t2-ruin`             | Ruin             | `NEW`         | Get a Gold Vault and +3 2 enemy players. **To play, discard a total of 7 red or yellow cards.**                                                                         | p.3→4  | "To play" note continues on p.4.                                                            |
| `t2-foedus`           | Foedus           | `[sP]`        | Pick a player to ally with for 5 rounds. If one of you wins, reduce the cards of the other player to 1.                                                                 | p.4    |                                                                                             |
| `t2-cruelty`          | Cruelty          | `[sP]`        | Pick 2 players, neither of them can win until both of their hands are reduced to 1.                                                                                     | p.4    |                                                                                             |
| `t2-parasitism`       | Parasitism       | `[P]`         | Pick a player, whenever they play a green card, discard a card from your hand. Discard your cards starting in 9-0, switch color, skip, reverse, +2, +4, and Tier III-I. | p.4    | "Discard your cards starting in 9-0..." = order in which your own cards get discarded.      |
| `t2-vault-hunter`     | Vault Hunter     | —             | Pick 3 players and steal 2 random vaults from them.                                                                                                                     | p.4    |                                                                                             |
| `t2-rummage`          | Rummage          | —             | Discard your hand. Draw 1 for each card discarded. It's your turn again.                                                                                                | p.4    |                                                                                             |
| `t2-triple-threat`    | Triple Threat    | —             | Ally with 2 players forever, go between them. All of you share your cards and punishments.                                                                              | p.4    |                                                                                             |
| `t2-twice-than-one`   | Twice than One!  | `[Tentative]` | Get 2 Silver Vaults.                                                                                                                                                    | p.4    |                                                                                             |
| `t2-sacrificial-lamb` | Sacrificial Lamb | `[Tentative]` | Discard 2 special cards to draw 10.                                                                                                                                     | p.4    |                                                                                             |
| `t2-flight-of-icarus` | Flight of Icarus | `[Tentative]` | (effect unreadable in PDF).                                                                                                                                             | p.4    | Shows as "???" in the PDF.                                                                  |

## Implementation status

None of the Tier II vault cards are implemented in the current codebase.
See `../modernization.md`.
