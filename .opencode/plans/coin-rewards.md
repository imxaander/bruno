# Coin Rewards System

## Overview

A virtual currency ("Coins") earned through gameplay, separate from rank points.
Coins are spent in the shop on cosmetic items and vault-related perks.

## Earning Coins

### Per-game rewards

| Event                         | Coins     |
| ----------------------------- | --------- |
| Win a game                    | +20       |
| Lose a game (best loser)      | +8        |
| Lose a game (middle pack)     | +5        |
| Lose a game (worst hand)      | +2        |
| Use a vault card in a game    | +1        |
| Play a perfect game (0 cards) | +10 bonus |
| Stalemate win                 | +25       |

### Milestone bonuses

| Milestone             | Coins |
| --------------------- | ----- |
| First win of the day  | +15   |
| 3 wins in a row       | +30   |
| 10 games played       | +50   |
| Reach a new rank tier | +40   |

### Daily login streak

| Streak | Coins |
| ------ | ----- |
| Day 1  | +5    |
| Day 2  | +8    |
| Day 3  | +12   |
| Day 4+ | +15   |

## Schema changes

### Firestore `profiles/{uid}`

```ts
interface PlayerProfile {
  // ...existing fields...
  coins: number; // total unspent coins
  coinsEarned: number; // lifetime coins earned (stats)
  dailyStreak: number; // consecutive days logged in
  lastLoginDate: string; // "YYYY-MM-DD" of last login
}
```

### Game-end event

Extend `GameEndedPayload` to include coins earned:

```ts
interface GameEndedPayload {
  // ...existing fields...
  coinsEarned: number;
  coinsBreakdown: {
    placement: number; // win/loss reward
    vaultCards: number; // +1 per vault card used
    bonus: number; // perfect game, streak, etc.
  };
}
```

## Server changes

1. **`calculateCoins(player, gameResult, profile)`** in `packages/shared/src/profile/types.ts`
   - Pure function, easy to test.
   - Returns `{ total, breakdown }`.

2. **`applyCoinsToProfile(profile, coinsResult)`** updates profile fields.

3. **`room-manager.ts`** — after scoring, compute coins and include in `ended` event.

4. **Socket handler** — emit `game:coins` with the breakdown so the client can animate it.

## Client changes

1. **AfterGame page** — show coins earned with breakdown (animated counter).
2. **Profile display** — show coin balance next to rank points.
3. **Changelog** — add to next version.

## Tests

- `calculateCoins` unit tests for each placement + bonus combo.
- Integration: verify coins emitted in `game:ended` event.
- Profile update: verify Firestore writes include coins fields.

## Rollout

- Step 1: Add coins to profile schema (Firestore migration).
- Step 2: Implement `calculateCoins` + server emission.
- Step 3: Client display in AfterGame + profile.
- Step 4: Milestone/daily streak logic.
