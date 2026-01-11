import admin from "firebase-admin";

import serviceAccount from "../../.firebase-key.json";
import type { ServiceAccount } from "firebase-admin";

if (!admin.apps.length) {
  // For emulator, use a simple credential
  // For production, use service account
  const isEmulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;

  console.log("🔥 isEmulator", isEmulator);

  if (isEmulator) {
    // Ensure emulator host format is correct (no http:// prefix)
    const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST?.replace(
      /^https?:\/\//,
      ""
    );
    process.env.FIREBASE_AUTH_EMULATOR_HOST = emulatorHost;

    const projectId = process.env.FIREBASE_PROJECT_ID || "demo-timelines";
    console.log(
      `🔥 Initializing Firebase Admin for emulator with project: ${projectId}, host: ${emulatorHost}`
    );

    admin.initializeApp({
      projectId,
    });
  } else {
    console.log(
      `🔥 Initializing Firebase Admin for production with service account`
    );
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as ServiceAccount),
    });
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
