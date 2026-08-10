---
title: Card Data Schema
status: proposed
source: modernization plan + PDF card catalog
updated: 2026-08-09
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
}
```

See `game/deck-composition.md` for the current (110-card) values and open questions about
vault inclusion in the deck.

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
  game: EngineState; // full, authoritative state (server-side only)
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

Effects that need UI input (choose color, pick player, choose cards to discard/steal)
declare their required inputs in `playCondition`/metadata and the socket contract exposes a
typed "resolve prompt" flow.

## 5. Socket payload schemas (Zod)

Every event in `architecture/socket-contract.md` (proposed) has a Zod schema in `shared`.
Example:

```ts
import { z } from "zod";

const GameAction = z.object({
  gameId: z.string(),
  type: z.enum(["play", "draw", "choose-color"]),
  playerId: z.string(),
  cardId: z.string().optional(),
  cardIndex: z.number().int().nonnegative().optional(),
  chosenColor: z.enum(["red", "blue", "green", "yellow"]).optional(),
});
```

## 6. Data provenance

- Card data is transcribed from `1.4 BRUNO.pdf` (page refs in `source`).
- Rows marked `tentative` or `(unreadable)` must keep their flags; do not invent wording.
- When the user confirms values, flip `status` from `draft` to `stable` in both the docs and
  the data file.
