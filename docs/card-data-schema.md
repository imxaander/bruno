---
title: Card Data Schema
status: proposed
source: modernization plan + PDF card catalog
updated: 2026-08-10
tags: [data, schema]
---

# Card Data Schema

The contract that card data must satisfy in the modernized codebase. Lives in
`@bruno/shared` as TypeScript + Zod. The card catalog in `docs/game/cards-*.md` is the
human-readable rendering of this data — the code is the single source of truth.

## 1. Card types

```ts
type Color = "red" | "blue" | "green" | "yellow";

type CardType =
  | "number"
  | "skip"
  | "reverse"
  | "draw2"
  | "draw4"
  | "switch-color"
  | "shuffle"
  | "vault-silver" // Tier III
  | "vault-gold" // Tier II
  | "vault-diamond" // Tier I
  | "location"
  | "origin"
  | "artifact";

type CardTag =
  | "passive" // [P]
  | "special-passive" // [sP]
  | "tentative" // [Tentative]
  | "new" // NEW in PDF 1.4
  | "wild"; // playable regardless of color
```

```ts
interface Card {
  id: string; // kebab-case slug, e.g. "t3-hush"
  name: string; // display name
  type: CardType;
  color?: Color; // present for colored cards only
  number?: number; // present for number cards only
  tags: CardTag[];
  effect: string; // verbatim effect text from the PDF (or authoritative rule)
  playCondition?: string; // "To play: ..." text, if any
  source: string; // "1.4 BRUNO.pdf p.1" etc.
  status: "stable" | "draft" | "tentative";
  image?: string; // asset filename
}
```

### Required invariants

- `id` is unique across all cards.
- `type === "number"` ⟺ `number` is present and `color` is present.
- `tags` includes `"tentative"` for any card marked `[Tentative]` in the PDF.
- Every card in the PDF catalogs (`cards-tier3-silver.md`, `cards-tier2-gold.md`,
  `cards-tier1-diamond.md`) appears in the data file.

## 2. Deck composition

```ts
interface DeckComposition {
  number: { countPerColor: number; numbers: number[] };
  skip: number; // per color
  reverse: number; // per color
  draw2: number; // per color
  draw4: number; // total, colorless wild
  switchColor: number; // total, wild (0 in current config)
  shuffle: number; // total, wild (0 in current config)
  vaultSilver: number; // silver vault tokens (5)
  vaultGold: number; // gold vault tokens (3)
  vaultDiamond: number; // diamond vault tokens (1)
}
```

See `game/deck-composition.md` for values and `game/vault-mechanism.md` for the vault flow.
Default is 119 cards (110 base + 9 vault tokens); the 90 catalog vault cards are the offer
pool only and are not dealt (decision 2026-08-10, revised).

## 3. Game state (server-authoritative)

```ts
interface CardView {
  id: string;
  image: string;
  color?: Color;
  number?: number;
  type: CardType;
}

interface PublicPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isTurn: boolean;
  handCount: number;
}

interface PlayerView {
  playerCount: number;
  players: PublicPlayer[]; // no hands
  you: { index: number; hand: CardView[] };
  pileTop: CardView | null;
  deckCount: number;
  currentTurnIndex: number;
  currentDirection: 1 | -1;
  status: "prepping" | "ongoing" | "concluding";
}
```

`PlayerView` is the only state shape sent to clients — it replaces the leaking
`ClientGameState` from `game.js`.

## 4. Effect model

Card effects are resolved by a pure function keyed by card id, so new cards are added as
data + a resolver case:

```ts
interface EffectContext {
  game: Room; // full, authoritative state (server-side only)
  actor: PlayerId;
  targets?: PlayerId[];
  chosenColor?: Color;
  random: () => number; // injectable RNG for deterministic tests
}

type EffectResult = {
  log?: string[]; // log lines
  applied: boolean;
};
```

Implemented in `packages/server/src/game/effects/` (`types.ts`, `registry.ts`, `helpers.ts`,
`catalog.ts`). Resolvers are keyed by card id via `registerResolver(cardId, resolver,
inputs?)`; the engine runs the resolver for vault cards during `playCard`. A data invariant
test requires a registered resolver for every `stable` card. Implemented resolvers today:

- +N to all enemies: `t1-meiosis`, `t1-suicide`, `t1-damnation`.
- +N to N picked players: `t3/t2-mitosis`, `t3-double-edged-sword`.
- Target-picking batch (Phase 5c Track A): `t3/t2-scrap-shot` (target +N and blind discard),
  `t2-vault-hunter` (steal vaults from 3 targets), `t1-g-switch` (swap hands),
  `t2-card-a-palooza` (shuffle all hands).

Vault tokens sample 5 random same-tier catalog offers at play time
(`sampleVaultOffers`); the chosen offer's resolver runs and the token is placed on the pile.
See `game/vault-mechanism.md`.

Effects that need UI input (choose color, pick player, choose cards to discard/steal)
declare their required inputs in a resolver's metadata and the socket contract exposes a
typed "resolve prompt" flow. Implemented prompt kinds: `choose-color`, `vault-choice`,
`pick-players`.

### 4.1 Target-picking input specs

A resolver that picks players registers a target spec so the server knows to collect
explicit targets before running the effect:

```ts
interface ResolverTargetInput {
  min: number; // how many players must be chosen
  max: number; // how many players may be chosen
  allowSelf?: boolean; // default false: the actor may not target themselves
}

interface ResolverInputs {
  targets?: ResolverTargetInput;
}

registerResolver("t3-scrap-shot", scrapShot(1, 1), { targets: { min: 1, max: 1 } });
getResolverInputs("t3-scrap-shot"); // { targets: { min: 1, max: 1 } }
```

When a chosen vault offer declares `targets`, the room manager holds the play in a pending
state and emits a `pick-players` prompt; the actor replies with a `choose-targets` action
(`targetIds`), which is validated (count, distinct, seated, actor excluded unless
`allowSelf`) and then completes the play, feeding the ids to the resolver's `targets`.
Cards with no spec run immediately with random fallback targets (existing behavior).

## 5. Socket payload schemas (Zod)

Every event in `architecture/socket-contract.md` (proposed) has a Zod schema in `shared`.
Example:

```ts
import { z } from "zod";

const GameAction = z.object({
  gameId: z.string(),
  type: z.enum(["play", "draw", "choose-color", "vault-choice", "choose-targets"]),
  playerId: z.string(),
  cardId: z.string().optional(),
  cardIndex: z.number().int().nonnegative().optional(),
  chosenColor: z.enum(["red", "blue", "green", "yellow"]).optional(),
  targetIds: z.array(z.string()).optional(), // present for "choose-targets"
});
```

```ts
// server → client prompts
const VaultOffer = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["vault-silver", "vault-gold", "vault-diamond"]),
  effect: z.string(),
});

const GamePrompt = z.discriminatedUnion("kind", [
  { gameId: z.string(), kind: z.literal("choose-color") },
  {
    gameId: z.string(),
    kind: z.literal("vault-choice"),
    offers: z.array(VaultOffer),
  },
  {
    gameId: z.string(),
    kind: z.literal("pick-players"),
    min: z.number(),
    max: z.number(),
    allowSelf: z.boolean().optional(),
  },
]);
```

## 6. Data provenance

- Card data is transcribed from `1.4 BRUNO.pdf` (page refs in `source`).
- Rows marked `tentative` or `(unreadable)` must keep their flags; do not invent wording.
- When the user confirms values, flip `status` from `draft` to `stable` in both the docs and
  the data file.
