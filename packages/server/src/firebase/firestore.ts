import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "./admin.js";

// Only initialize Firestore Admin if Firebase Admin is configured
let _initialized = false;
function isConfigured(): boolean {
  if (_initialized) return true;
  const auth = getAuth();
  if (!auth) return false;
  try {
    getFirestore();
    _initialized = true;
    return true;
  } catch {
    return false;
  }
}

export function getDb() {
  return isConfigured() ? getFirestore() : null;
}
