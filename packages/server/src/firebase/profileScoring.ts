import type { PointChange } from "@bruno/shared";
import { calculatePointChanges, getRankTier } from "@bruno/shared";
import { getDb } from "./firestore.js";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Update all authenticated players' profiles after a game ends.
 * Guests (uid === null) are skipped.
 *
 * Reads each player's current points from Firestore so the new total is
 * accumulated (not clobbered), then returns the resolved point changes.
 */
export async function applyGameEndScores(
  players: {
    uid: string | null;
    isWinner: boolean;
    cardsRemaining: number;
    vaultCardsUsed: number;
    currentPoints: number;
  }[],
): Promise<PointChange[]> {
  const changes = calculatePointChanges(players);
  const db = getDb();
  if (!db || changes.length === 0) return changes;

  const winnerUid = players.find((p) => p.isWinner && p.uid)?.uid ?? null;

  const refs = changes.map((change) => db.collection("profiles").doc(change.uid));
  const snapshots = await Promise.all(refs.map((ref) => ref.get()));
  const batch = db.batch();
  const updated: PointChange[] = [];

  for (let i = 0; i < changes.length; i++) {
    const change = changes[i]!;
    const snap = snapshots[i] ?? null;
    const oldPoints = Math.max(0, snap?.exists ? (snap.data()?.points as number) || 0 : 0);
    const newPoints = Math.max(0, oldPoints + change.delta);
    const data: Record<string, unknown> = {
      points: newPoints,
      gamesPlayed: FieldValue.increment(1),
      updatedAt: Date.now(),
    };
    if (change.uid === winnerUid) {
      data.wins = FieldValue.increment(1);
    }
    batch.set(refs[i]!, data, { merge: true });
    updated.push({
      uid: change.uid,
      delta: change.delta,
      oldPoints,
      newPoints,
      oldTier: getRankTier(oldPoints).name,
      newTier: getRankTier(newPoints).name,
    });
  }

  await batch.commit();
  return updated;
}
