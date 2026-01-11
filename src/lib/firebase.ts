import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);

if (import.meta.env.MODE === "development") {
  console.log("🔥 Connecting to Firebase Auth Emulator...");
  // Check if we should use the emulator
  const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";

  console.log("🔥 useEmulator", useEmulator);

  if (useEmulator) {
    console.log("🔥 Connecting to Firebase Auth Emulator...");
    connectAuthEmulator(auth, "http://localhost:9099", {
      disableWarnings: true,
    });
  }
}

export { auth, storage };
