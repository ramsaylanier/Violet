/**
 * Firebase API routes
 */

import express from "express";
import { getRequireAuth } from "./auth.js";
import { adminDb } from "@/lib/firebase-admin";
import {
  initializeFirestore,
  setupStorage,
  setupHosting,
  createFirestoreCollection,
  verifyFirebaseProject,
  getFirebaseProjectMetadata,
} from "@/services/firebaseService";
import { getUserProfile, updateUserProfile } from "@/services/authService";

const router = express.Router();

/**
 * POST /api/firebase/initialize-firestore
 * Initialize Firestore database
 */
router.post("/initialize-firestore", async (req, res) => {
  try {
    await getRequireAuth(req);
    const { projectId, databaseId, location } = req.body as {
      projectId: string;
      databaseId?: string;
      location?: string;
    };

    const result = await initializeFirestore(projectId, databaseId, location);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error initializing Firestore:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/firebase/setup-storage
 * Setup Firebase Storage
 */
router.post("/setup-storage", async (req, res) => {
  try {
    await getRequireAuth(req);
    const { projectId } = req.body as { projectId: string };

    const result = await setupStorage(projectId);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error setting up Storage:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/firebase/setup-hosting
 * Setup Firebase Hosting
 */
router.post("/setup-hosting", async (req, res) => {
  try {
    await getRequireAuth(req);
    const { projectId } = req.body as { projectId: string };

    const result = await setupHosting(projectId);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error setting up Hosting:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/firebase/create-firestore-collection
 * Create a Firestore collection
 */
router.post("/create-firestore-collection", async (req, res) => {
  try {
    await getRequireAuth(req);
    const { projectId, collectionId, initialData } = req.body as {
      projectId: string;
      collectionId: string;
      initialData?: Record<string, unknown>;
    };

    const result = await createFirestoreCollection(
      projectId,
      collectionId,
      initialData
    );
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error creating Firestore collection:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/firebase/projects/:projectId
 * Get Firebase project information
 */
router.get("/projects/:projectId", async (req, res) => {
  try {
    await getRequireAuth(req);
    const { projectId } = req.params;

    const metadata = await getFirebaseProjectMetadata(projectId);

    if (!metadata) {
      return res
        .status(404)
        .json({ error: "Firebase project not found or invalid" });
    }

    res.json(metadata);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error getting Firebase project:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/firebase/projects/:projectId/verify
 * Verify that a Firebase project exists and is valid
 */
router.post("/projects/:projectId/verify", async (req, res) => {
  try {
    await getRequireAuth(req);
    const { projectId } = req.params;

    const result = await verifyFirebaseProject(projectId);

    if (!result.valid) {
      return res
        .status(400)
        .json({ error: result.error || "Invalid Firebase project ID" });
    }

    res.json({ valid: true, projectId });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error verifying Firebase project:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/firebase/oauth/authorize
 * Initiate Google OAuth flow for Firebase Management API
 */
router.get("/oauth/authorize", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      return res.status(500).json({ error: "Google OAuth not configured" });
    }

    // Generate state to prevent CSRF attacks
    const state = Buffer.from(userId).toString("base64");

    // Store state in session/cookie for verification in callback
    res.cookie("google_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600000, // 10 minutes
    });

    const redirectUri =
      process.env.GOOGLE_OAUTH_CALLBACK_URL ||
      `${req.protocol}://${req.get("host")}/api/firebase/oauth/callback`;

    // OAuth scopes for Firebase Management API
    // https://www.googleapis.com/auth/firebase.readonly - Read-only access to Firebase projects
    // https://www.googleapis.com/auth/cloud-platform.read-only - Read-only access to Google Cloud Platform
    const scope = encodeURIComponent(
      "https://www.googleapis.com/auth/firebase.readonly https://www.googleapis.com/auth/cloud-platform.read-only"
    );

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;

    // Return the URL instead of redirecting (client will redirect with proper auth)
    res.json({ url: authUrl });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error initiating Google OAuth:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/firebase/oauth/callback
 * Handle Google OAuth callback
 */
router.get("/oauth/callback", async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Authorization code required" });
    }

    // Verify state to prevent CSRF attacks
    const storedState = req.cookies.google_oauth_state;
    if (!storedState || storedState !== state) {
      res.clearCookie("google_oauth_state");
      return res.status(400).json({ error: "Invalid state parameter" });
    }

    // Decode userId from state
    const userId = Buffer.from(state as string, "base64").toString();

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: "Google OAuth not configured" });
    }

    const redirectUri =
      process.env.GOOGLE_OAUTH_CALLBACK_URL ||
      `${req.protocol}://${req.get("host")}/api/firebase/oauth/callback`;

    // Exchange authorization code for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      throw new Error(
        errorData.error_description ||
          errorData.error ||
          "Failed to exchange authorization code for token"
      );
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error("No access token received");
    }

    // Store the token in user profile
    await updateUserProfile(userId, { googleToken: accessToken });

    // Clear state cookie
    res.clearCookie("google_oauth_state");

    // Redirect to settings page with success message
    const frontendUrl = process.env.FRONTEND_URL || `http://localhost:3000`;
    res.redirect(`${frontendUrl}/settings?google_connected=true`);
  } catch (error) {
    console.error("Error handling Google OAuth callback:", error);
    res.clearCookie("google_oauth_state");
    const frontendUrl = process.env.FRONTEND_URL || `http://localhost:3000`;
    res.redirect(
      `${frontendUrl}/settings?google_error=${encodeURIComponent(error instanceof Error ? error.message : "Failed to connect Google")}`
    );
  }
});

/**
 * POST /api/firebase/oauth/disconnect
 * Disconnect Google account
 */
router.post("/oauth/disconnect", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);

    // Remove the token from user profile using FieldValue.delete()
    const { FieldValue } = await import("firebase-admin/firestore");
    await adminDb.collection("users").doc(userId).update({
      googleToken: FieldValue.delete(),
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error disconnecting Google account:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/firebase/projects
 * List Firebase projects for the authenticated user
 */
router.get("/projects", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);

    // Get user profile to retrieve Google OAuth token
    const userProfile = await getUserProfile(userId);

    if (!userProfile || !userProfile.googleToken) {
      return res.status(401).json({
        error: "Google account not connected",
        needsAuth: true,
      });
    }

    const { listFirebaseProjects } = await import("@/services/firebaseService");
    const projects = await listFirebaseProjects(userProfile.googleToken);

    res.json(projects);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error listing Firebase projects:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export { router as firebaseRoutes };
