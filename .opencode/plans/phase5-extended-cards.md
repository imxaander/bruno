# Phase 5 — Extended Card Set + Effects

Add the full PDF card set as data + effect resolvers, plus the round-level sub-systems. Card
data for vaults already lives in shared; locations/origins/artifacts/mayhem must be added.

## 5a — Data completion (`@bruno/shared`)

- Add card entries for the doc-only families into `cards.ts` (keep `source` page refs):
  - `location` (2): `loc-fields`, `loc-scorched-earth` — `docs/game/locations.md`.
  - `origin` (5): `origin-vault-keeper`, `origin-technomancer`, `origin-grand-architect`,
    `origin-masterchef`, `origin-fateweaver` — `docs/game/origins.md`.
  - `artifact` (2): `artifact-boot`, `artifact-leg` — `docs/game/special-systems.md` §4.
- Add Mayhem data (9 rolls) — `docs/game/mayhem.md`.
- Add vault-in-deck decision (deck-composition.md §3) — resolve with user; if effect-granted,
  no deck change; if mixed, extend `DeckComposition`.
- Data tests: every doc row has a card id; `id` uniqueness; `status: stable` cards have a
  resolver (see 5b).

## 5b — Effect resolver framework

- Implement the pure model from `docs/card-data-schema.md` §4:
  `EffectContext { game, actor, targets?, chosenColor?, random }` →
  `EffectResult { applied, log? }`.
- `resolvers/` keyed by card id; add `resolvers/index.ts` registry + a `getResolver(id)`.
- Wire resolvers into `engine.ts` so playing a vault card runs its effect after base rules.
- **Data test:** every card with `status: "stable"` has a resolver; `draft`/`tentative` cards
  are data-only (documented stub).
- Effects needing UI input (pick player, pick cards, choose color, choose origin) declare their
  required inputs; the socket layer exposes the typed prompt flow from 2c.

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
- Effect target-selection prompts (pick player / pick cards / discard order 9→0).
- Dish, slot-machine, and Pandora's Box panels.

## Gates

Resolve `docs/game/special-systems.md` §5, `origins.md` §3, `mayhem.md` §2, `locations.md`,
and deck-composition §3 open questions with the user before implementing their resolvers.

## Verification

- Unit tests for representative effects per family (mayhem, origins, vault tiers).
- Data test: stable cards ⟺ resolvers.
- Manual: play a round using vault cards, an origin, a mayhem, and a location.
