import { createServerFn } from "@tanstack/react-start";
import {
  getCookie,
  setCookie,
  deleteCookie,
} from "@tanstack/react-start/server";
import {
  verifyIdToken,
  getUserProfile,
  createUserProfile,
  updateUserProfile,
} from "@/services/authService";
import type { User } from "@/types";

const SESSION_COOKIE_NAME = "auth_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Helper function to get the current user ID from the session cookie
 * Use this in server functions that need authentication
 */
export async function getUserIdFromCookie(): Promise<string | null> {
  const idToken = getCookie(SESSION_COOKIE_NAME);
  if (!idToken) {
    return null;
  }

  try {
    return await verifyIdToken(idToken);
  } catch {
    return null;
  }
}

/**
 * Helper function to require authentication in server functions
 * Throws an error if the user is not authenticated
 */
export async function requireAuth(): Promise<string> {
  const userId = await getUserIdFromCookie();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

/**
 * Create a session cookie from a Firebase ID token
 */
export const createSession = createServerFn({
  method: "POST",
}).handler(async (ctx) => {
  const { idToken } = ctx.data as any as { idToken: string };

  if (!idToken) {
    throw new Error("ID token is required");
  }

  // Verify the token and get user ID
  const userId = await verifyIdToken(idToken);

  // Get or create user profile
  let user = await getUserProfile(userId);
  if (!user) {
    user = await createUserProfile(userId, "", "");
  }

  // Set session cookie with the ID token
  // In production, you might want to create a custom session token instead
  setCookie(SESSION_COOKIE_NAME, idToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  return user;
});

/**
 * Get the current user from the session cookie
 */
export const getCurrentUser = createServerFn({
  method: "GET",
}).handler(async () => {
  console.log("getCurrentUser");
  const idToken = getCookie(SESSION_COOKIE_NAME);
  console.log(idToken);
  if (!idToken) {
    return null;
  }

  try {
    const userId = await verifyIdToken(idToken);
    const user = await getUserProfile(userId);

    if (!user) {
      return await createUserProfile(userId, "", "");
    }

    return user;
  } catch (error) {
    // Token is invalid, clear the cookie
    deleteCookie(SESSION_COOKIE_NAME);
    return null;
  }
});

/**
 * Update the current user profile
 */
export const updateCurrentUser = createServerFn({
  method: "POST",
}).handler(async (ctx) => {
  const idToken = getCookie(SESSION_COOKIE_NAME);
  if (!idToken) {
    throw new Error("Unauthorized");
  }

  const userId = await verifyIdToken(idToken);
  const data = ctx.data as any as { name?: string; githubToken?: string };

  await updateUserProfile(userId, data);

  const updatedUser = await getUserProfile(userId);
  if (!updatedUser) {
    throw new Error("User not found");
  }

  return updatedUser;
});

/**
 * Logout and clear the session cookie
 */
export const logout = createServerFn({
  method: "POST",
}).handler(async () => {
  deleteCookie(SESSION_COOKIE_NAME);
  return { success: true };
});
