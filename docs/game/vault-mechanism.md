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
`countVaults: false`).

## 2. Playing a vault

1. The player plays a vault token (their turn).
2. The server samples **up to 5 random distinct implemented** catalog cards of that token's
   tier (`sampleVaultOffers`): the pool is filtered to cards with a registered resolver
   (see `vault-effects-implemented.md` §2), so only effects that actually run can be offered.
   When fewer than 5 implemented cards exist for a tier, **all** of them are offered:
   silver 3, gold 4, diamond 4 today.
3. A `vault-choice` prompt is emitted to the actor with the sampled offers (id, name, tier,
   effect text). The token is **not** committed to the pile until the choice is made; the
   turn timer resets to a fresh full window when the prompt opens.
4. The actor picks exactly one offer. No decline, no re-roll. If the timer expires, the
   **first** offer is auto-chosen and announced in the log (choice guarantee — see
   `rules.md` §7a).
5. The chosen card's effect resolver runs and the token is placed on the pile.

Chained sub-prompts are supported after the vault choice. Today: when the chosen offer's
resolver declares a `targets` input spec (see `card-data-schema.md` §4.1), the server keeps
the play pending and emits a `pick-players` prompt; the actor answers with a `choose-targets`
action. If the pick-players timer expires, the default targets (first allowed seats) are
applied. Cards with no spec resolve immediately (random fallback targets where needed).

## 3. Wire contract

`game:action` payload (Zod-validated in `@bruno/shared`):

| Field       | Type                                   | Notes                                             |
| ----------- | -------------------------------------- | ------------------------------------------------- |
| `type`      | `"vault-choice"` \| `"choose-targets"` | `choose-targets` follows a `pick-players` prompt. |
| `playerId`  | `string`                               | Actor.                                            |
| `cardId`    | `string`                               | Id of the chosen offer (`vault-choice`).          |
| `targetIds` | `string[]`                             | Chosen players (`choose-targets`).                |

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

## 4. Implementation status

- Deck tokens: `packages/shared/src/cards/deck.ts` (`DEFAULT_DECK_COMPOSITION` 5/3/1,
  `vaultTokenCards`); validated by `vaultTokenCards` count tests and `isVaultTokenCard`
  (`packages/shared/src/cards/types.ts`).
- Offer sampling: `packages/server/src/game/effects/helpers.ts` (`sampleVaultOffers`,
  `grantVaultTokens`).
- Prompt flow: `packages/server/src/game/room-manager.ts` (`pendingVault`,
  `applyVaultChoice`, `applyChooseTargets`); resolver wiring in
  `packages/server/src/game/engine.ts`.
- Target-picking: resolver input specs in `packages/server/src/game/effects/registry.ts`
  (`registerResolver` third argument, `getResolverInputs`).
- Client: `VaultPicker` and `TargetPicker` in `packages/client/src/components/modals.tsx`,
  mounted by `packages/client/src/pages/Game.tsx`.
- Catalog cards remain in `CARDS` with their resolvers registered; they are the offer pool
  only and never appear in a dealt deck.
- Implemented target-taking resolvers: `t3/t2-scrap-shot` (pick 1), `t2-vault-hunter`
  (pick 3), `t1-g-switch` (pick 1); `t2-card-a-palooza` affects everyone (no spec).

### 4.1 Vault-effect banner

When a chosen vault offer resolves, the server broadcasts a `game:effect` event (see
`socket-contract.md`) to the whole room. The client shows a transient banner near the top
center of the board — the resolved card's face (tier-colored) plus its human-readable result
lines — and auto-dismisses it after ~3.5s. The banner is informational and never blocks input;
the next `game:effect` replaces the current one immediately. Implementation:
`packages/client/src/components/EffectBanner.tsx`, mounted with a dismiss timer in
`packages/client/src/pages/Game.tsx`.

Per-effect tracking and playtest log: `../game/vault-effects-implemented.md`.
