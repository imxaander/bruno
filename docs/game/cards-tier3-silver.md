---
title: Tier III — Silver Vault Cards
status: draft
source: "1.4 BRUNO.pdf p.1-2"
updated: 2026-08-09
tags: [game, cards, tier3]
---

# Tier III — Silver Vault Cards

Silver Vault is the **lowest** vault tier (Tier III). Effects are relatively modest.
Vault cards are **not** dealt from the deck — they form the **offer pool** for vault tokens
(5 silver tokens per game, each offering up to 3 random silver effects, sampled from cards
with a registered resolver). See
[deck-composition.md](./deck-composition.md) and [vault-mechanism.md](./vault-mechanism.md).

## Notation reminder

- `+N` = give the target N cards.
- `[P]` = passive (permanent). `[sP]` = special passive (one-shot/temporary).
- `[Tentative]` = design not final. `NEW` = added in PDF 1.4.
- `To play:` = condition required to play this card.
- `(unreadable)` = the PDF text for this portion could not be extracted.

## Card table

| Id                       | Name                | Tags                 | Effect (verbatim from PDF)                                                                                       | Source | Notes                                                                                   |
| ------------------------ | ------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| `t3-hush`                | Hush I              | —                    | Skip 2 players for 1 round.                                                                                      | p.1    | Also has a Tier II variant (Hush II).                                                   |
| `t3-mitosis`             | Mitosis I           | —                    | +1 to 2 players.                                                                                                 | p.1    | Also has a Tier II variant (Mitosis II).                                                |
| `t3-scrap-shot`          | Scrap Shot I        | —                    | Pick a player, +1 them and discard 1 card without seeing their cards.                                            | p.1    | Discard = remove one of the target's cards blindly.                                     |
| `t3-trade-sector`        | Trade Sector I      | —                    | Switch 2 cards in your hand with any player without seeing their cards. If they have less than 2 cards, +1 them. | p.1    | "If they have less than 2 cards, +1 them." appears twice in the PDF (typo or emphasis). |
| `t3-disorder`            | Disorder            | —                    | Rearrange the order of players.                                                                                  | p.1    | Ambiguous: likely reshuffles seat/turn order.                                           |
| `t3-imploded-clockwork`  | Imploded Clockwork  | —                    | Return played cards by 3 turns.                                                                                  | p.1    | Undo 3 turns of the pile.                                                               |
| `t3-prototype-z`         | Prototype Z         | —                    | Throw a coin, if it's heads skip yourself, otherwise +4 anyone.                                                  | p.1    | Coin flip resolves randomly.                                                            |
| `t3-midas-touch`         | Midas Touch         | —                    | All players must play a yellow card, otherwise +4 them.                                                          | p.1    |                                                                                         |
| `t3-spell-shield`        | Spell Shield        | `[sP]`               | You are not affected by the next special card you receive except from the Diamond Vault.                         | p.1    |                                                                                         |
| `t3-future-market`       | Future Market       | —                    | Give 2 cards to any player and return the cards in 4 rounds. **To play, you must have 6+ cards.**                | p.1    | Cards return after 4 rounds.                                                            |
| `t3-blitzkrieg`          | Blitzkrieg          | —                    | For 5 seconds you can draw as many cards as possible. [1 by 1 only].                                             | p.1    | Timed burst draw.                                                                       |
| `t3-accumulation`        | Accumulation        | `[sP]`               | Your next + card is x2.                                                                                          | p.1    | Doubles the value of your next draw card.                                               |
| `t3-scavenge`            | Scavenge            | —                    | Discard 1-5 cards in your hand. Draw 1 for each card discarded.                                                  | p.1    |                                                                                         |
| `t3-upgrade`             | Upgrade!            | `[sP]`, `NEW`        | Your next vault will be 1 tier higher. (Diamond Max).                                                            | p.2    | Cap at Diamond.                                                                         |
| `t3-green-tide`          | Green Tide          | `[sP]`, `NEW`        | Double the cards of everyone after 15 rounds divided by 1.5.                                                     | p.2    | "Doubled then divided by 1.5" — exact math TBD.                                         |
| `t3-double-edged-sword`  | Double Edged Sword  | `NEW`                | +4 a player and +1 yourself.                                                                                     | p.2    |                                                                                         |
| `t3-offerings`           | Offerings           | `NEW`                | Get a Silver Vault and +2 anyone. **To play, discard 3 draw [+] cards.**                                         | p.2    |                                                                                         |
| `t3-investment`          | Investment          | `[P]`, `NEW`         | Each round, you may choose to draw an additional card.                                                           | p.2    |                                                                                         |
| `t3-flash-flood`         | Flash Flood         | `NEW`                | All other players must play a blue card, otherwise +4 them.                                                      | p.2    |                                                                                         |
| `t3-red-flag`            | Red Flag            | `NEW`                | All other players must play a red card, otherwise +4 them.                                                       | p.2    |                                                                                         |
| `t3-green-thumb`         | Green Thumb         | `NEW`                | All other players must play a green card, otherwise +4 them.                                                     | p.2    |                                                                                         |
| `t3-book-of-nostradamus` | Book of Nostradamus | `[P]`, `NEW`         | Predict the outcome of the game. Start with a Diamond Vault next game if you are correct.                        | p.2    | Cross-game effect.                                                                      |
| `t3-synchronize`         | Synchronize!        | `NEW`                | Play the last vault card that the last player played.                                                            | p.2    |                                                                                         |
| `t3-double-trouble`      | Double Trouble      | `NEW`                | Ally with another player forever, go to their left side. Both of you can share your cards.                       | p.2    | Introduces ally mechanic.                                                               |
| `t3-sunder`              | Sunder              | `NEW`                | Pick a player, (effect text unreadable in PDF).                                                                  | p.2    | Effect incomplete in source.                                                            |
| `t3-liquidation`         | Liquidation         | `[Tentative]`, `NEW` | You can't draw in the deck for 2 rounds. You are skipped instead.                                                | p.2    |                                                                                         |
| `t3-all-in`              | All In              | `[Tentative]`, `NEW` | Get 2 Diamond Vaults. After 3 rounds, +15 and discard your Vaults.                                               | p.2→3  | Effect text continues from p.2 onto p.3.                                                |

## Implementation status

The 27 Tier III cards are transcribed into `packages/shared/src/cards/cards.ts` and used as
the silver offer pool (`sampleVaultOffers`).

Implemented resolvers: `t3-scrap-shot` (stable — pick a player, +1 and blind-discard 1),
plus the batch `t3-mitosis`, `t3-double-edged-sword`, `t3-hush`, `t3-trade-sector`,
`t3-prototype-z`, `t3-scavenge`, `t3-offerings` (all still `draft`), the challenge batch
`t3-midas-touch`, `t3-flash-flood`, `t3-red-flag`, `t3-green-thumb` (`draft`, auto-resolved
color challenges), the timed/deferred batch `t3-future-market`, `t3-imploded-clockwork`,
`t3-green-tide` (`draft`) plus `t3-liquidation`, `t3-all-in` (`[Tentative]` — round timers),
and the event-passive batch `t3-accumulation`, `t3-investment` (`draft` — see the Wave 5
section in `vault-effects-tracking.md`). Cards without a registered resolver are excluded
from the offer pool until resolved (see `effects/registry.ts`).

Deferred resolver inventory (Phase 5c, Track A batch 1):

- Target-picking done in this batch; the rest are deferred with reasons:
  reveal/steal/switch, burst draws, "to play" conditions, allies,
  win/kill, or unreadable text (the silver `[P]`/`[sP]` passives shipped in Wave 5 —
  `t3-accumulation`, `t3-investment`). Examples:
  `t3-synchronize` (needs "last vault card" memory), `t3-double-trouble` (ally mechanic),
  `t3-sunder` (unreadable).

See `../modernization.md` and the tracking log in `vault-effects-tracking.md`.
