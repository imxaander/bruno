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
  signInGoogle: () => Promise<void>;
  signInGuest: () => Promise<void>;
  firebaseSignOut: () => Promise<void>;
  upgradeGuest: () => Promise<void>;
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

  const loadOrCreateProfile = useCallback(async (u: User) => {
    let prof = await getProfile(u.uid);
    if (!prof) {
      prof = createDefaultProfile(u.uid, computeDisplayName(u));
      // Save it to Firestore (non-blocking — don't await on render)
      import("./profiles.js").then((m) => m.saveProfile(prof!));
    }
    setProfile(prof);
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
      signInGoogle: handleSignInGoogle,
      signInGuest: handleSignInGuest,
      firebaseSignOut: handleSignOut,
      upgradeGuest: handleUpgradeGuest,
      available: isAvailable,
    };
  }, [user, loading, profile, handleSignInGoogle, handleSignInGuest, handleSignOut, handleUpgradeGuest]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
