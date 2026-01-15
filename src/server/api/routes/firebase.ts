/**
 * Firebase API routes
 */

import express from "express";
import { getRequireAuth } from "./auth.js";
import { adminDb } from "@/server/lib/firebase-admin";
import {
  initializeFirestore,
  setupStorage,
  setupHosting,
  createFirestoreCollection,
  verifyFirebaseProject,
  getFirebaseProjectMetadata
} from "@/server/services/firebaseService";
import {
  downloadGitHubTarball,
  downloadGitLabTarball,
  extractTarball,
  detectProjectType,
  buildProject,
  deployToFirebaseHosting,
  getDeploymentStatus,
  listHostingSites,
  listFirebaseDomains,
  addFirebaseDomain,
  getFirebaseDomainDNSRecords
} from "@/server/services/firebaseHostingService";
import { getUserProfile, updateUserProfile } from "@/server/services/authService";
import { tmpdir } from "os";
import * as path from "path";
import * as fs from "fs/promises";

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
      error: error instanceof Error ? error.message : "Internal server error"
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
      error: error instanceof Error ? error.message : "Internal server error"
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
      error: error instanceof Error ? error.message : "Internal server error"
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
      error: error instanceof Error ? error.message : "Internal server error"
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
      error: error instanceof Error ? error.message : "Internal server error"
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
      error: error instanceof Error ? error.message : "Internal server error"
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
      maxAge: 600000 // 10 minutes
    });

    const redirectUri =
      process.env.GOOGLE_OAUTH_CALLBACK_URL ||
      `${req.protocol}://${req.get("host")}/api/firebase/oauth/callback`;

    // OAuth scopes for Firebase Management API and Hosting
    // https://www.googleapis.com/auth/firebase - Full access to Firebase (required for deployments)
    // https://www.googleapis.com/auth/cloud-platform - Full access to Google Cloud Platform (required for deployments)
    const scope = encodeURIComponent(
      "https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform"
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
      error: error instanceof Error ? error.message : "Internal server error"
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
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
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
      googleToken: FieldValue.delete()
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error disconnecting Google account:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
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
        needsAuth: true
      });
    }

    const { listFirebaseProjects } = await import("@/server/services/firebaseService");
    const projects = await listFirebaseProjects(userProfile.googleToken);

    res.json(projects);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error listing Firebase projects:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * GET /api/firebase/sites/:firebaseProjectId
 * List hosting sites for a Firebase project
 */
router.get("/sites/:firebaseProjectId", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const { firebaseProjectId } = req.params;

    const userProfile = await getUserProfile(userId);

    if (!userProfile || !userProfile.googleToken) {
      return res.status(401).json({
        error: "Google account not connected",
        needsAuth: true
      });
    }

    const sites = await listHostingSites(
      userProfile.googleToken,
      firebaseProjectId
    );

    res.json(sites);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error listing hosting sites:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * POST /api/firebase/deploy
 * Deploy a repository to Firebase Hosting
 */
router.post("/deploy", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const { repository, firebaseProjectId, siteId } = req.body as {
      projectId: string;
      repository: {
        owner: string;
        name: string;
        branch?: string;
        provider: "github" | "gitlab";
      };
      firebaseProjectId: string;
      siteId?: string;
    };

    const userProfile = await getUserProfile(userId);

    if (!userProfile || !userProfile.googleToken) {
      return res.status(401).json({
        error: "Google account not connected",
        needsAuth: true
      });
    }

    // Default siteId to firebaseProjectId if not provided
    const hostingSiteId = siteId || firebaseProjectId;

    let deployment;
    let tarballPath: string | null = null;
    let extractPath: string | null = null;

    if (repository.provider === "github") {
      // Use tarball download + API deployment (same as GitLab)
      // Note: Firebase's "native" GitHub integration uses GitHub Actions
      // which requires setup in the repo. For API-based deployment, we use tarball.
      if (!userProfile.githubToken) {
        return res.status(400).json({
          error: "GitHub account not connected"
        });
      }

      // Download and extract tarball
      tarballPath = await downloadGitHubTarball(
        userProfile.githubToken,
        repository.owner,
        repository.name,
        repository.branch || "main"
      );

      extractPath = path.join(
        tmpdir(),
        `github-extract-${Date.now()}-${Math.random().toString(36).substring(7)}`
      );

      try {
        await extractTarball(tarballPath, extractPath);

        // Detect project type
        const projectType = await detectProjectType(extractPath);

        // Build if needed
        const buildDir = await buildProject(extractPath, projectType);

        // Deploy to Firebase Hosting
        deployment = await deployToFirebaseHosting(
          userProfile.googleToken,
          firebaseProjectId,
          hostingSiteId,
          buildDir
        );

        deployment.repository = {
          owner: repository.owner,
          name: repository.name,
          branch: repository.branch || "main",
          provider: "github"
        };

        // Clean up temporary directory after successful deployment
        if (extractPath) {
          await fs
            .rm(extractPath, { recursive: true, force: true })
            .catch((cleanupError) => {
              console.warn(
                "Failed to cleanup extract directory:",
                cleanupError
              );
              // Don't throw - deployment was successful
            });
        }
      } catch (error) {
        // Clean up on error - ensure we try to remove both extract path and tarball
        await Promise.all([
          extractPath
            ? fs
                .rm(extractPath, { recursive: true, force: true })
                .catch(() => {})
            : Promise.resolve(),
          tarballPath
            ? fs.unlink(tarballPath).catch(() => {})
            : Promise.resolve()
        ]);
        throw error;
      }
    } else if (repository.provider === "gitlab") {
      // Use tarball download + API deployment
      // Note: GitLab token would need to be added to User type
      // For now, we'll return an error if not available
      const gitlabToken = (userProfile as any).gitlabToken;
      if (!gitlabToken) {
        return res.status(400).json({
          error: "GitLab account not connected"
        });
      }

      // Download and extract tarball
      tarballPath = await downloadGitLabTarball(
        gitlabToken,
        repository.owner,
        repository.name,
        repository.branch || "main"
      );

      extractPath = path.join(
        tmpdir(),
        `gitlab-extract-${Date.now()}-${Math.random().toString(36).substring(7)}`
      );

      try {
        await extractTarball(tarballPath, extractPath);

        // Detect project type
        const projectType = await detectProjectType(extractPath);

        // Build if needed
        const buildDir = await buildProject(extractPath, projectType);

        // Deploy to Firebase Hosting
        deployment = await deployToFirebaseHosting(
          userProfile.googleToken,
          firebaseProjectId,
          hostingSiteId,
          buildDir
        );

        deployment.repository = {
          owner: repository.owner,
          name: repository.name,
          branch: repository.branch || "main",
          provider: "gitlab"
        };

        // Clean up temporary directory after successful deployment
        if (extractPath) {
          await fs
            .rm(extractPath, { recursive: true, force: true })
            .catch((cleanupError) => {
              console.warn(
                "Failed to cleanup extract directory:",
                cleanupError
              );
              // Don't throw - deployment was successful
            });
        }
      } catch (error) {
        // Clean up on error - ensure we try to remove both extract path and tarball
        await Promise.all([
          extractPath
            ? fs
                .rm(extractPath, { recursive: true, force: true })
                .catch(() => {})
            : Promise.resolve(),
          tarballPath
            ? fs.unlink(tarballPath).catch(() => {})
            : Promise.resolve()
        ]);
        throw error;
      }
    } else {
      return res.status(400).json({
        error: "Unsupported repository provider"
      });
    }

    res.json(deployment);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error deploying to Firebase Hosting:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * GET /api/firebase/deployments/:deploymentId/status
 * Get deployment status
 */
router.get("/deployments/:deploymentId/status", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const { deploymentId } = req.params;
    const { firebaseProjectId, siteId } = req.query as {
      firebaseProjectId: string;
      siteId: string;
    };

    if (!firebaseProjectId || !siteId) {
      return res.status(400).json({
        error: "firebaseProjectId and siteId are required"
      });
    }

    const userProfile = await getUserProfile(userId);

    if (!userProfile || !userProfile.googleToken) {
      return res.status(401).json({
        error: "Google account not connected",
        needsAuth: true
      });
    }

    const deployment = await getDeploymentStatus(
      userProfile.googleToken,
      firebaseProjectId,
      siteId,
      deploymentId
    );

    res.json(deployment);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error getting deployment status:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * GET /api/firebase/sites/:siteId/domains
 * List custom domains for a Firebase Hosting site
 */
router.get("/sites/:siteId/domains", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const { siteId } = req.params;
    const { projectId } = req.query as { projectId?: string };

    if (!projectId) {
      return res
        .status(400)
        .json({ error: "projectId query parameter is required" });
    }

    const userProfile = await getUserProfile(userId);

    if (!userProfile || !userProfile.googleToken) {
      return res.status(401).json({
        error: "Google account not connected",
        needsAuth: true
      });
    }

    const domains = await listFirebaseDomains(
      userProfile.googleToken,
      projectId,
      siteId
    );

    res.json(domains);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error listing Firebase domains:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * POST /api/firebase/sites/:siteId/domains
 * Add a custom domain to a Firebase Hosting site
 */
router.post("/sites/:siteId/domains", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const { siteId } = req.params;
    const { domain, projectId } = req.body as {
      domain: string;
      projectId: string;
    };

    if (!domain) {
      return res.status(400).json({ error: "Domain is required" });
    }

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    const userProfile = await getUserProfile(userId);

    if (!userProfile || !userProfile.googleToken) {
      return res.status(401).json({
        error: "Google account not connected",
        needsAuth: true
      });
    }

    const result = await addFirebaseDomain(
      userProfile.googleToken,
      projectId,
      siteId,
      domain
    );

    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error adding Firebase domain:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * GET /api/firebase/sites/:siteId/domains/:domain/dns-records
 * Get DNS records required for a Firebase Hosting custom domain
 */
router.get("/sites/:siteId/domains/:domain/dns-records", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const { siteId, domain } = req.params;
    const { projectId } = req.query as { projectId?: string };

    if (!projectId) {
      return res
        .status(400)
        .json({ error: "projectId query parameter is required" });
    }

    const userProfile = await getUserProfile(userId);

    if (!userProfile || !userProfile.googleToken) {
      return res.status(401).json({
        error: "Google account not connected",
        needsAuth: true
      });
    }

    const dnsRecords = await getFirebaseDomainDNSRecords(
      userProfile.googleToken,
      projectId,
      siteId,
      domain
    );

    res.json(dnsRecords);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error getting Firebase domain DNS records:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

export { router as firebaseRoutes };
