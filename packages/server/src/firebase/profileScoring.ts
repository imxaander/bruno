import type { PointChange, CoinChange } from "@bruno/shared";
import {
  calculatePointChanges,
  calculateCoins,
  dailyLoginReward,
  todayDateString,
  computeDailyStreak,
  getRankTier,
} from "@bruno/shared";
import { getDb } from "./firestore.js";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Update all authenticated players' profiles after a game ends.
 * Guests (uid === null) are skipped.
 *
 * Reads each player's current points from Firestore so the new total is
 * accumulated (not clobbered), then returns the resolved point + coin changes.
 */
export async function applyGameEndScores(
  players: {
    uid: string | null;
    isWinner: boolean;
    cardsRemaining: number;
    vaultCardsUsed: number;
    currentPoints: number;
  }[],
): Promise<{ points: PointChange[]; coins: CoinChange[] }> {
  const pointChanges = calculatePointChanges(players);
  const coinChanges = calculateCoins(players);
  const db = getDb();
  if (!db || pointChanges.length === 0) {
    return { points: pointChanges, coins: coinChanges };
  }

  const winnerUid = players.find((p) => p.isWinner && p.uid)?.uid ?? null;
  const coinByUid = new Map(coinChanges.map((c) => [c.uid, c]));

  const refs = pointChanges.map((change) => db.collection("profiles").doc(change.uid));
  const snapshots = await Promise.all(refs.map((ref) => ref.get()));
  const batch = db.batch();
  const updatedPoints: PointChange[] = [];

  for (let i = 0; i < pointChanges.length; i++) {
    const change = pointChanges[i]!;
    const snap = snapshots[i] ?? null;
    const oldPoints = Math.max(0, snap?.exists ? (snap.data()?.points as number) || 0 : 0);
    const newPoints = Math.max(0, oldPoints + change.delta);
    const coin = coinByUid.get(change.uid);
    const oldCoins = Math.max(0, snap?.exists ? (snap.data()?.coins as number) || 0 : 0);
    const newCoins = oldCoins + (coin?.total ?? 0);
    const data: Record<string, unknown> = {
      points: newPoints,
      coins: newCoins,
      gamesPlayed: FieldValue.increment(1),
      updatedAt: Date.now(),
    };
    if (change.uid === winnerUid) {
      data.wins = FieldValue.increment(1);
    }
    batch.set(refs[i]!, data, { merge: true });
    updatedPoints.push({
      uid: change.uid,
      delta: change.delta,
      oldPoints,
      newPoints,
      oldTier: getRankTier(oldPoints).name,
      newTier: getRankTier(newPoints).name,
    });
  }

  await batch.commit();
  return { points: updatedPoints, coins: coinChanges };
}

/**
 * Process daily login streak and return the reward amount.
 * Returns 0 if already claimed today.
 */
export async function processDailyLogin(uid: string): Promise<{ reward: number; streak: number }> {
  const db = getDb();
  if (!db) return { reward: 0, streak: 0 };

  const ref = db.collection("profiles").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return { reward: 0, streak: 0 };

  const data = snap.data()!;
  const lastLoginDate = (
    typeof data.lastLoginDate === "string" ? data.lastLoginDate : ""
  ) as string;
  const currentStreak = (typeof data.dailyStreak === "number" ? data.dailyStreak : 0) as number;
  const today = todayDateString();

  if (lastLoginDate === today) {
    return { reward: 0, streak: currentStreak };
  }

  const streakResult = computeDailyStreak(lastLoginDate, today);
  let newStreak: number;
  if (streakResult === 0) {
    return { reward: 0, streak: currentStreak };
  } else if (streakResult === -1) {
    newStreak = currentStreak + 1;
  } else {
    newStreak = streakResult;
  }

  const reward = dailyLoginReward(newStreak);
  await ref.set(
    {
      dailyStreak: newStreak,
      lastLoginDate: today,
      coins: FieldValue.increment(reward),
      updatedAt: Date.now(),
    },
    { merge: true },
  );

  return { reward, streak: newStreak };
}
