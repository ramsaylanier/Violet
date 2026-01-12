import admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if we should use emulators
const useEmulators =
  process.env.USE_EMULATORS === "true" || process.argv.includes("--emulators");

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  if (useEmulators) {
    // For emulators, initialize without credentials
    process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";

    admin.initializeApp({
      projectId: "violet-project-management"
    });
    console.log("Using Firebase Emulators");
  } else {
    // For production, use service account
    const serviceAccountPath = path.join(__dirname, "..", ".firebase-key.json");
    const serviceAccount = JSON.parse(
      fs.readFileSync(serviceAccountPath, "utf8")
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Using Production Firebase");
  }
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();

async function seedTestUser() {
  try {
    const testEmail = "ramsay@ramsay.com";
    const testPassword = "ramsay";
    const testName = "Ramsay ";

    console.log("Creating test user...");

    // Check if user already exists in Auth
    let user;
    try {
      user = await adminAuth.getUserByEmail(testEmail);
      console.log(
        `User with email ${testEmail} already exists in Auth (UID: ${user.uid})`
      );
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        // Create new Firebase Auth user
        user = await adminAuth.createUser({
          email: testEmail,
          password: testPassword,
          displayName: testName,
          emailVerified: true
        });
        console.log(`✓ Created Firebase Auth user: ${user.uid}`);
      } else {
        throw error;
      }
    }

    // Check if user profile already exists in Firestore
    const userDoc = await adminDb.collection("users").doc(user.uid).get();

    if (userDoc.exists) {
      console.log(`User profile already exists in Firestore`);
      const existingData = userDoc.data();
      console.log("Existing user data:", {
        id: user.uid,
        email: existingData?.email,
        name: existingData?.name,
        createdAt: existingData?.createdAt?.toDate()
      });
    } else {
      // Create user profile in Firestore
      const userData = {
        email: testEmail,
        name: testName,
        createdAt: admin.firestore.Timestamp.now()
      };

      await adminDb.collection("users").doc(user.uid).set(userData);
      console.log(`✓ Created user profile in Firestore`);
    }

    console.log("\n✓ Seeding complete!");
    console.log("\nTest user credentials:");
    console.log(`  Email: ${testEmail}`);
    console.log(`  Password: ${testPassword}`);
    console.log(`  UID: ${user.uid}`);
    console.log(`\nYou can now log in with these credentials.`);

    process.exit(0);
  } catch (error) {
    console.error("Error seeding test user:", error);
    process.exit(1);
  }
}

seedTestUser();
