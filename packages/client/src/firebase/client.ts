import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  linkWithPopup,
  onAuthStateChanged,
  onIdTokenChanged,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Only initialize if config is present (graceful degradation)
const app: FirebaseApp | null = firebaseConfig.apiKey ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const googleProvider = app ? new GoogleAuthProvider() : null;

export async function signInGoogle(): Promise<User | null> {
  if (!auth || !googleProvider) return null;
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signInGuest(): Promise<User | null> {
  if (!auth) return null;
  const result = await signInAnonymously(auth);
  return result.user;
}

export async function signOut(): Promise<void> {
  if (!auth) return;
  await firebaseSignOut(auth);
}

export async function upgradeGuestToGoogle(): Promise<User | null> {
  if (!auth || !googleProvider) return null;
  const current = auth.currentUser;
  if (!current) return null;
  const result = await linkWithPopup(current, googleProvider);
  return result.user;
}

export function onAuthChange(cb: (user: User | null) => void): () => void {
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

/** Fires on sign-in, sign-out, and ID token refresh — ideal for re-verifying the socket. */
export function onIdToken(cb: (user: User | null) => void): () => void {
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onIdTokenChanged(auth, cb);
}
