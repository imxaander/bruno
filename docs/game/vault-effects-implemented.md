---
title: Vault Effects Implemented (Tracking Log)
status: stable
source: packages/server/src/game/effects/catalog.ts (ground truth)
updated: 2026-08-11
tags: [game, cards, vault, tracking]
---

# Vault Effects Implemented (Tracking Log)

Consolidated log of every vault effect with a working resolver. Use it to track which
effects are implemented and to log playtest verification. **Ground truth is code** —
`packages/server/src/game/effects/catalog.ts` (resolvers) and
`packages/shared/src/cards/cards.ts` (card data). Docs may lag; when they disagree, the
code wins.

## 1. How an effect runs

1. A player plays a vault token → the server samples **up to 5 random same-tier catalog cards
   that have a registered resolver** as offers (`sampleVaultOffers`). Fewer than 5
   implemented cards in a tier → all of them are offered (silver 3, gold 4, diamond 4).
2. The player picks one offer (`vault-choice`); if the offer declares a target spec, a
   `pick-players` sub-prompt collects explicit targets (`choose-targets`).
3. The chosen offer's resolver runs with `{ game, actor, targets, random }` and appends log
   lines; the token is placed on the pile.
4. Resolvers are registered with `registerResolver(cardId, fn, { targets })` in
   `effects/registry.ts`; the target spec drives whether the server asks for picks.

Effect notation follows the rules glossary: `+N` = add N cards from the deck. See
`../game/rules.md`.

## 2. Implemented effects

| ID                      | Name               | Tier    | Effect (canonical)                                  | Target spec        | Data status | Verified |
| ----------------------- | ------------------ | ------- | --------------------------------------------------- | ------------------ | ----------- | -------- |
| `t3-scrap-shot`         | Scrap Shot I       | Silver  | Pick a player: `+1` them, blind-discard 1 from them | pick 1             | stable      | —        |
| `t3-mitosis`            | Mitosis I          | Silver  | `+1` to 2 players                                   | none (random)      | draft       | —        |
| `t3-double-edged-sword` | Double Edged Sword | Silver  | `+4` a player and `+1` yourself                     | none (random)      | draft       | —        |
| `t2-scrap-shot`         | Scrap Shot II      | Gold    | Pick a player: `+3` them, blind-discard 3 from them | pick 1             | stable      | —        |
| `t2-mitosis`            | Mitosis II         | Gold    | `+2` to 2 players                                   | none (random)      | draft       | —        |
| `t2-card-a-palooza`     | Card-a-Palooza     | Gold    | Shuffle all hands together, deal back same counts   | none (all players) | stable      | —        |
| `t2-vault-hunter`       | Vault Hunter       | Gold    | Pick 3 players: steal 2 random vault tokens each    | pick 3             | stable      | —        |
| `t1-meiosis`            | Meiosis            | Diamond | `+3` to all enemy players                           | none (all others)  | draft       | —        |
| `t1-suicide`            | Suicide            | Diamond | `+12` to yourself and `+12` to an enemy             | none (random)      | draft       | —        |
| `t1-g-switch`           | G-Switch           | Diamond | Switch hands with a picked player                   | pick 1             | stable      | —        |
| `t1-damnation`          | Damnation          | Diamond | `+1` to yourself and `+23` to an enemy              | none (random)      | draft       | —        |

- **Data status** is the `status` field in `packages/shared/src/cards/cards.ts`. A resolver
  exists for every row above; `draft` rows are not yet "officially" counted in the offer
  pool design but their resolver is implemented and testable.
- **Target spec** `pick N` means the resolver registers `{ min: N, max: N }` and the server
  emits a `pick-players` prompt. `none (random)` means the server picks targets for you
  (distinct seated players other than the actor, sampled from the seeded RNG).
- **Verified**: fill in the date/initials once you have playtested the effect end-to-end.

## 3. Resolver behavior notes

- `scrap-shot` (`t3`/`t2`): adds `+N`, then removes N cards **at random** from the target's
  hand without revealing them (anti-cheat — the target's hand is never serialized). If the
  target has fewer than N cards, only what's available is removed.
- `vault-hunter`: from each picked target, steals up to 2 **vault tokens** at random
  (id matches `vault-*-token-*`). If a target holds no tokens, nothing is stolen from them.
- `card-a-palooza`: pools every player's hand into one shuffled deck and redeals in seat
  order, preserving each player's original hand size. No player's hand is ever exposed.
- `g-switch`: swaps the actor's hand and the picked target's hand wholesale.
- `mitosis` (`t3`/`t2`): `+1`/`+2` to 2 distinct players; falls back to random others since
  no target spec is registered.
- `meiosis`: `+3` to every player except the actor (no teams exist yet).
- `suicide` / `damnation` / `double-edged-sword`: `+N` to the actor and `+M` to a single
  (random) enemy.
- Playing any vault card clears `activeColor` (tokens and their effects are colorless/wild).

## 4. Caveats / known gaps

- The offer pool is sampled from cards with a **registered resolver only**
  (`sampleVaultOffers` filters `card.type` and checks `getResolver(card.id)`), so every offer
  in the prompt resolves something. Implemented counts per tier: silver 3, gold 4, diamond 4
  (all of them are offered since each tier has fewer than 5). The 11 rows in §2 are exactly
  the offerable set today; new resolvers widen the pool automatically.
- The 6 `draft` rows above are implemented but their card data is still `draft`; flip them
  to `stable` in `cards.ts` (and the tier doc) once you confirm the effect text is correct.
- Prompt/target plumbing, timeout defaults, and the client modals are covered in
  `../game/vault-mechanism.md`.

## 5. Playtest log

| Date | Effect | Scenario | Result | Notes |
| ---- | ------ | -------- | ------ | ----- |
|      |        |          |        |       |
