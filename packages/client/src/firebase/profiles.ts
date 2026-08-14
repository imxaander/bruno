import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  type FirestoreDataConverter,
} from "firebase/firestore";
import type { PlayerProfile } from "@bruno/shared";
import { db } from "./firestore.js";

const COLLECTION = "profiles";

function profileRef(uid: string) {
  if (!db) return null;
  return doc(db, COLLECTION, uid);
}

/** Fetch a player's profile from Firestore. Returns null if not configured or not found. */
export async function getProfile(uid: string): Promise<PlayerProfile | null> {
  if (!db) return null;
  const ref = profileRef(uid);
  if (!ref) return null;
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as PlayerProfile) : null;
}

/** Create or overwrite a player's profile. */
export async function saveProfile(profile: PlayerProfile): Promise<void> {
  if (!db) return;
  const ref = profileRef(profile.uid);
  if (!ref) return;
  await setDoc(ref, { ...profile, updatedAt: Date.now() });
}

/** Create a default profile for a new user. */
export function createDefaultProfile(uid: string, username: string): PlayerProfile {
  const now = Date.now();
  return {
    uid,
    username,
    icon: "🎮",
    wins: 0,
    points: 0,
    gamesPlayed: 0,
    vaultCardsUsed: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/** Update only the editable fields (username, icon). */
export async function updateProfileFields(
  uid: string,
  fields: { username?: string; icon?: string },
): Promise<void> {
  if (!db || Object.keys(fields).length === 0) return;
  const ref = profileRef(uid);
  if (!ref) return;
  await updateDoc(ref, { ...fields, updatedAt: Date.now() });
}

/** Add points, wins, gamesPlayed, and vaultCardsUsed after a game ends. */
export async function addGameStats(
  uid: string,
  delta: {
    pointsDelta?: number;
    won?: boolean;
    vaultCardsUsed?: number;
  },
): Promise<{ newPoints: number; newTier: string } | null> {
  if (!db) return null;
  const ref = profileRef(uid);
  if (!ref) return null;

  const snap = await getDoc(ref);
  const profile = snap.exists() ? (snap.data() as PlayerProfile) : null;
  if (!profile) return null;

  const newPoints = Math.max(0, profile.points + (delta.pointsDelta ?? 0));
  const updates: Record<string, number> = {
    points: newPoints,
    gamesPlayed: profile.gamesPlayed + 1,
    updatedAt: Date.now(),
  };
  if (delta.won) {
    updates.wins = profile.wins + 1;
  }
  if (delta.vaultCardsUsed) {
    updates.vaultCardsUsed = profile.vaultCardsUsed + delta.vaultCardsUsed;
  }

  await updateDoc(ref, updates);

  // Compute tier client-side for the return value
  const { getRankTier } = await import("@bruno/shared");
  return { newPoints, newTier: getRankTier(newPoints).name };
}
