import admin from "firebase-admin";

let initialized = false;

export function getAuth(): admin.auth.Auth | null {
  if (!initialized) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
      initialized = true;
    }
    // If no env vars, skip — game works without Firebase
  }
  return initialized ? admin.auth() : null;
}
