import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import type { User } from "firebase/auth";
import type { PlayerProfile, RankTier } from "@bruno/shared";
import { getRankTier } from "@bruno/shared";
import {
  auth,
  signInGoogle as sdkSignInGoogle,
  signInGuest as sdkSignInGuest,
  signOut as sdkSignOut,
  upgradeGuestToGoogle,
  onAuthChange,
} from "./client.js";
import { getProfile, createDefaultProfile } from "./profiles.js";

interface AuthContextValue {
  user: User | null;
  guest: boolean;
  loading: boolean;
  displayName: string;
  profile: PlayerProfile | null;
  rank: RankTier | null;
  profileError: string | null;
  signInGoogle: () => Promise<void>;
  signInGuest: () => Promise<void>;
  firebaseSignOut: () => Promise<void>;
  upgradeGuest: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  available: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

function computeDisplayName(user: User): string {
  if (user.displayName) return user.displayName;
  return `Guest-${user.uid.slice(0, 6)}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadOrCreateProfile = useCallback(async (u: User) => {
    try {
      let prof = await getProfile(u.uid);
      if (!prof) {
        prof = createDefaultProfile(u.uid, computeDisplayName(u));
        // Save it to Firestore (non-blocking — don't await on render)
        import("./profiles.js").then((m) => m.saveProfile(prof!));
      }
      setProfile(prof);
      setProfileError(null);
    } catch (err) {
      // Firestore read failed (rules/permissions/offline) — keep profile null so the
      // profile modal shows an explanatory fallback instead of silently doing nothing.
      const reason = err instanceof Error ? err.message : String(err);
      setProfileError(reason);
      console.warn("[profile] failed to load from Firestore:", reason);
    }
  }, []);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthChange((u) => {
      if (u) {
        setUser(u);
        loadOrCreateProfile(u);
        setLoading(false);
      } else {
        sdkSignInGuest()
          .then((u) => {
            if (u) {
              setUser(u);
              loadOrCreateProfile(u);
            }
            setLoading(false);
          })
          .catch(() => {
            setLoading(false);
          });
      }
    });
    return unsubscribe;
  }, [loadOrCreateProfile]);

  const handleSignInGoogle = useCallback(async () => {
    const u = await sdkSignInGoogle();
    if (u) setUser(u);
  }, []);

  const handleSignInGuest = useCallback(async () => {
    const u = await sdkSignInGuest();
    if (u) setUser(u);
  }, []);

  const handleSignOut = useCallback(async () => {
    await sdkSignOut();
    setUser(null);
  }, []);

  const handleUpgradeGuest = useCallback(async () => {
    const u = await upgradeGuestToGoogle();
    if (u) setUser(u);
  }, []);

  const refreshProfile = useCallback(async () => {
    const current = auth?.currentUser;
    if (current) {
      await loadOrCreateProfile(current);
    }
  }, [loadOrCreateProfile]);

  const value = useMemo<AuthContextValue>(() => {
    const isAvailable = auth !== null;
    const rank = profile ? getRankTier(profile.points) : null;
    return {
      user,
      guest: isAvailable ? (user?.isAnonymous ?? true) : true,
      loading,
      displayName: user ? computeDisplayName(user) : "",
      profile,
      rank,
      profileError,
      signInGoogle: handleSignInGoogle,
      signInGuest: handleSignInGuest,
      firebaseSignOut: handleSignOut,
      upgradeGuest: handleUpgradeGuest,
      refreshProfile,
      available: isAvailable,
    };
  }, [
    user,
    loading,
    profile,
    profileError,
    handleSignInGoogle,
    handleSignInGuest,
    handleSignOut,
    handleUpgradeGuest,
    refreshProfile,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
