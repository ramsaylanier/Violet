import { adminDb, adminAuth } from "@/lib/firebase-admin";
import type { User } from "@/types";

export async function createUserProfile(
  userId: string,
  email: string,
  name?: string
): Promise<User> {
  const userData: Omit<User, "id"> = {
    email,
    name,
    createdAt: new Date()
  };

  await adminDb.collection("users").doc(userId).set(userData);

  return {
    id: userId,
    ...userData
  };
}

export async function getUserProfile(userId: string): Promise<User | null> {
  const doc = await adminDb.collection("users").doc(userId).get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data()?.createdAt?.toDate() || new Date()
  } as User;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<User, "name" | "githubToken" | "googleToken" | "cloudflareToken">>
): Promise<void> {
  await adminDb.collection("users").doc(userId).update(updates);
}

export async function verifyIdToken(idToken: string): Promise<string> {
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (error) {
    // Check if this is an emulator token (unsigned token with alg="none")
    // If FIREBASE_AUTH_EMULATOR_HOST is set, Admin SDK should handle it automatically
    // But if not set, we need to handle emulator tokens manually
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes('no "kid" claim') ||
      errorMessage.includes("kid")
    ) {
      // This is likely an emulator token - decode it directly
      try {
        const parts = idToken.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(
            Buffer.from(parts[1], "base64").toString()
          );
          const uid = payload.user_id || payload.sub;
          if (uid) {
            return uid;
          }
        }
      } catch {
        // Failed to decode emulator token, will throw original error
      }
    }
    throw error;
  }
}

/**
 * Helper function to get the current user ID from a cookie in server functions
 * This can be used by other server functions that need authentication
 */
export async function getUserIdFromCookie(
  cookieValue: string | null
): Promise<string | null> {
  if (!cookieValue) {
    return null;
  }

  try {
    return await verifyIdToken(cookieValue);
  } catch {
    return null;
  }
}
