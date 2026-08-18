# Microtransactions & Item Shop

## Overview

A shop where players spend earned Coins (not real money) on cosmetic and
gameplay-adjacent items. No pay-to-win — all items are cosmetic or provide
minor convenience perks that don't affect card balance.

## Shop Categories

### 1. Profile Cosmetics

| Item            | Cost | Effect                                       |
| --------------- | ---- | -------------------------------------------- |
| Animated avatar | 100  | Animated emoji icon (pulsing, spinning, etc) |
| Custom title    | 75   | A title shown below your name in-game        |
| Profile frame   | 120  | Decorative border around your avatar         |
| Color themes    | 50   | Alternate neon accent colors for your UI     |

### 2. Card Backs

| Item              | Cost | Effect                          |
| ----------------- | ---- | ------------------------------- |
| Default card back | free | Standard BRUNO back             |
| Neon card back    | 80   | Glowing neon border effect      |
| Holographic back  | 150  | Shifting rainbow sheen          |
| Seasonal back     | 200  | Rotates monthly, exclusive feel |

### 3. Vault Perks

| Item              | Cost | Effect                                              |
| ----------------- | ---- | --------------------------------------------------- |
| Vault preview     | 60   | See what a vault token will offer before committing |
| Extra vault offer | 90   | See 4 offers instead of 3 (one game only)           |
| Vault reroll      | 120  | Reroll vault offers once per game                   |

### 4. Emotes

| Item        | Cost | Usage                             |
| ----------- | ---- | --------------------------------- |
| GG emote    | 10   | Shown after game end              |
| Taunt emote | 15   | Shown when playing a special card |
| Celebrate   | 20   | Shown when winning                |

## Schema

### Firestore `profiles/{uid}`

```ts
interface PlayerProfile {
  // ...existing fields...
  coins: number;
  inventory: InventoryItem[];
}

interface InventoryItem {
  id: string; // item id, e.g. "card-back-neon"
  type: string; // "card-back" | "avatar" | "title" | "emote" | "perk"
  purchasedAt: number; // epoch-ms
  usesRemaining?: number; // for consumable perks, null for permanent
}
```

### Shop catalog (static, in shared)

```ts
interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: "cosmetic" | "card-back" | "perk" | "emote";
  cost: number;
  permanent: boolean; // true = one-time buy, false = consumable
  preview?: string; // asset path or emoji for preview
}
```

## Server changes

1. **Shop catalog** — static list in `packages/shared/src/shop/catalog.ts`.
2. **Purchase handler** — `socket.on("shop:buy", ...)` validates:
   - Item exists in catalog.
   - Player has enough coins.
   - Player doesn't already own permanent items.
   - Deducts coins, adds to inventory.
3. **Equip handler** — `socket.on("shop:equip", ...)` sets active cosmetic.
4. **Inventory in player-view** — send equipped items so clients can render them.

## Client changes

1. **Shop page** — grid of items by category, with cost and buy button.
2. **Profile modal** — tab to equip owned items.
3. **In-game** — render equipped card backs, emotes, titles.
4. **Coin balance** — shown in shop header and profile.

## Anti-cheat

- All purchases validated server-side.
- Coins are server-authoritative (Firestore).
- Inventory is server-authoritative.
- Client only reads; never trusts client-side coin counts.

## Monetization (future)

If real-money purchases are added later:

- Use Stripe or Firebase Payments.
- Coins packages: $0.99 = 100 coins, $4.99 = 600 coins, $9.99 = 1500 coins.
- Keep earned coins separate from purchased coins (display both).
- No gameplay advantage from purchased coins — cosmetics only.

## Rollout

- Step 1: Shop catalog + purchase handler (server).
- Step 2: Equip system + inventory in player-view.
- Step 3: Shop UI in client.
- Step 4: Card back rendering in game.
- Step 5: Emote system in game.
- Step 6: (Future) Real-money integration.
