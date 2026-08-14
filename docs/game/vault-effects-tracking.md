---
title: Vault Effects Tracking (Spreadsheet-Ready)
status: stable
source: packages/server/src/game/effects/catalog.ts + packages/shared/src/cards/cards.ts (ground truth)
updated: 2026-08-13
tags: [game, cards, vault, tracking]
---

# Vault Effects Tracking (Spreadsheet-Ready)

One row per vault card (90 total: 27 Silver, 21 Gold, 42 Diamond). Columns are designed to
paste directly into a spreadsheet. **Ground truth is code** — `catalog.ts` (resolvers) and
`cards.ts` (card data). Docs may lag; when they disagree, the code wins.

## Columns

- **Id**: card id (`slug` form).
- **Name**: display name from `cards.ts`.
- **Tier**: `Silver` / `Gold` / `Diamond`.
- **Tags**: `[P]` passive, `[sP]` special passive, `[Tentative]`, `NEW`, `[Working]` (see `../STYLE.md`).
- **Effect**: verbatim effect text from `cards.ts` (canonical notation `+N`).
- **Status**: `data status` field in `cards.ts` (`stable` / `draft` / `tentative`).
- **Resolver**: `Yes` if a resolver is registered in `catalog.ts`.
- **Implemented**: `Yes` if the effect is testable end-to-end (resolver + tests).
- **Verified**: fill in date/initials once playtested end-to-end (default `—`).
- **Play**: `playCondition` from `cards.ts` when present, else `—`.
- **Source**: PDF page reference.
- **Notes**: implementation notes / deviations.

## Status legend

| Status      | Meaning                                                       |
| ----------- | ------------------------------------------------------------- |
| `stable`    | Confirmed by the user and/or fully specified in the PDF.      |
| `draft`     | Written from best-effort extraction; needs user confirmation. |
| `tentative` | Marked `[Tentative]` in the PDF; design not final.            |

`[Working]` on a row means the user has confirmed the effect plays correctly end-to-end. It is
added to the Tags column; rows without it may still have a `Yes` resolver but are not yet
user-confirmed.

## Full table

| Id                         | Name                               | Tier    | Tags                      | Effect                                                                                                                                                                                                                                                 | Status    | Resolver | Implemented | Verified | Play                                          | Source | Notes                                            |
| -------------------------- | ---------------------------------- | ------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | -------- | ----------- | -------- | --------------------------------------------- | ------ | ------------------------------------------------ |
| `t3-hush`                  | Hush I                             | Silver  | — [Working]               | Skip 2 players for 1 round.                                                                                                                                                                                                                            | draft     | Yes      | Yes         | —        | —                                             | p.1    | skip = 1 skipped turn                            |
| `t3-mitosis`               | Mitosis I                          | Silver  | — [Working]               | +1 to 2 players.                                                                                                                                                                                                                                       | draft     | Yes      | Yes         | —        | —                                             | p.1    | random targets                                   |
| `t3-scrap-shot`            | Scrap Shot I                       | Silver  | — [Working]               | Pick a player, +1 them and discard 1 card without seeing their cards.                                                                                                                                                                                  | stable    | Yes      | Yes         | —        | —                                             | p.1    | blind discard                                    |
| `t3-trade-sector`          | Trade Sector I                     | Silver  | — [Working]               | Switch 2 cards in your hand with any player without seeing their cards. If they have less than 2 cards, +1 them.                                                                                                                                       | draft     | Yes      | Yes         | —        | —                                             | p.1    | blind swap; fallback +1                          |
| `t3-disorder`              | Disorder                           | Silver  | —                         | Rearrange the order of players.                                                                                                                                                                                                                        | draft     | No       | No          | —        | —                                             | p.1    |                                                  |
| `t3-imploded-clockwork`    | Imploded Clockwork                 | Silver  | — [Working]               | Return played cards by 3 turns.                                                                                                                                                                                                                        | draft     | Yes      | Yes         | —        | —                                             | p.1    | undoes last 3 plays via pile history             |
| `t3-prototype-z`           | Prototype Z                        | Silver  | — [Working]               | Throw a coin, if it's heads skip yourself, otherwise +4 anyone.                                                                                                                                                                                        | draft     | Yes      | Yes         | —        | —                                             | p.1    | coin flip via rng                                |
| `t3-midas-touch`           | Midas Touch                        | Silver  | — [Working]               | All players must play a yellow card, otherwise +4 them.                                                                                                                                                                                                | draft     | Yes      | Yes         | —        | —                                             | p.1    | auto-resolved color challenge                    |
| `t3-spell-shield`          | Spell Shield                       | Silver  | [sP]                      | You are not affected by the next special card you receive except from the Diamond Vault.                                                                                                                                                               | draft     | No       | No          | —        | —                                             | p.1    |                                                  |
| `t3-future-market`         | Future Market                      | Silver  | — [Working]               | Give 2 cards to any player and return the cards in 4 rounds.                                                                                                                                                                                           | draft     | Yes      | Yes         | —        | 6+ cards                                      | p.1    | `hold` cost gate; deferred return                |
| `t3-blitzkrieg`            | Blitzkrieg                         | Silver  | —                         | For 5 seconds you can draw as many cards as possible. [1 by 1 only].                                                                                                                                                                                   | draft     | No       | No          | —        | —                                             | p.1    |                                                  |
| `t3-accumulation`          | Accumulation                       | Silver  | [sP] [Working]            | Your next + card is x2.                                                                                                                                                                                                                                | draft     | Yes      | Yes         | —        | —                                             | p.1    | one-shot: doubles the owner's next +2/+4         |
| `t3-scavenge`              | Scavenge                           | Silver  | — [Working]               | Discard 1-5 cards in your hand. Draw 1 for each card discarded.                                                                                                                                                                                        | draft     | Yes      | Yes         | —        | —                                             | p.1    |                                                  |
| `t3-upgrade`               | Upgrade!                           | Silver  | [sP] NEW                  | Your next vault will be 1 tier higher. (Diamond Max).                                                                                                                                                                                                  | draft     | No       | No          | —        | —                                             | p.2    |                                                  |
| `t3-green-tide`            | Green Tide                         | Silver  | [sP] NEW [Working]        | Double the cards of everyone after 15 rounds divided by 1.5.                                                                                                                                                                                           | draft     | Yes      | Yes         | —        | —                                             | p.2    | deferred; draw ⅓ of hand at round 15             |
| `t3-double-edged-sword`    | Double Edged Sword                 | Silver  | NEW [Working]             | +4 a player and +1 yourself.                                                                                                                                                                                                                           | draft     | Yes      | Yes         | —        | —                                             | p.2    | random enemy                                     |
| `t3-offerings`             | Offerings                          | Silver  | NEW [Working]             | Get a Silver Vault and +2 anyone.                                                                                                                                                                                                                      | draft     | Yes      | Yes         | —        | discard 3 draw [+] cards                      | p.2    | play-condition: discard before resolving         |
| `t3-investment`            | Investment                         | Silver  | [P] NEW [Working]         | Each round, you may choose to draw an additional card.                                                                                                                                                                                                 | draft     | Yes      | Yes         | —        | —                                             | p.2    | auto-draws +1 for the owner each round           |
| `t3-flash-flood`           | Flash Flood                        | Silver  | NEW [Working]             | All other players must play a blue card, otherwise +4 them.                                                                                                                                                                                            | draft     | Yes      | Yes         | —        | —                                             | p.2    | auto-resolved color challenge                    |
| `t3-red-flag`              | Red Flag                           | Silver  | NEW [Working]             | All other players must play a red card, otherwise +4 them.                                                                                                                                                                                             | draft     | Yes      | Yes         | —        | —                                             | p.2    | auto-resolved color challenge                    |
| `t3-green-thumb`           | Green Thumb                        | Silver  | NEW [Working]             | All other players must play a green card, otherwise +4 them.                                                                                                                                                                                           | draft     | Yes      | Yes         | —        | —                                             | p.2    | auto-resolved color challenge                    |
| `t3-book-of-nostradamus`   | Book of Nostradamus                | Silver  | [P] NEW                   | Predict the outcome of the game. Start with a Diamond Vault next game if you are correct.                                                                                                                                                              | draft     | No       | No          | —        | —                                             | p.2    |                                                  |
| `t3-synchronize`           | Synchronize!                       | Silver  | NEW                       | Play the last vault card that the last player played.                                                                                                                                                                                                  | draft     | No       | No          | —        | —                                             | p.2    |                                                  |
| `t3-double-trouble`        | Double Trouble                     | Silver  | NEW                       | Ally with another player forever, go to their left side. Both of you can share your cards.                                                                                                                                                             | draft     | No       | No          | —        | —                                             | p.2    |                                                  |
| `t3-sunder`                | Sunder                             | Silver  | NEW                       | Pick a player, (effect text unreadable in PDF).                                                                                                                                                                                                        | draft     | No       | No          | —        | —                                             | p.2    |                                                  |
| `t3-liquidation`           | Liquidation                        | Silver  | [Tentative] NEW [Working] | You can't draw in the deck for 2 rounds. You are skipped instead.                                                                                                                                                                                      | tentative | Yes      | Yes         | —        | —                                             | p.2    | round-scoped self-skip                           |
| `t3-all-in`                | All In                             | Silver  | [Tentative] NEW [Working] | Get 2 Diamond Vaults. After 3 rounds, +15 and discard your Vaults.                                                                                                                                                                                     | tentative | Yes      | Yes         | —        | —                                             | p.2-3  | deferred payout + vault discard                  |
| `t2-hush`                  | Hush II                            | Gold    | — [Working]               | Skip 2 random players for 3 turns.                                                                                                                                                                                                                     | draft     | Yes      | Yes         | —        | —                                             | p.3    | skip = 3 skipped turns                           |
| `t2-mitosis`               | Mitosis II                         | Gold    | — [Working]               | +2 to 2 players.                                                                                                                                                                                                                                       | draft     | Yes      | Yes         | —        | —                                             | p.3    | random targets                                   |
| `t2-scrap-shot`            | Scrap Shot II                      | Gold    | — [Working]               | Pick a player, +3 them and discard 3 cards without seeing their cards.                                                                                                                                                                                 | stable    | Yes      | Yes         | —        | —                                             | p.3    | blind discard                                    |
| `t2-force-of-will`         | Force of Will                      | Gold    | — [Working]               | Pick a player to play any + card, if they don't +5 them.                                                                                                                                                                                               | draft     | Yes      | Yes         | —        | —                                             | p.3    | auto-resolved; target plays a + card or draws 5  |
| `t2-trade-sector`          | Trade Sector II                    | Gold    | — [Working]               | Switch 3 cards in your hand with anyone without seeing their cards. If they have less than 3 cards, +2 them.                                                                                                                                           | draft     | Yes      | Yes         | —        | —                                             | p.3    | blind swap; fallback +2                          |
| `t2-future-sight`          | Future Sight                       | Gold    | — [Working]               | See the cards of a player.                                                                                                                                                                                                                             | draft     | Yes      | Yes         | —        | —                                             | p.3    | reveals one hand to the actor                    |
| `t2-jettison`              | Jettison                           | Gold    | — [Working]               | Pick a color, discard all of those cards with the same color.                                                                                                                                                                                          | draft     | Yes      | Yes         | —        | color pick                                    | p.3    | actor's own hand; vault color prompt             |
| `t2-augmented-zep-y`       | Augmented Zep-y                    | Gold    | — [Working]               | Throw a coin, if it's heads skip yourself for 2 turns, otherwise +6 anyone.                                                                                                                                                                            | draft     | Yes      | Yes         | —        | —                                             | p.3    | coin flip via rng                                |
| `t2-card-a-palooza`        | Card-a-Palooza                     | Gold    | — [Working]               | All players shuffle their cards with each other and return with the same amount of cards.                                                                                                                                                              | stable    | Yes      | Yes         | —        | —                                             | p.3    |                                                  |
| `t2-spell-counter`         | Spell Counter                      | Gold    | [sP]                      | Return the next special card effect you receive to the sender, except Diamond Vault.                                                                                                                                                                   | draft     | No       | No          | —        | —                                             | p.3    |                                                  |
| `t2-most-wanted`           | Most Wanted                        | Gold    | [P] [Working]             | Pick a player, that player will be +1 every time they play a blue or red card.                                                                                                                                                                         | draft     | Yes      | Yes         | —        | —                                             | p.3    | target +1 on each blue/red play                  |
| `t2-ruin`                  | Ruin                               | Gold    | NEW [Working]             | Get a Gold Vault and +3 2 enemy players.                                                                                                                                                                                                               | draft     | Yes      | Yes         | —        | discard 7 red or yellow cards                 | p.3-4  | play-condition: discard before resolving         |
| `t2-foedus`                | Foedus                             | Gold    | [sP]                      | Pick a player to ally with for 5 rounds. If one of you wins, reduce the cards of the other player to 1.                                                                                                                                                | draft     | No       | No          | —        | —                                             | p.4    |                                                  |
| `t2-cruelty`               | Cruelty                            | Gold    | [sP] [Working]            | Pick 2 players, neither of them can win until both of their hands are reduced to 1.                                                                                                                                                                    | draft     | Yes      | Yes         | —        | —                                             | p.4    | blocks wins; lifts when both victims at 1 card   |
| `t2-parasitism`            | Parasitism                         | Gold    | [P] [Working]             | Pick a player, whenever they play a green card, discard a card from your hand. Discard your cards starting in 9-0, switch color, skip, reverse, +2, +4, and Tier III-I.                                                                                | draft     | Yes      | Yes         | —        | —                                             | p.4    | owner discards 9→0, specials, then vaults        |
| `t2-vault-hunter`          | Vault Hunter                       | Gold    | — [Working]               | Pick 1-3 players and steal up to 2 vault cards from them.                                                                                                                                                                                              | stable    | Yes      | Yes         | —        | —                                             | p.4    |                                                  |
| `t2-rummage`               | Rummage                            | Gold    | — [Working]               | Discard your hand. Draw 1 for each card discarded. It's your turn again.                                                                                                                                                                               | draft     | Yes      | Yes         | —        | —                                             | p.4    | keepTurn                                         |
| `t2-triple-threat`         | Triple Threat                      | Gold    | —                         | Ally with 2 players forever, go between them. All of you share your cards and punishments.                                                                                                                                                             | draft     | No       | No          | —        | —                                             | p.4    |                                                  |
| `t2-twice-than-one`        | Twice than One!                    | Gold    | [Tentative] [Working]     | Get 2 Silver Vaults.                                                                                                                                                                                                                                   | tentative | Yes      | Yes         | —        | —                                             | p.4    |                                                  |
| `t2-sacrificial-lamb`      | Sacrificial Lamb                   | Gold    | [Tentative] [Working]     | Discard 2 special cards to draw 10.                                                                                                                                                                                                                    | tentative | Yes      | Yes         | —        | discard 2 special cards                       | p.4    | play-condition: discard before resolving         |
| `t2-flight-of-icarus`      | Flight of Icarus                   | Gold    | [Tentative]               | (effect unreadable in PDF).                                                                                                                                                                                                                            | tentative | No       | No          | —        | —                                             | p.4    |                                                  |
| `t1-global-silence`        | Global Silence                     | Diamond | — [Working]               | Skip all enemy players for 3 rounds.                                                                                                                                                                                                                   | draft     | Yes      | Yes         | —        | —                                             | p.4    | skip = 3 skipped turns                           |
| `t1-meiosis`               | Meiosis                            | Diamond | — [Working]               | +3 to all enemy players.                                                                                                                                                                                                                               | draft     | Yes      | Yes         | —        | —                                             | p.4    |                                                  |
| `t1-scrapheap`             | Scrapheap                          | Diamond | — [Working]               | +1 to all enemy players and discard a total of 1-7 cards to any enemy players while seeing their cards.                                                                                                                                                | draft     | Yes      | Yes         | —        | —                                             | p.4    | pick-cards discard mode                          |
| `t1-plunder`               | Plunder                            | Diamond | — [Working]               | Pick an enemy player, +3 them and steal 1-3 cards while seeing their cards.                                                                                                                                                                            | draft     | Yes      | Yes         | —        | —                                             | p.5    | pick-cards steal mode                            |
| `t1-suicide`               | Suicide                            | Diamond | — [Working]               | +12 to yourself and to any enemy player.                                                                                                                                                                                                               | draft     | Yes      | Yes         | —        | —                                             | p.5    | random enemy                                     |
| `t1-all-seeing-eye`        | All Seeing Eye                     | Diamond | [P] [Working]             | See the cards of everyone and pick one to see their cards forever.                                                                                                                                                                                     | draft     | Yes      | Yes         | —        | —                                             | p.5    | one-shot all + permanent reveal pick             |
| `t1-jack-of-all-trades`    | Jack of All Trades                 | Diamond | — [Working]               | +1 a random enemy player, skip a random enemy player for 1 round, discard 1 card from any enemy player while seeing their cards and see all the cards of a random enemy player.                                                                        | draft     | Yes      | Yes         | —        | —                                             | p.5    | random buff/skip/reveal + 1 pick                 |
| `t1-g-switch`              | G-Switch                           | Diamond | — [Working]               | Switch hands with anyone.                                                                                                                                                                                                                              | stable    | Yes      | Yes         | —        | —                                             | p.5    |                                                  |
| `t1-rewind`                | Rewind                             | Diamond | —                         | Reset the game. [4 or more players only].                                                                                                                                                                                                              | draft     | No       | No          | —        | anyone plays 7 Diamond Vaults                 | p.5    |                                                  |
| `t1-ticket-to-paradise`    | Ticket to Paradise                 | Diamond | [sP]                      | After you win, pick a player and reduce their cards to 1. If you have 6+ cards, reduce your cards to 4. Discard your cards starting in 9-0, switch color, skip, reverse, +2, +4, and Tier III-I.                                                       | draft     | No       | No          | —        | —                                             | p.5    |                                                  |
| `t1-zephyr`                | Zephyr                             | Diamond | [P] [Working]             | You can play 2 cards in your turn, some special cards have effects and +2 to all enemy players.                                                                                                                                                        | draft     | Yes      | Yes         | —        | Prototype Z and Augmented Zep-y played by you | p.5    | keepTurn 2×/turn; any special +2 to all enemies  |
| `t1-tyranny`               | Tyranny                            | Diamond | [P] [Working]             | Whenever you skip an enemy player +3 them. Skip the next player.                                                                                                                                                                                       | draft     | Yes      | Yes         | —        | —                                             | p.5    | skips next seat at activation; +3 per skip       |
| `t1-equality`              | Equality                           | Diamond | [P] [Working]             | Everytime you play an even no. card, +2 to a random enemy player.                                                                                                                                                                                      | draft     | Yes      | Yes         | —        | —                                             | p.5    | random enemy +2 per even number play             |
| `t1-last-stand`            | Last Stand                         | Diamond | [sP]                      | If you would lose, discard your hand and +4, while the opposing player +5.                                                                                                                                                                             | draft     | No       | No          | —        | —                                             | p.5    |                                                  |
| `t1-divinity`              | Divinity                           | Diamond | [P]                       | You are not affected by anything except Diamond Vault.                                                                                                                                                                                                 | draft     | No       | No          | —        | —                                             | p.5    |                                                  |
| `t1-arise`                 | Arise                              | Diamond | —                         | Return a player who has won the game, +2 and skip them.                                                                                                                                                                                                | draft     | No       | No          | —        | —                                             | p.5-6  |                                                  |
| `t1-bootleg`               | Bootleg                            | Diamond | —                         | Pick a power from the artifact that you crafted. These powers cannot be destroyed. Find Boot and Leg.                                                                                                                                                  | draft     | No       | No          | —        | —                                             | p.6    |                                                  |
| `t1-maim`                  | Maim                               | Diamond | [P] [Working]             | All enemies with more than 2 cards gain Bleed, every 2 cards added after that, gain another Bleed. When enemies have 5 stacks of Bleed, +20 them and reset the Bleed.                                                                                  | draft     | Yes      | Yes         | —        | —                                             | p.6    | recomputed from hand size; never decays          |
| `t1-cutthroat`             | Cutthroat                          | Diamond | [sP] [Working]            | All enemy players cannot use special cards anymore. Their special cards are now Deadweight. Remove all Deadweight once everyone's total cards is 30. If they aren't removed in 20 rounds, +4 them for each Deadweight they are holding and discard it. | draft     | Yes      | Yes         | —        | —                                             | p.6    | specials unplayable; ends at 30 total or +20 rds |
| `t1-silver-tongue`         | Silver Tongue                      | Diamond | [P] [Working]             | No one can play their last card if you're still in the game. Switch everyone's hand clockwise every round. Everyone can see EVERYONE'S cards.                                                                                                          | draft     | Yes      | Yes         | —        | —                                             | p.6    | blocks non-owner wins; clockwise pass per round  |
| `t1-finality`              | Finality                           | Diamond | —                         | When you have all 0, kill all enemies and win the game. [Blue, Red, Green, Yellow].                                                                                                                                                                    | draft     | No       | No          | —        | —                                             | p.6    |                                                  |
| `t1-greed-is-good`         | Greed is Good                      | Diamond | [P]                       | Win by getting exactly 20 cards. When you draw a card, remove a card from your hand.                                                                                                                                                                   | draft     | No       | No          | —        | exactly 15 cards; cannot be Arised            | p.6    |                                                  |
| `t1-doomsday-button`       | Doomsday Button                    | Diamond | [P]                       | Win in 60 rounds. Skip yourself for 30 rounds.                                                                                                                                                                                                         | draft     | No       | No          | —        | —                                             | p.6    |                                                  |
| `t1-cosmic-alignment`      | Cosmic Alignment                   | Diamond | [P] NEW                   | Win by getting blue numbered cards from 0 to 9. Your hand is now limited to 11 cards, excess cards are discarded. You cannot be Arised.                                                                                                                | draft     | No       | No          | —        | —                                             | p.6    |                                                  |
| `t1-all-is-fair`           | All is Fair in Love and War        | Diamond | —                         | Destroy all enemy passives [P] and +4 them.                                                                                                                                                                                                            | draft     | No       | No          | —        | —                                             | p.6    |                                                  |
| `t1-scourge`               | Scourge                            | Diamond | [P] [Working]             | Pick a player to infect, after that player reaches 1 card, +1 to them and +2 to all other enemies. Infect the next player after them until it reaches the host again. You can't get infected.                                                          | draft     | Yes      | Yes         | —        | —                                             | p.6    | spreads to next non-host; ends back at host      |
| `t1-prayers`               | Prayers                            | Diamond | [P] [Working]             | All your red cards have +1. Gain additional + if you played the following before prayers; Offerings, +1. Path to Ruin, +2. Both, +4.                                                                                                                   | draft     | Yes      | Yes         | —        | —                                             | p.6-7  | +1 (+bonus) to next seat per red play            |
| `t1-unnamed-card`          | Unnamed Card                       | Diamond | —                         | All your no. cards have + depending on your no. card. Non no. cards are +2. It's your turn again. Enemy players that have 25+ cards are killed. +4 EVERYONE.                                                                                           | draft     | No       | No          | —        | ???                                           | p.7    |                                                  |
| `t1-ultimate-machine-form` | Ultimate Machine Form              | Diamond | [Tentative] [Working]     | All your moves are now doubled.                                                                                                                                                                                                                        | tentative | Yes      | Yes         | —        | —                                             | p.7    | doubles owner's + cards and vault amounts        |
| `t1-thrice-than-twice`     | Thrice Than Twice!                 | Diamond | [Tentative] [Working]     | Get 3 Silver Vaults.                                                                                                                                                                                                                                   | tentative | Yes      | Yes         | —        | —                                             | p.7    |                                                  |
| `t1-mega-upgrade`          | Mega Upgrade!                      | Diamond | —                         | Your next Diamond Vault will be upgraded, shuffle me back into the deck.                                                                                                                                                                               | draft     | No       | No          | —        | —                                             | p.7    |                                                  |
| `t1-sloth`                 | Sloth                              | Diamond | — [Working]               | Skip all enemies for 20 rounds.                                                                                                                                                                                                                        | draft     | Yes      | Yes         | —        | —                                             | p.7    | skip = 20 skipped turns                          |
| `t1-genesis`               | Genesis                            | Diamond | — [Working]               | +6 to all enemy players. The enemy with the most cards is skipped depending on the no. of cards that they have.                                                                                                                                        | draft     | Yes      | Yes         | —        | —                                             | p.7    | skips most-cards enemy 1 turn                    |
| `t1-scrapstorm`            | Scrapstorm                         | Diamond | — [Working]               | Pick a total of 1-15 cards to any enemy players while seeing their cards, then give them to other players.                                                                                                                                             | draft     | Yes      | Yes         | —        | —                                             | p.7    | pick-cards give mode (random others)             |
| `t1-avarice`               | Avarice                            | Diamond | — [Working]               | +2 to all players then steal a total of 1-5 cards to any enemy players while seeing their cards.                                                                                                                                                       | draft     | Yes      | Yes         | —        | —                                             | p.7    | +2 all then pick-cards steal                     |
| `t1-damnation`             | Damnation                          | Diamond | — [Working]               | +1 to yourself and +23 to an enemy player.                                                                                                                                                                                                             | draft     | Yes      | Yes         | —        | —                                             | p.7    | random enemy                                     |
| `t1-omniscient`            | Omniscient                         | Diamond | [P] [Working]             | See all the cards permanently and skip anyone for 5 rounds.                                                                                                                                                                                            | draft     | Yes      | Yes         | —        | —                                             | p.7    | permanent all + skip 5                           |
| `t1-jack-master`           | Jack of all Trades, Master of Some | Diamond | — [Working]               | +4 2 enemy players, skip 2 enemy players for 4 rounds, discard 1-4 cards from 2 enemy players while seeing their cards and see all the cards of 2 enemy players.                                                                                       | draft     | Yes      | Yes         | —        | —                                             | p.7    | pick 1-4 per player (2 players)                  |
| `t1-envy`                  | Envy                               | Diamond | — [Working]               | Switch hands with anyone and do it again to another pair of players.                                                                                                                                                                                   | draft     | Yes      | Yes         | —        | —                                             | p.7    | needs 4+ players for second swap                 |
| `t1-unnamed-morning-star`  | Unnamed Card (Morning Star analog) | Diamond | —                         | In 15 rounds, kill all enemy players with less than 20 RED cards.                                                                                                                                                                                      | draft     | No       | No          | —        | —                                             | p.8    |                                                  |
| `t1-evening-star`          | The Evening Star                   | Diamond | —                         | Revive all winners and +10 all enemy players. In 15 rounds, kill all enemy players with less than 20 BLUE cards.                                                                                                                                       | draft     | No       | No          | —        | —                                             | p.8    |                                                  |
| `t1-dawns-triumph`         | Dawn's Triumph                     | Diamond | —                         | Kill all enemy players with less than 5 BLUE or RED cards.                                                                                                                                                                                             | draft     | No       | No          | —        | —                                             | p.8    |                                                  |

## Totals

| Tier    | Cards  | Resolver | Implemented |
| ------- | ------ | -------- | ----------- |
| Silver  | 27     | 19       | 19          |
| Gold    | 21     | 17       | 17          |
| Diamond | 42     | 26       | 26          |
| **All** | **90** | **62**   | **62**      |

## Wave 0 — Mechanic classification

Primary category per card (secondary needs in Notes). **Implemented** = resolver exists and is
tested. **Needed** = the engine capability a new resolver (or Wave 1+) depends on. `Wave` is the
suggested implementation batch.

| Category               | Implemented | Needed                                  | Wave | Count | Cards                                                                                                                                                                                                                                |
| ---------------------- | ----------- | --------------------------------------- | ---- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Simple +N              | Yes         | none (helpers)                          | done | 6     | `t3-mitosis`, `t3-double-edged-sword`, `t2-mitosis`, `t1-meiosis`, `t1-suicide`, `t1-damnation`                                                                                                                                      |
| Skip                   | Yes         | skip mechanic                           | done | 5     | `t3-hush`, `t2-hush`, `t1-global-silence`, `t1-sloth`, `t1-genesis`                                                                                                                                                                  |
| Swap / shuffle         | Yes         | none                                    | done | 5     | `t3-trade-sector`, `t2-trade-sector`, `t2-card-a-palooza`, `t1-g-switch`, `t1-envy`                                                                                                                                                  |
| Blind targets          | Yes         | none                                    | done | 3     | `t3-scrap-shot`, `t2-scrap-shot`, `t2-vault-hunter`                                                                                                                                                                                  |
| Hand draw / discard    | Yes         | none                                    | done | 2     | `t3-scavenge`, `t2-rummage`                                                                                                                                                                                                          |
| Coin flip              | Yes         | none (rng)                              | done | 2     | `t3-prototype-z`, `t2-augmented-zep-y`                                                                                                                                                                                               |
| Vault token gain       | Yes         | none                                    | done | 2     | `t2-twice-than-one`, `t1-thrice-than-twice`                                                                                                                                                                                          |
| Play-gated simple      | Yes         | `playCondition` gate + resource discard | done | 3     | `t3-offerings`, `t2-ruin`, `t2-sacrificial-lamb`                                                                                                                                                                                     |
| Hand shaping (color)   | Yes         | color pick + self discard               | done | 1     | `t2-jettison`                                                                                                                                                                                                                        |
| Reveal / steal-visible | Yes         | none                                    | done | 9     | `t2-future-sight`, `t1-scrapheap`, `t1-plunder`, `t1-scrapstorm`, `t1-avarice`, `t1-all-seeing-eye`, `t1-omniscient`, `t1-jack-of-all-trades`, `t1-jack-master`                                                                      |
| Challenge              | Yes         | none (auto-resolved)                    | 3    | 5     | `t3-midas-touch`, `t3-flash-flood`, `t3-red-flag`, `t3-green-thumb`, `t2-force-of-will`                                                                                                                                              |
| Timed / deferred       | Yes         | round counter + deferred queue          | done | 5     | `t3-future-market`, `t3-imploded-clockwork`, `t3-green-tide`, `t3-liquidation`, `t3-all-in`                                                                                                                                          |
| Event-driven passive   | Yes         | event hook system                       | done | 14    | `t3-accumulation`, `t3-investment`, `t2-most-wanted`, `t2-parasitism`, `t2-cruelty`, `t1-tyranny`, `t1-equality`, `t1-zephyr`, `t1-prayers`, `t1-ultimate-machine-form`, `t1-silver-tongue`, `t1-maim`, `t1-scourge`, `t1-cutthroat` |
| Shield / reflect       | No          | reactive trigger on incoming effect     | 6    | 3     | `t3-spell-shield`, `t2-spell-counter`, `t1-divinity`                                                                                                                                                                                 |
| Ally / teams           | No          | alliance system                         | 7    | 3     | `t3-double-trouble`, `t2-foedus`, `t2-triple-threat`                                                                                                                                                                                 |
| Win / kill             | No          | win-condition + kill design (open Qs)   | 8    | 10    | `t1-finality`, `t1-greed-is-good`, `t1-doomsday-button`, `t1-cosmic-alignment`, `t1-dawns-triumph`, `t1-unnamed-morning-star`, `t1-evening-star`, `t1-ticket-to-paradise`, `t1-last-stand`, `t1-unnamed-card`                        |
| Revive / reset         | No          | game/history manipulation               | 9    | 2     | `t1-arise`, `t1-rewind`                                                                                                                                                                                                              |
| Tier upgrade           | No          | tier boost state                        | 9    | 2     | `t3-upgrade`, `t1-mega-upgrade`                                                                                                                                                                                                      |
| Replay                 | No          | last-vault-card memory                  | 9    | 1     | `t3-synchronize`                                                                                                                                                                                                                     |
| Turn order             | No          | seat-order mutation                     | 9    | 1     | `t3-disorder`                                                                                                                                                                                                                        |
| Passive destroy        | No          | passive registry                        | 9    | 1     | `t1-all-is-fair`                                                                                                                                                                                                                     |
| Artifact               | No          | artifact crafting                       | 9    | 1     | `t1-bootleg`                                                                                                                                                                                                                         |
| Cross-game             | No          | meta-progression                        | 9    | 1     | `t3-book-of-nostradamus`                                                                                                                                                                                                             |
| Realtime               | No          | timed draw window                       | 9    | 1     | `t3-blitzkrieg`                                                                                                                                                                                                                      |
| Unreadable             | —           | PDF text needed                         | 9    | 2     | `t3-sunder`, `t2-flight-of-icarus`                                                                                                                                                                                                   |

- **Wave 1** shipped the `playCondition` gate (discard N cards of tag/color before resolving)
  plus a vault color pick; both categories above are now implemented and tested.
- **Wave 2** shipped the reveal/steal-visible category: a per-recipient hand reveal
  (not a full-hand broadcast — see `../architecture/state-model.md`) plus the `pick-cards`
  sub-prompt with steal/discard/give modes and per-player bounds.
- **Wave 3** shipped the challenge category as synchronous auto-resolution (see below).
- **Wave 4** shipped the timed/deferred category: a round counter on the room, a deferred
  effect queue settled whenever a play or draw crosses a round boundary, a `hold` cost mode
  ("6+ cards" gates), and round-scoped self-skips (Liquidation).
- **Wave 5 (event passives)** shipped the largest batch: a general event-hook system
  (play-card, draw, skip, round-advanced) plus win-blocking and play-blocking hooks.
  It also re-homed every existing skip site onto the new skip event (so Tyranny sees them).
- **Wave 8 (win/kill)** carries open design questions (kill ordering, Arise interactions,
  "cannot be Arised", hand-reduction win triggers) — see `rules.md` §9 before starting.
- Unreadable cards block on re-extracting `1.4 BRUNO.pdf` text.

## Wave 1 — play-condition batch

Four play-gated effects shipped as the first batch after Wave 0:

| Card                  | Play condition                         | Effect                                                |
| --------------------- | -------------------------------------- | ----------------------------------------------------- |
| `t3-offerings`        | discard 3 draw [+] cards (draw2/draw4) | get a Silver Vault token and +2 anyone (self ok)      |
| `t2-ruin`             | discard 7 red or yellow cards          | get a Gold Vault token and +3 two enemy players       |
| `t2-sacrificial-lamb` | discard 2 special cards (non-number)   | draw 10                                               |
| `t2-jettison`         | none (color pick)                      | discard every card of the chosen color from your hand |

Mechanics:

- Costs are declared declaratively (`CostSpec { count, match, label }` on the resolver) and
  gated **at offer-pick time**: an unaffordable `vault-choice` returns `CANNOT_PAY_CONDITION`
  and leaves `pendingVault` untouched. `payCost` is atomic — it removes nothing when the hand
  is short, so a failed resolver never partially discards.
- `t2-jettison` sets `color: true` on the resolver; the server prompts the actor with the
  existing `choose-color` flow (`pendingVault.colorRequired`), and the resolver receives
  `chosenColor`. A later Wave can generalize this to "discard any/all of a chosen color".

## Wave 2 — reveal / steal-visible batch

Nine effects ship the hand-reveal + card-picking capability:

| Card                    | Reveal                          | Steal spec                | Mode    |
| ----------------------- | ------------------------------- | ------------------------- | ------- |
| `t2-future-sight`       | one hand (pick 1, self ok)      | —                         | —       |
| `t1-plunder`            | one target                      | 1–3 from target           | steal   |
| `t1-avarice`            | picked targets                  | 1–5 total                 | steal   |
| `t1-scrapheap`          | picked targets                  | 1–7 total                 | discard |
| `t1-scrapstorm`         | picked targets                  | 1–15 total                | give    |
| `t1-jack-of-all-trades` | random enemy (buff+skip)        | 1 from any enemy          | discard |
| `t1-jack-master`        | both targets                    | 2–8 total, 1–4 per player | discard |
| `t1-all-seeing-eye`     | everyone (one-shot) + 1 forever | —                         | —       |
| `t1-omniscient`         | everyone (permanent)            | — (skip target 5 turns)   | —       |

Mechanics:

- Resolvers declare `steal: { min, max, mode, perPlayer? }` (see `effects/registry.ts`). After
  `choose-targets`, the server reveals each source hand to the actor (one-shot), then emits a
  `pick-cards` prompt. The resolver receives the picked ids as `picked` and applies the mode:
  `steal` adds them to the actor's hand, `discard` removes them from the game, `give` deals
  them to random players other than their holders.
- `pick-cards` validates count (bounded by the actual available cards, `effectiveMin`),
  uniqueness, membership in the source hands, and per-player bounds when declared. Zero
  available cards short-circuits straight to resolution with no prompt.
- On timeout, the server auto-picks the per-player minimum per source (filling to `min` when
  no `perPlayer` is declared) and logs the default.
- Reveals are per-viewer (`room.reveals`): serialized only to the entitled viewer via
  `PlayerView.revealed`. One-shot reveals are pruned when another player acts; `permanent`
  reveals (`t1-all-seeing-eye` pick, `t1-omniscient`) survive until the game ends. Hand
  visibility never leaks through `PublicPlayer` or the event stream.

## Wave 3 — challenge batch

Five effects share the "everyone must play a certain card or pay" mechanic:

| Card               | Challenge                                       | Penalty |
| ------------------ | ----------------------------------------------- | ------- |
| `t3-midas-touch`   | all players play a yellow card (actor included) | +4 each |
| `t3-flash-flood`   | all other players play a blue card              | +4 each |
| `t3-red-flag`      | all other players play a red card               | +4 each |
| `t3-green-thumb`   | all other players play a green card             | +4 each |
| `t2-force-of-will` | picked player plays any + card (draw2/draw4)    | +5      |

Mechanics:

- Challenges are **auto-resolved synchronously** in the resolver: every challenged player who
  holds a card of the required color plays one (first match, placed on the pile, active color
  follows), and anyone without one draws the penalty. There is no per-player forced-play
  window — a player can never decline a card they hold, so the penalty only hits hand-less
  players. If a windowed "choose to refuse" version is ever wanted it needs a new prompt flow.
- `t2-force-of-will` declares a `targets` pick (1). The picked player plays a draw2/draw4 card
  if they hold one — it goes on the pile, sets the active color (draw4 → null), and adds its
  `+N` to `pendingDraw`, so the next player faces the stack. Otherwise they draw 5.
- The penalty (and `+N`) scales with the loc-volcano multiplier like any Silver/Gold effect.

## Wave 4 — timed / deferred batch

Five Silver effects resolve on a delay, driven by a round counter and a deferred queue:

| Card                    | Immediate                                    | Deferred                                                     |
| ----------------------- | -------------------------------------------- | ------------------------------------------------------------ |
| `t3-future-market`      | gives 2 random hand cards to a picked player | the same cards return to the actor in 4 rounds               |
| `t3-imploded-clockwork` | —                                            | (immediate) rewinds the last 3 plays                         |
| `t3-green-tide`         | —                                            | at round 15, everyone draws ⅓ of their hand                  |
| `t3-liquidation`        | actor can't act for 2 rounds (skipped)       | —                                                            |
| `t3-all-in`             | gains 2 Diamond Vault tokens                 | in 3 rounds: +15, then discards all the actor's Vault tokens |

Mechanics:

- `room.round` counts full passes around the table (incremented in `advanceTurn` when play
  wraps past the first/last seat). It is a heuristic — reverses and 2-player games blur the
  boundary — which is fine for the coarse playtest timers these cards need.
- `room.deferred` is a queue of round-triggered items (`scheduleDeferred`).
  `runDueDeferred` settles every item whose `triggerRound` has arrived; the engine calls it
  after every play and every draw, so a deferred effect fires as soon as a round boundary is
  crossed. Settlements produce normal game-log lines and surface like any effect banner.
- `t3-future-market`'s "To play: 6+ cards" gate is a `hold` cost mode: the resolver verifies
  the hand size and the vault pick is rejected with `CANNOT_PAY_CONDITION` when short, but no
  cards are discarded. The two given cards are tracked by id; when the return fires, only the
  cards the target still holds come back (any played/stolen ones are logged as lost).
- `t3-imploded-clockwork` is an immediate rewind, not a timer: `room.pileLog` records every
  play through `playCard` (round + player + card). The resolver pulls the last 3 entries
  before the token itself off the pile and returns them to the players who played them. Pile
  state (active color, pending draw stack) is not rewound — only the cards come back.
- `t3-liquidation` sets `player.liquidationUntilRound = room.round + 2`; `advanceTurn` hops
  that player while `room.round <= liquidationUntilRound`, so they skip instead of acting.
- `t3-all-in` grants Diamond Vaults (Diamond effects are never doubled on loc-volcano) and
  the +15 at payout is likewise un-scaled. "Discard your Vaults" removes every vault token
  the actor holds at payout time, including any drawn in the meantime.
- `t3-green-tide` math is a documented playtest interpretation ("double, then /1.5" ≈ each
  player draws `ceil(hand/3)` at round 15) — the PDF text is ambiguous and flagged TBD.

## Wave 5 — event-driven passive batch

Fourteen `[P]`/`[sP]` cards activate a persistent **passive** on the room and react to game
events instead of resolving once. The engine emits events at the natural boundaries
(`playCard`, `applyDraw`, `advanceTurn`) and `emitGameEvent` settles every registered passive
that cares.

| Card                       | Reaction                                                                    |
| -------------------------- | --------------------------------------------------------------------------- |
| `t3-accumulation`          | one-shot: owner's next +2/+4 doubles, then the passive is consumed          |
| `t3-investment`            | owner draws +1 every round advance                                          |
| `t2-most-wanted`           | chosen target +1 each time they play a blue or red card                     |
| `t2-parasitism`            | owner discards a card (9→0, specials, then vaults) when target plays green  |
| `t2-cruelty`               | chosen victims can't win until both hold exactly 1 card, then it lifts      |
| `t1-tyranny`               | skips the next seat at activation; owner's skips +3 the skipped player      |
| `t1-equality`              | owner's even-number plays +2 a random enemy                                 |
| `t1-zephyr`                | owner may play 2 cards/turn; any special play +2 to all enemies             |
| `t1-prayers`               | owner's red plays +1 (+Offerings/Ruin bonus) to the next seat               |
| `t1-ultimate-machine-form` | owner's + cards and vault `amountMultiplier` are doubled                    |
| `t1-silver-tongue`         | blocks non-owner wins; hands pass clockwise each round; reveals all hands   |
| `t1-maim`                  | enemies gain Bleed stacks from hand size; at 5, +20 and reset               |
| `t1-scourge`               | infectee at 1 card: +1 them, +2 other enemies, infection spreads            |
| `t1-cutthroat`             | enemy specials are unplayable Deadweight; ends at 30 total or the +20 round |

Mechanics:

- `room.passives` holds `PassiveState` discriminated unions (kind, ownerId, + per-card state).
  The engine exposes `emitGameEvent(room, event, rng)`; handlers run over a snapshot of the
  registry so a passive can remove itself mid-dispatch (accumulation, cruelty, scourge,
  cutthroat). Log lines flow into the same game log as any effect banner.
- Events: `card-played`, `player-skipped`, `draw`, `round-advanced`. `player-skipped` is
  emitted by the new `applySkipTurns` helper, and **every existing skip source in `catalog.ts`
  was rewired through it** so Tyranny observes hush/silence/sloth/genesis skips too.
- Win blocking: `isWinAllowed(room, player)` is consulted by the engine's win check. Cruelty
  blocks a marked victim (and Silver Tongue blocks everyone but its owner) without blocking the
  card play itself — the player just can't win until the condition clears.
- Play blocking: Cutthroat makes enemy non-number cards unplayable via `isPlayable(card, room,
player)` (the player arg is new). This makes its "30 total" end condition naturally reachable
  — specials pile up as Deadweight while numbers thin out.
- `t1-zephyr`'s "some special cards have effects" is interpreted as _any_ non-number play, and
  `t1-maim`'s Bleed never decays and is recomputed from hand size on every relevant event —
  both are playtest interpretations of ambiguous PDF text (flagged in the tests).
- `t1-scourge`'s infection travels to the next player after the infectee, skipping the host; in
  a 2-player game it has nowhere to go and ends ("reaches the host again").

## How an effect runs

1. A player plays a vault token → the server samples **up to 3 random same-tier catalog cards
   that have a registered resolver** as offers (`sampleVaultOffers`). Fewer than 3 implemented
   cards in a tier → all of them are offered (silver 19, gold 17, diamond 26 today).
2. The player picks one offer (`vault-choice`); the server first checks the offer's
   `playCondition` cost and rejects with `CANNOT_PAY_CONDITION` when unaffordable. If the
   offer declares a target spec, a `pick-players` sub-prompt collects explicit targets
   (`choose-targets`); if it declares `color`, the actor picks a color (`choose-color`).
3. When the offer declares a `steal` spec, target selection reveals the source hands to the
   actor and opens a `pick-cards` sub-prompt; the resolver receives the picked ids in
   `picked`.
4. The chosen offer's resolver runs with
   `{ game, actor, targets, chosenColor, picked, random }` and appends log lines; the token is
   placed on the pile.
5. Resolvers are registered with `registerResolver(cardId, fn, { targets, cost, color, steal })`
   in `effects/catalog.ts`; inputs drive whether the server asks for picks.

Effect notation follows the rules glossary: `+N` = add N cards from the deck. See
`../game/rules.md`.

## Resolver behavior notes

- Skip cards (`hush` t3/t2, `global-silence`, `sloth`, `genesis`): `skippedTurns` counts
  **skipped turns** — the player is hopped over once per counter value, including the last
  one. "N rounds" and "N turns" both mean N skipped turns.
- `coinFlip` cards (`prototype-z`, `augmented-zep-y`): `rng() < 0.5` → heads (self-skip),
  otherwise tails (`+N` to a target). Targets fall back to a random other player when none
  given.
- `trade-sector` (t3/t2): blindly swaps N cards; if the target has fewer than N, `+fallback`
  instead of swapping.
- `scavenge`: discards 1-5 (min of hand), redraws the same count.
- `rummage`: discards the whole hand, redraws the same count, sets `keepTurn`.
- `gainVaults` (`twice-than-one`, `thrice-than-twice`): mints fresh vault tokens into the
  actor's hand.
- `envy`: switches the actor with a picked player, then a second random pair (needs 4+).
- `scrap-shot`, `vault-hunter`: blind operations; target hands are never serialized.
- Play-gated cards (`offerings`, `ruin`, `sacrificial-lamb`): `payCost` removes exactly the
  declared count of matching cards (draw2/draw4, colored cards, non-number specials) and
  discards **nothing** when the count can't be met.
- `jettison`: discards every hand card of `chosenColor` (self-hand only); vault color prompts
  reuse the `choose-color` flow.
- Reveal/steal cards (`future-sight`, `plunder`, `avarice`, `scrapheap`, `scrapstorm`,
  `jack-of-all-trades`, `jack-master`, `all-seeing-eye`, `omniscient`): the actor's picked
  cards move via `applyPicked` — `steal` → actor hand, `discard` → removed, `give` → random
  players other than the holders. `+N` land before the steal (targets grow, then shrink).
- `all-seeing-eye`/`omniscient` mark permanent reveals; the `[P]` (always-on) parts of those
  cards are still a Wave 5 event-hook concern, so only the reveal + skip parts run today.
- Challenge cards (`midas-touch`, `flash-flood`, `red-flag`, `green-thumb`, `force-of-will`):
  resolved synchronously — each challenged player plays a matching color card or draws the
  penalty; `force-of-will`'s target plays a `+` card (adding to `pendingDraw`) or draws 5.
- Timed/deferred cards (`future-market`, `imploded-clockwork`, `green-tide`, `liquidation`,
  `all-in`): scheduled on `room.deferred` and settled by `runDueDeferred` when their round
  arrives (see the Wave 4 section); `imploded-clockwork` and `liquidation` act immediately.
- Playing a vault token keeps the active color unchanged.

## Caveats / known gaps

- The offer pool samples **registered resolvers only** (`sampleVaultOffers` filters
  `card.type` and checks `getResolver(card.id)`), so every offer resolves something. Adding
  resolvers widens the pool automatically.
- 51 of the 62 implemented cards still have `status: draft` (6 `tentative`) in `cards.ts`;
  flip to `stable` in `cards.ts` (and the tier doc) once the effect text is confirmed.
- Wave progress is tracked in the `## Totals` table; new resolvers bump the counts.
- Prompt/target plumbing, timeout defaults, and client modals: `../game/vault-mechanism.md`.

## Playtest log

| Date | Effect | Scenario | Result | Notes |
| ---- | ------ | -------- | ------ | ----- |
|      |        |          |        |       |
