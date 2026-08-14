import { getFirestore } from "firebase/firestore";
import { auth } from "./client.js";

// Only initialize Firestore if Firebase app exists
export const db = auth ? getFirestore() : null;
