import type { PointChange } from "@bruno/shared";
import { calculatePointChanges } from "@bruno/shared";
import { getDb } from "./firestore.js";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Update all authenticated players' profiles after a game ends.
 * Guests (uid === null) are skipped.
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

  const batch = db.batch();
  for (const change of changes) {
    const ref = db.collection("profiles").doc(change.uid);
    const data: Record<string, unknown> = {
      points: change.newPoints,
      gamesPlayed: FieldValue.increment(1),
      updatedAt: Date.now(),
    };
    if (change.delta > 0) {
      data.wins = FieldValue.increment(1);
    }
    batch.set(ref, data, { merge: true });
  }
  await batch.commit();
  return changes;
}
