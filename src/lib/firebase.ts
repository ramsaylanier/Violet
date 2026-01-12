import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const env = import.meta.env || process.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || env.FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID,
  storageBucket:
    env.VITE_FIREBASE_STORAGE_BUCKET || env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID || env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);

if (env.MODE === "development") {
  console.log("🔥 Connecting to Firebase Auth Emulator...");
  // Check if we should use the emulator
  const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";

  console.log("🔥 useEmulator", useEmulator);

  if (useEmulator) {
    console.log("🔥 Connecting to Firebase Auth Emulator...");
    connectAuthEmulator(auth, "http://localhost:9099", {
      disableWarnings: true
    });
  }
}

export { auth, storage };
