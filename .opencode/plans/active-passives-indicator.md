# Active Passives Indicator — Implementation Plan

## Goal

Show the currently active passives of the player as a row of icon chips with
hover/tap tooltips explaining each effect. The server already tracks 14 passive
kinds on `room.passives` but never sends them to clients.

## Data Flow

```
room.passives (PassiveState[])
  → player-view.ts maps to ActivePassive[]
  → PlayerView.activePassives field
  → ActivePassives component renders icon chips
  → tooltip shows full effect text
```

## Step 1 — Shared Types

**File:** `packages/shared/src/game/state.ts`

Add a new interface and field to `PlayerView`:

```ts
/** A compact representation of one active passive for the client. */
export interface ActivePassive {
  /** PassiveState kind — maps 1-to-1 with vaultIcons keys. */
  kind: string;
  /** Human-readable name of the passive effect. */
  name: string;
  /** Emoji icon (same as VAULT_ICONS mapping). */
  icon: string;
  /** Full tooltip text describing what this passive does. */
  description: string;
  /** Whether this passive affects the viewer negatively (enemies' passives). */
  hostile?: boolean;
}
```

Add to `PlayerView`:

```ts
/** Passives currently active on the requesting player. */
myPassives?: ActivePassive[];
/** Passives active on opponents (hostile indicators shown on their seats). */
enemyPassives?: { playerId: string; passives: ActivePassive[] }[];
```

## Step 2 — Passive Metadata Registry

**New file:** `packages/shared/src/cards/passives.ts`

A pure-data registry that maps `PassiveState.kind` → `{ cardId, name, description }`.
This lives in shared so both server and client can use it. The descriptions come
from the card data in `cards.ts` and the vault-effects-tracking doc.

```ts
export interface PassiveMeta {
  cardId: string;
  name: string;
  icon: string;        // emoji glyph
  description: string; // full tooltip text
}

export const PASSIVE_META: Record<string, PassiveMeta> = {
  accumulation: { cardId: "t3-accumulation", name: "Accumulation", icon: "📊", description: "Your next +2 or +4 doubles its draw amount, then this passive is consumed." },
  investment: { cardId: "t3-investment", name: "Investment", icon: "💵", description: "You draw +1 card at the start of every round." },
  most-wanted: { cardId: "t2-most-wanted", name: "Most Wanted", icon: "🎯", description: "Chosen target draws +1 each time they play a blue or red card." },
  parasitism: { cardId: "t2-parasitism", name: "Parasitism", icon: "🐛", description: "You discard a card whenever your host plays a green card." },
  cruelty: { cardId: "t2-cruelty", name: "Cruelty", icon: "🚦", description: "Chosen victims cannot win until both hold exactly 1 card." },
  tyranny: { cardId: "t1-tyranny", name: "Tyranny", icon: "👑", description: "Skips +3 for the player you skip." },
  equality: { cardId: "t1-equality", name: "Equality", icon: "⚖️", description: "Your even-number card plays draw +2 for a random enemy." },
  zephyr: { cardId: "t1-zephyr", name: "Zephyr", icon: "💨", description: "You may play 2 cards per turn. Any special play draws +2 for all enemies." },
  prayers: { cardId: "t1-prayers", name: "Prayers", icon: "🙏", description: "Your red card plays draw +1 (+bonus) for the next player." },
  "ultimate-machine-form": { cardId: "t1-ultimate-machine-form", name: "Ultimate Machine Form", icon: "🤖", description: "Your + cards and vault amounts are doubled." },
  "silver-tongue": { cardId: "t1-silver-tongue", name: "Silver Tongue", icon: "💬", description: "Blocks non-owner wins. Hands rotate clockwise each round. All hands revealed." },
  maim: { cardId: "t1-maim", name: "Maim", icon: "🩸", description: "Enemies gain Bleed stacks from hand size. At 5 stacks: +20 cards and reset." },
  scourge: { cardId: "t1-scourge", name: "Scourge", icon: "🦠", description: "Infectee at 1 card: +1 them, +2 other enemies. Infection spreads on plays/draws." },
  cutthroat: { cardId: "t1-cutthroat", name: "Cutthroat", icon: "🗡️", description: "Enemy special cards are unplayable Deadweight. Ends at 30 total cards or 20 rounds." },
};
```

## Step 3 — Server Player-View Builder

**File:** `packages/server/src/game/player-view.ts`

Import `PASSIVE_META` from shared. In `toPlayerView`, map `room.passives` to
`ActivePassive[]` and split into `myPassives` / `enemyPassives`:

```ts
import { PASSIVE_META } from "@bruno/shared";

// Inside toPlayerView:
const myPassives: ActivePassive[] = [];
const enemyPassiveMap = new Map<string, ActivePassive[]>();

for (const p of room.passives) {
  const meta = PASSIVE_META[p.kind];
  if (!meta) continue;
  const ap: ActivePassive = {
    kind: p.kind,
    name: meta.name,
    icon: meta.icon,
    description: meta.description,
  };
  if (p.ownerId === playerId) {
    myPassives.push(ap);
  } else {
    const list = enemyPassiveMap.get(p.ownerId) ?? [];
    list.push(ap);
    enemyPassiveMap.set(p.ownerId, list);
  }
}

return {
  // ...existing fields...
  myPassives: myPassives.length > 0 ? myPassives : undefined,
  enemyPassives:
    enemyPassiveMap.size > 0
      ? [...enemyPassiveMap.entries()].map(([playerId, passives]) => ({ playerId, passives }))
      : undefined,
};
```

## Step 4 — Client Component

**New file:** `packages/client/src/components/ActivePassives.tsx`

A horizontal row of icon chips. Each chip shows the emoji; on hover (desktop)
or tap (mobile), a tooltip appears below with the passive's name and full
description.

```tsx
interface ActivePassivesProps {
  passives: ActivePassive[];
}

export function ActivePassives({ passives }: ActivePassivesProps) {
  // useState for hovered index (desktop) or toggled index (mobile tap)
  // Render a flex row of small circular icon buttons
  // Each has an onmouseenter/onmouseleave (desktop) and onclick (mobile)
  // A tooltip div appears below the hovered chip with name + description
}
```

**Styling** (inline, matching BRUNO aesthetic):

- Row: `display: flex; gap: 6px; align-items: center`
- Chip: `width: 32px; height: 32px; border-radius: 50%; background: rgba(11,11,18,0.9); border: 1px solid rgba(0,238,255,0.3); font-size: 18px; cursor: default`
- Active chip (hovered): `border-color: #00eeff; box-shadow: 0 0 10px rgba(0,238,255,0.4)`
- Tooltip: `position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); background: rgba(7,7,12,0.95); border: 1px solid rgba(0,238,255,0.2); border-radius: 8px; padding: 8px 12px; max-width: 220px; font-size: 12px; color: #c8d8f0; z-index: 50; white-space: normal`

## Step 5 — Client Integration (Game.tsx)

**File:** `packages/client/src/pages/Game.tsx`

Render `ActivePassives` in two places:

1. **My passives** — below the player's own hand area (bottom-center), as a
   compact horizontal row. Only shown when `view.myPassives` is non-empty.

2. **Enemy passives** — small icon badges on each opponent's `Seat` component.
   For each opponent, render a mini row of their passive icons below their
   name/avatar. These are informational only (no tooltip needed, just the
   icons; tapping could show a simple title attribute).

Placement for own passives:

```tsx
{
  view.myPassives && view.myPassives.length > 0 ? (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 40,
      }}
    >
      <ActivePassives passives={view.myPassives} />
    </div>
  ) : null;
}
```

## Step 6 — Export Updates

- `packages/shared/src/index.ts` — add re-exports for `ActivePassive`,
  `PASSIVE_META` if not already covered by barrel.

## Files to Change

| File                                                | Change                                                                        |
| --------------------------------------------------- | ----------------------------------------------------------------------------- |
| `packages/shared/src/game/state.ts`                 | Add `ActivePassive` interface, `myPassives` + `enemyPassives` to `PlayerView` |
| `packages/shared/src/cards/passives.ts`             | **New** — `PASSIVE_META` registry                                             |
| `packages/shared/src/cards/index.ts`                | Re-export `passives.ts`                                                       |
| `packages/server/src/game/player-view.ts`           | Map `room.passives` → `myPassives` / `enemyPassives`                          |
| `packages/client/src/components/ActivePassives.tsx` | **New** — icon chip row + tooltip component                                   |
| `packages/client/src/pages/Game.tsx`                | Render `<ActivePassives>` at bottom-center + enemy icons on seats             |

## Verification

1. `npm.cmd run typecheck` — all three packages green.
2. `npm.cmd run test` — 264+ tests pass (no logic changes in game engine).
3. `npm.cmd run format` — Prettier clean.
4. Manual: start a 2-player game, play a passive vault card (e.g. Investment),
   verify the icon appears at the bottom of the screen with a working tooltip.
5. Manual: verify enemy passives show on opponent seats.
