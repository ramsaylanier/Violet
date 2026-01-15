/**
 * Auth API routes
 */

import express from "express";
import {
  verifyIdToken,
  getUserProfile,
  createUserProfile,
  updateUserProfile
} from "@/server/services/authService";
import {
  SESSION_COOKIE_NAME,
  COOKIE_MAX_AGE,
  setCookie
} from "@/server/lib/cookies";

const router = express.Router();

/**
 * Helper function to get the current user ID from the session cookie or Authorization header
 * Returns null if token is expired or invalid
 */
async function getUserIdFromRequest(
  req: express.Request
): Promise<string | null> {
  // Try Authorization header first (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const idToken = authHeader.substring(7);
    try {
      const userId = await verifyIdToken(idToken);
      return userId;
    } catch (error) {
      // Log token expiration for debugging, but don't expose details
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("expired")) {
        console.debug("Token expired in Authorization header");
      }
      return null;
    }
  }

  // Fall back to cookie
  const idToken = req.cookies[SESSION_COOKIE_NAME];
  if (!idToken) {
    return null;
  }

  try {
    return await verifyIdToken(idToken);
  } catch (error) {
    // Log token expiration for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("expired")) {
      console.debug("Token expired in session cookie");
    }
    return null;
  }
}

/**
 * Helper function to require authentication
 * Throws "Unauthorized" error if token is missing, expired, or invalid
 */
export async function getRequireAuth(req: express.Request): Promise<string> {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    // Check if we have a token that might be expired
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies[SESSION_COOKIE_NAME];
    if (authHeader || cookieToken) {
      // Token exists but is invalid/expired
      throw new Error("Token expired or invalid");
    }
    throw new Error("Unauthorized");
  }
  return userId;
}

/**
 * POST /api/auth/session
 * Create a session cookie from a Firebase ID token
 */
router.post("/session", async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: "ID token is required" });
    }

    // Verify the token and get user ID
    const userId = await verifyIdToken(idToken);

    // Get or create user profile
    let user = await getUserProfile(userId);
    if (!user) {
      user = await createUserProfile(userId, "", "");
    }

    // Set session cookie with the ID token
    const cookieValue = setCookie(SESSION_COOKIE_NAME, idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE
    });

    res.setHeader("Set-Cookie", cookieValue);
    res.json(user);
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * GET /api/auth/user
 * Get the current user from the session cookie or Authorization header
 */
router.get("/user", async (req, res) => {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.json(null);
    }

    const user = await getUserProfile(userId);

    if (!user) {
      const newUser = await createUserProfile(userId, "", "");
      return res.json(newUser);
    }

    return res.json(user);
  } catch (error) {
    console.error("Error getting user:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * POST /api/auth/update
 * Update the current user profile
 */
router.post("/update", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const data = req.body as { name?: string; githubToken?: string };

    await updateUserProfile(userId, data);

    const updatedUser = await getUserProfile(userId);
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(updatedUser);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error updating user:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout and clear the session cookie
 */
router.post("/logout", async (req, res) => {
  try {
    res.clearCookie(SESSION_COOKIE_NAME);
    res.json({ success: true });
  } catch (error) {
    console.error("Error logging out:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

export { router as authRoutes };
