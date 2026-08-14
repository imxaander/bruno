---
title: Vault Mechanism
status: stable
source: "user design decision (2026-08-10) + implementation"
updated: 2026-08-10
tags: [game, vaults]
---

# Vault Mechanism

This document defines how vault cards enter the game and how their effects are resolved.
The catalog of 90 vault cards (`docs/game/cards-tier3-silver.md`, `cards-tier2-gold.md`,
`cards-tier1-diamond.md`) is the source of the effect pool; it is **not** shuffled into the deck.

## 1. Vault tokens

The deck contains **9 vault tokens** instead of the catalog cards:

| Token         | Id pattern                  | Count |
| ------------- | --------------------------- | ----- |
| Silver Vault  | `vault-silver-token-{0..4}` | 5     |
| Gold Vault    | `vault-gold-token-{0..2}`   | 3     |
| Diamond Vault | `vault-diamond-token-{0}`   | 1     |

**Total deck: 119 cards** (110 base + 9 tokens). See `deck-composition.md`.

Tokens are colorless `wild` cards: playable any time it is your turn unless a draw stack is
pending (during a pending stack only `+2`/`+4` may be played). They are ignored by the
voluntary-draw gate — holding only vaults never forces you to play (`hasPlayableCard` with
`countVaults: false`). A vault token keeps the color that was active before it was played, so
the next player must still match that color (a token does not clear the active color).

## 2. Playing a vault

1. The player plays a vault token (their turn).
2. The server samples **up to 3 random distinct implemented** catalog cards of that token's
   tier (`sampleVaultOffers`): the pool is filtered to cards with a registered resolver
   (see `vault-effects-tracking.md` §Full table), so only effects that actually run can be offered.
   When fewer than 3 implemented cards exist for a tier, **all** of them are offered:
   silver 19, gold 17, diamond 26 today.
3. A `vault-choice` prompt is emitted to the actor with the sampled offers (id, name, tier,
   effect text). The token is **not** committed to the pile until the choice is made; the
   turn timer resets to a fresh full window when the prompt opens.
4. The actor picks exactly one offer. No decline, no re-roll. If the timer expires, the
   **first** offer is auto-chosen and announced in the log (choice guarantee — see
   `rules.md` §7a).
5. A `playCondition` cost on the chosen offer is checked against the actor's hand before the
   effect is allowed to run; an unaffordable pick is rejected with `CANNOT_PAY_CONDITION`.
6. The chosen card's effect resolver runs and the token is placed on the pile.

Chained sub-prompts are supported after the vault choice. Today: when the chosen offer's
resolver declares a `targets` input spec (see `card-data-schema.md` §4.1), the server keeps
the play pending and emits a `pick-players` prompt; the actor answers with a `choose-targets`
action. If the pick-players timer expires, the default targets (first allowed seats) are
applied. Offers with a `color` input spec (e.g. `t2-jettison`) reuse the `choose-color`
prompt. Cards with no spec resolve immediately (random fallback targets where needed).

When the chosen offer declares a `steal` spec (see `vault-effects-tracking.md` §Wave 2), the
server reveals each picked target's hand to the actor — serialized per-viewer via
`PlayerView.revealed`, never broadcast — and emits a `pick-cards` prompt. The actor answers
with a `choose-cards` action carrying `cardIds`; bounds (total and per-player) are validated
server-side against the current source hands. On timeout the server auto-picks the per-player
minimum and logs the default. The resolver applies the picked cards in one of three modes:
`steal` (actor's hand), `discard` (removed), `give` (dealt to random players other than the
holders).

## 3. Wire contract

`game:action` payload (Zod-validated in `@bruno/shared`):

| Field       | Type                                                       | Notes                                                                                           |
| ----------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `type`      | `"vault-choice"` \| `"choose-targets"` \| `"choose-cards"` | `choose-targets` follows a `pick-players` prompt; `choose-cards` follows a `pick-cards` prompt. |
| `playerId`  | `string`                                                   | Actor.                                                                                          |
| `cardId`    | `string`                                                   | Id of the chosen offer (`vault-choice`).                                                        |
| `targetIds` | `string[]`                                                 | Chosen players (`choose-targets`).                                                              |
| `cardIds`   | `string[]`                                                 | Chosen cards from revealed hands (`choose-cards`).                                              |

`game:prompt` payload for kind `vault-choice`:

```ts
{
  gameId: string,
  kind: "vault-choice",
  offers: [{ id: string, name: string, type: "vault-silver" | "vault-gold" | "vault-diamond", effect: string }]
}
```

`game:prompt` payload for kind `pick-players` (after a target-taking offer):

```ts
{
  gameId: string,
  kind: "pick-players",
  min: number,   // how many players must be chosen
  max: number,   // how many players may be chosen
  allowSelf?: boolean // default false
}
```

`game:prompt` payload for kind `pick-cards` (after targets are chosen for a steal-spec offer):

```ts
{
  gameId: string,
  kind: "pick-cards",
  min: number,        // total cards that must be picked (0 when no source holds cards)
  max: number,        // total cards that may be picked
  sourcePlayerIds: string[], // the revealed hands the actor may pick from
  perPlayer?: { min: number, max: number } // per-source bounds (e.g. 1-4 each of 2)
}
```

The same hand is surfaced on the client through `PlayerView.revealed` (per-viewer), so the
`pick-cards` modal only ever shows hands the server has entitled the actor to see.

## 3.1 Location modifiers

When the active location is `loc-volcano` (Volcano 🌋), the server doubles the `+N` card-giving
amounts of **Silver and Gold** vault effects only. Diamond effects and the non-`+N` parts of
Silver/Gold effects (skip turns, discard/steal/give counts, reveals) are never multiplied.

The multiplier is applied inside the vault resolver path only — regular plays of `+2`/`+4` and
other deck cards are unaffected. Implementation: `engine.ts` computes
`amountMultiplier` from `room.locationId === "loc-volcano"` plus the effect card's tier and
passes it in the resolver context; each resolver multiplies only its `addCards` amount (see
`effects/catalog.ts`). Tested in `engine.test.ts` and `effects.test.ts`.

## 4. Implementation status

- Deck tokens: `packages/shared/src/cards/deck.ts` (`DEFAULT_DECK_COMPOSITION` 5/3/1,
  `vaultTokenCards`); validated by `vaultTokenCards` count tests and `isVaultTokenCard`
  (`packages/shared/src/cards/types.ts`).
- Offer sampling: `packages/server/src/game/effects/helpers.ts` (`sampleVaultOffers`,
  `grantVaultTokens`).
- Prompt flow: `packages/server/src/game/room-manager.ts` (`pendingVault`,
  `applyVaultChoice`, `applyChooseTargets`, `applyChooseCards`); resolver wiring in
  `packages/server/src/game/engine.ts`.
- Target-picking: resolver input specs in `packages/server/src/game/effects/registry.ts`
  (`registerResolver` third argument, `getResolverInputs`).
- Card picking: `pendingVault.stealSpec` + `chosenCardIds`; reveal state in `Room.reveals`
  (per-viewer, `permanent` flag), serialized by `packages/server/src/game/player-view.ts`;
  mode application in `packages/server/src/game/effects/helpers.ts` (`applyPicked`).
- Client: `VaultPicker`, `TargetPicker`, and `CardPicker` in
  `packages/client/src/components/modals.tsx`, mounted by `packages/client/src/pages/Game.tsx`;
  the revealed-hands strip also renders there from `view.revealed`.
- Catalog cards remain in `CARDS` with their resolvers registered; they are the offer pool
  only and never appear in a dealt deck.
- Implemented target-taking resolvers: `t3/t2-scrap-shot` (pick 1), `t2-vault-hunter`
  (pick 1–3), `t1-g-switch` (pick 1), `t2-force-of-will` (pick 1); `t2-card-a-palooza` affects
  everyone (no spec).
- Implemented pick-cards resolvers: `t1-plunder` (1–3 steal), `t1-avarice` (1–5 steal),
  `t1-scrapheap` (1–7 discard), `t1-scrapstorm` (1–15 give), `t1-jack-of-all-trades` (1
  discard), `t1-jack-master` (2–8 discard, 1–4 per player).
- Implemented auto-resolved challenge resolvers: `t3-midas-touch`, `t3-flash-flood`,
  `t3-red-flag`, `t3-green-thumb` (each challenged player plays a matching color card or
  draws 4).
- Implemented timed/deferred resolvers: `t3-future-market` (2 cards return in 4 rounds),
  `t3-imploded-clockwork` (rewinds last 3 plays), `t3-green-tide` (round-15 surge),
  `t3-liquidation` (skip 2 rounds), `t3-all-in` (payout in 3 rounds). Round-delayed effects
  are queued on `room.deferred` and settled by `runDueDeferred` whenever a play or draw
  crosses a round boundary (see `vault-effects-tracking.md` §Wave 4).
- Implemented event-passive resolvers: `t3-accumulation`, `t3-investment`,
  `t2-most-wanted`, `t2-parasitism`, `t2-cruelty`, `t1-tyranny`, `t1-equality`, `t1-zephyr`,
  `t1-prayers`, `t1-ultimate-machine-form`, `t1-silver-tongue`, `t1-maim`, `t1-scourge`,
  `t1-cutthroat`. They register `Room.passives` and settle through `emitGameEvent` (see
  `vault-effects-tracking.md` §Wave 5); `t2-most-wanted`/`t2-parasitism`/`t2-cruelty`/
  `t1-scourge` also declare a `targets` pick.

### 4.1 Vault-effect banner

When a chosen vault offer resolves, the server broadcasts a `game:effect` event (see
`socket-contract.md`) to the whole room. The client shows a transient banner near the top
center of the board — the resolved card's face (tier-colored) plus its human-readable result
lines — and auto-dismisses it after ~3.5s. The banner is informational and never blocks input;
the next `game:effect` replaces the current one immediately. Implementation:
`packages/client/src/components/EffectBanner.tsx`, mounted with a dismiss timer in
`packages/client/src/pages/Game.tsx`.

Per-effect tracking and playtest log: `../game/vault-effects-tracking.md`.
