/** Profile stored in Firestore at `profiles/{uid}`. */
export interface PlayerProfile {
  uid: string;
  username: string;
  icon: string;
  wins: number;
  points: number;
  gamesPlayed: number;
  vaultCardsUsed: number;
  coins: number;
  inventory: InventoryItem[];
  equippedCardBack: string;
  equippedBackground: string;
  lastLoginDate: string;
  dailyStreak: number;
  createdAt: number;
  updatedAt: number;
}

export interface InventoryItem {
  id: string;
  type: "card-back" | "background";
  purchasedAt: number;
}

/** A single rank tier (e.g., "Bronze 3", "Gold 1"). */
export interface RankTier {
  name: string; // "Bronze 3", "Gold 1", etc.
  rank: string; // "Bronze", "Gold", etc.
  icon: string; // "🥉", "🥇", etc.
  minPoints: number;
  maxPoints: number;
}

/** All rank tiers in ascending order. */
export const RANK_TIERS: RankTier[] = [
  { name: "Bronze 3", rank: "Bronze", icon: "🥉", minPoints: 0, maxPoints: 49 },
  { name: "Bronze 2", rank: "Bronze", icon: "🛡️", minPoints: 50, maxPoints: 99 },
  { name: "Bronze 1", rank: "Bronze", icon: "⚔️", minPoints: 100, maxPoints: 149 },
  { name: "Silver 3", rank: "Silver", icon: "🥈", minPoints: 150, maxPoints: 199 },
  { name: "Silver 2", rank: "Silver", icon: "🌙", minPoints: 200, maxPoints: 249 },
  { name: "Silver 1", rank: "Silver", icon: "⭐", minPoints: 250, maxPoints: 299 },
  { name: "Gold 3", rank: "Gold", icon: "🥇", minPoints: 300, maxPoints: 349 },
  { name: "Gold 2", rank: "Gold", icon: "🔥", minPoints: 350, maxPoints: 399 },
  { name: "Gold 1", rank: "Gold", icon: "💫", minPoints: 400, maxPoints: 449 },
  { name: "Platinum 3", rank: "Platinum", icon: "💎", minPoints: 450, maxPoints: 499 },
  { name: "Platinum 2", rank: "Platinum", icon: "🌀", minPoints: 500, maxPoints: 549 },
  { name: "Platinum 1", rank: "Platinum", icon: "🔮", minPoints: 550, maxPoints: 599 },
  { name: "Diamond 3", rank: "Diamond", icon: "💠", minPoints: 600, maxPoints: 649 },
  { name: "Diamond 2", rank: "Diamond", icon: "✨", minPoints: 650, maxPoints: 699 },
  { name: "Diamond 1", rank: "Diamond", icon: "🌟", minPoints: 700, maxPoints: 749 },
  { name: "Bruno", rank: "Bruno", icon: "👑", minPoints: 750, maxPoints: Infinity },
];

/** Returns the rank tier for a given point total. */
export function getRankTier(points: number): RankTier {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (points >= RANK_TIERS[i]!.minPoints) {
      return RANK_TIERS[i]!;
    }
  }
  return RANK_TIERS[0]!;
}

/** Point calculation for game end. */
export interface PointChange {
  uid: string;
  delta: number;
  oldPoints: number;
  newPoints: number;
  oldTier: string;
  newTier: string;
}

/**
 * Calculate point changes for all players after a game ends.
 * - Winner: +5 base + (+1 per vault card used), max +10
 * - Best loser (fewest cards): +3
 * - Worst loser (most cards): −5
 * - Middle pack: +2 down to −4, scaled by how many cards each loser still holds
 */
export function calculatePointChanges(
  players: {
    uid: string | null;
    isWinner: boolean;
    cardsRemaining: number;
    vaultCardsUsed: number;
    currentPoints: number;
  }[],
): PointChange[] {
  const losers = players.filter((p) => !p.isWinner);
  if (losers.length === 0) {
    // Solo win — just the winner
    const winner = players.find((p) => p.isWinner);
    if (!winner || !winner.uid) return [];
    const vaultBonus = Math.min(winner.vaultCardsUsed, 5);
    const delta = 5 + vaultBonus;
    const oldTier = getRankTier(winner.currentPoints);
    const newPoints = winner.currentPoints + delta;
    const newTier = getRankTier(newPoints);
    return [
      {
        uid: winner.uid,
        delta,
        oldPoints: winner.currentPoints,
        newPoints,
        oldTier: oldTier.name,
        newTier: newTier.name,
      },
    ];
  }

  const minCards = Math.min(...losers.map((p) => p.cardsRemaining));
  const maxCards = Math.max(...losers.map((p) => p.cardsRemaining));
  const spread = maxCards - minCards;

  const changes: PointChange[] = [];

  for (const player of players) {
    if (!player.uid) continue; // skip guests

    let delta = 0;
    if (player.isWinner) {
      const vaultBonus = Math.min(player.vaultCardsUsed, 5);
      delta = 5 + vaultBonus;
    } else if (losers.length > 1) {
      if (player.cardsRemaining === minCards) {
        delta = 3;
      } else if (player.cardsRemaining === maxCards) {
        delta = -5;
      } else if (spread > 0) {
        // Middle pack: interpolate +2 (nearly emptied) down to −4 (nearly worst).
        const t = (player.cardsRemaining - minCards) / spread;
        delta = Math.round(2 - 6 * t);
      }
    }

    const oldTier = getRankTier(player.currentPoints);
    const newPoints = Math.max(0, player.currentPoints + delta);
    const newTier = getRankTier(newPoints);

    changes.push({
      uid: player.uid,
      delta,
      oldPoints: player.currentPoints,
      newPoints,
      oldTier: oldTier.name,
      newTier: newTier.name,
    });
  }

  return changes;
}

/** Coin reward for game end. */
export interface CoinChange {
  uid: string;
  placement: number;
  vaultBonus: number;
  bonus: number;
  total: number;
}

/**
 * Calculate coins earned for each player after a game.
 * - Winner: +20
 * - Best loser: +8
 * - Worst loser: +2
 * - Middle pack: +5
 * - +1 per vault card used
 */
export function calculateCoins(
  players: {
    uid: string | null;
    isWinner: boolean;
    cardsRemaining: number;
    vaultCardsUsed: number;
  }[],
): CoinChange[] {
  const losers = players.filter((p) => !p.isWinner);
  const minCards = losers.length > 0 ? Math.min(...losers.map((p) => p.cardsRemaining)) : 0;
  const maxCards = losers.length > 0 ? Math.max(...losers.map((p) => p.cardsRemaining)) : 0;

  const changes: CoinChange[] = [];

  for (const player of players) {
    if (!player.uid) continue;

    let placement = 0;
    if (player.isWinner) {
      placement = 20;
    } else if (player.cardsRemaining === minCards && losers.length > 1) {
      placement = 8;
    } else if (player.cardsRemaining === maxCards && losers.length > 1) {
      placement = 2;
    } else {
      placement = 5;
    }

    const vaultBonus = player.vaultCardsUsed;
    const bonus = player.isWinner && player.cardsRemaining === 0 ? 10 : 0;

    changes.push({
      uid: player.uid,
      placement,
      vaultBonus,
      bonus,
      total: placement + vaultBonus + bonus,
    });
  }

  return changes;
}

/** Daily login reward tiers. Returns coins for the given streak day. */
export function dailyLoginReward(streak: number): number {
  if (streak <= 1) return 5;
  if (streak === 2) return 8;
  if (streak === 3) return 12;
  return 15;
}

/** Returns today's date as "YYYY-MM-DD" in UTC. */
export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Compute the new daily streak given the last login date. */
export function computeDailyStreak(lastLoginDate: string, today: string): number {
  if (!lastLoginDate) return 1;
  const last = new Date(lastLoginDate + "T00:00:00Z");
  const now = new Date(today + "T00:00:00Z");
  const diffMs = now.getTime() - last.getTime();
  const diffDays = Math.round(diffMs / 86_400_000);
  if (diffDays <= 0) return 0; // already claimed today
  if (diffDays === 1) return -1; // consecutive (caller increments)
  return 1; // streak broken, restart at 1
}
