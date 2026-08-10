# Phase 5 — Extended Card Set + Effects

Add the full PDF card set as data + effect resolvers, plus the round-level sub-systems. Card
data (vaults, locations, origins, artifacts, mayhem) and the resolver framework are complete
(5a/5b); the round-level sub-systems remain (5c). **Revise (2026-08-10): the vault mechanism
changed from 90 catalog cards in the deck to 9 tier tokens + an offer prompt** — see
`docs/game/vault-mechanism.md`.

## 5a — Data completion (`@bruno/shared`) — **DONE (2026-08-10)**

- Add card entries for the doc-only families into `cards.ts` (keep `source` page refs):
  - `location` (2): `loc-fields`, `loc-scorched-earth` — `docs/game/locations.md`. ✅
  - `origin` (5): `origin-vault-keeper`, `origin-technomancer`, `origin-grand-architect`,
    `origin-masterchef`, `origin-fateweaver` — `docs/game/origins.md`. ✅
  - `artifact` (2): `artifact-boot`, `artifact-leg` — `docs/game/special-systems.md` §4. ✅
- Add Mayhem data (9 rolls) — `docs/game/mayhem.md` → `cards/mayhem.ts` + `getMayhemEvent`. ✅
- Vault-in-deck decision: **revised (2026-08-10)** — vault tokens (5/3/1) replace the
  90 catalog cards in the deck; catalog stays as the offer pool → **119-card default**
  (`DEFAULT_DECK_COMPOSITION`). `DeckComposition` keeps `vaultSilver/Gold/Diamond`. ✅
- Data tests: 13 tests in `cards.test.ts` (unique ids, family counts, 119-card deck,
  token/catalog split, mayhem). ✅

## 5b — Effect resolver framework — **DONE (2026-08-10)**

- Pure model from `docs/card-data-schema.md` §4 implemented in
  `packages/server/src/game/effects/`: `types.ts`, `registry.ts`, `helpers.ts`, `catalog.ts`,
  `index.ts`.
- Resolvers keyed by card id via `registerResolver`; `getResolver(id)` used by `engine.ts`
  `playCard` after base rules for vault cards.
- **Vault token flow (2026-08-10):** `room-manager.ts` samples 5 same-tier offers
  (`sampleVaultOffers`), holds them in `room.pendingVault`, emits a `vault-choice` prompt
  (`VAULT_OFFER_COUNT = 5`); `applyVaultChoice` validates the offer and completes the play.
  Engine resolves the chosen offer via `room.pendingVault.chosenCardId`. ✅
- **Data test:** every card with `status: "stable"` has a resolver (currently vacuous — all
  effect cards are `draft`); registry ids ⊆ catalog ids; exemplar +N resolvers + vault flow
  covered by `effects.test.ts` (16 tests). ✅
- Voluntary-draw gate ignores vaults (`hasPlayableCard(room, player, { countVaults: false })`) —
  decision B (2026-08-10). ✅
- Effects needing UI input (pick player, pick cards, choose color, choose origin) declare their
  required inputs; the socket layer exposes the typed prompt flow from 2c. Implemented:
  `choose-color`, `vault-choice`. **Pick-target prompts still pending (5c).**

## 5c — Sub-systems

- **Mayhem** — roll at round start (9 tables; resolve target ambiguities with user first).
- **Locations** — assign at game start; `loc-fields` extra draw; `loc-scorched-earth` hand
  transfer + skip (resolve unlock mechanism).
- **Origins** — pre-game pick (client `OriginSelect`); implement:
  - Vault Keeper (start with a Gold Vault)
  - Technomancer (duplicate-chance on vault gain: 43%/20%/10%)
  - Grand Architect / Pandora's Box upgrade + per-round chance table
  - Masterchef dish table (round milestones, red-card speed-up)
  - Fateweaver slot machine: spins by card type, prize table, rank ladder, streak modifiers
- **Artifacts** — Boot/Leg entry + Bootleg "pick a power" (resolve entry mechanics).

## 5d — Client (extended)

- Mount `OriginSelect`, `MayhemReveal`, `RewardSpin` (built in `components/modals.tsx`).
- `VaultPicker` (offer list) mounted in `Game.tsx` on `vault-choice` prompts. ✅
- Effect target-selection prompts (pick player / pick cards / discard order 9→0).
- Dish, slot-machine, and Pandora's Box panels.

## Gates

Resolve `docs/game/special-systems.md` §5, `origins.md` §3, `mayhem.md` §2, `locations.md`,
and deck-composition §3 open questions with the user before implementing their resolvers.

## Verification

- Unit tests for representative effects per family (mayhem, origins, vault tiers).
- Data test: stable cards ⟺ resolvers.
- Manual: play a round using vault cards, an origin, a mayhem, and a location.
