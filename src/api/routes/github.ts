/**
 * GitHub API routes
 */

import express from "express";
import {
  createRepository,
  listRepositories,
  deleteRepository,
  createIssue,
  listIssues,
  listWorkflows,
  listBranches,
  createPullRequest,
} from "@/services/githubService";
import { getRequireAuth } from "./auth.js";
import { getUserProfile, updateUserProfile } from "@/services/authService";
import type { GitHubRepository, GitHubIssue } from "@/types";

const router = express.Router();

/**
 * GET /api/github/oauth/authorize
 * Initiate GitHub OAuth flow
 */
router.get("/oauth/authorize", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const clientId = process.env.GITHUB_CLIENT_ID;
    console.log({ clientId });

    if (!clientId) {
      return res.status(500).json({ error: "GitHub OAuth not configured" });
    }

    // Generate state to prevent CSRF attacks
    const state = Buffer.from(userId).toString("base64");

    // Store state in session/cookie for verification in callback
    res.cookie("github_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600000, // 10 minutes
    });

    const redirectUri =
      process.env.GITHUB_OAUTH_CALLBACK_URL ||
      `${req.protocol}://${req.get("host")}/api/github/oauth/callback`;

    // OAuth scopes - space-separated list of permissions to request
    // Available scopes: https://docs.github.com/en/developers/apps/scopes-for-oauth-apps
    // Common scopes:
    //   - repo: Full access to public and private repositories (includes read/write)
    //   - user:email: Read access to user's email addresses
    //   - public_repo: Access to public repositories only (read/write)
    //   - admin:repo_hook: Full control of repository hooks
    //   - write:packages: Upload packages to GitHub Package Registry
    //   - read:packages: Download packages from GitHub Package Registry
    //   - delete:packages: Delete packages from GitHub Package Registry
    //   - admin:org: Full control of orgs and teams
    //   - gist: Create gists
    //   - notifications: Access notifications
    const scope = "repo,user:email,delete_repo,admin:org,notifications";

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;

    // Return the URL instead of redirecting (client will redirect with proper auth)
    res.json({ url: authUrl });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error initiating GitHub OAuth:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/github/oauth/callback
 * Handle GitHub OAuth callback
 */
router.get("/oauth/callback", async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Authorization code required" });
    }

    // Verify state to prevent CSRF attacks
    const storedState = req.cookies.github_oauth_state;
    if (!storedState || storedState !== state) {
      res.clearCookie("github_oauth_state");
      return res.status(400).json({ error: "Invalid state parameter" });
    }

    // Decode userId from state
    const userId = Buffer.from(state as string, "base64").toString();

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: "GitHub OAuth not configured" });
    }

    const redirectUri =
      process.env.GITHUB_OAUTH_CALLBACK_URL ||
      `${req.protocol}://${req.get("host")}/api/github/oauth/callback`;

    // Exchange authorization code for access token
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      }
    );

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange authorization code for token");
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
    await updateUserProfile(userId, { githubToken: accessToken });

    // Clear state cookie
    res.clearCookie("github_oauth_state");

    // Redirect to settings page with success message
    res.redirect("/settings?github_connected=true");
  } catch (error) {
    console.error("Error handling GitHub OAuth callback:", error);
    res.clearCookie("github_oauth_state");
    res.redirect(
      `/settings?github_error=${encodeURIComponent(error instanceof Error ? error.message : "Failed to connect GitHub")}`
    );
  }
});

/**
 * POST /api/github/oauth/disconnect
 * Disconnect GitHub account
 */
router.post("/oauth/disconnect", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);

    // Import FieldValue from firebase-admin for deleting the field
    const { FieldValue } = await import("firebase-admin/firestore");
    const { adminDb } = await import("@/lib/firebase-admin");

    // Use FieldValue.delete() to properly remove the field
    await adminDb.collection("users").doc(userId).update({
      githubToken: FieldValue.delete(),
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error disconnecting GitHub:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/github/repositories
 * Create a GitHub repository
 */
router.post("/repositories", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const {
      name,
      description,
      private: isPrivate,
    } = req.body as {
      name: string;
      description?: string;
      private?: boolean;
    };

    const repository = await createRepository(
      user.githubToken,
      name,
      description,
      isPrivate
    );
    res.json(repository);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error creating GitHub repository:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/github/repositories
 * List GitHub repositories
 */
router.get("/repositories", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    console.log(user?.githubToken);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const repositories = await listRepositories(user.githubToken);
    res.json(repositories);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error listing GitHub repositories:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * DELETE /api/github/repositories/:owner/:repo
 * Delete a GitHub repository
 */
router.delete("/repositories/:owner/:repo", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const { owner, repo } = req.params;

    console.log({ owner, repo });

    if (!owner || !repo) {
      return res.status(400).json({ error: "Owner and repo are required" });
    }

    await deleteRepository(user.githubToken, owner, repo);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error deleting GitHub repository:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/github/issues
 * Create a GitHub issue
 */
router.post("/issues", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const { owner, repo, title, body } = req.body as {
      owner: string;
      repo: string;
      title: string;
      body?: string;
    };

    const issue = await createIssue(user.githubToken, owner, repo, title, body);
    res.json(issue);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error creating GitHub issue:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/github/issues
 * List GitHub issues
 */
router.get("/issues", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const { owner, repo } = req.query as { owner: string; repo: string };

    const issues = await listIssues(user.githubToken, owner, repo);
    res.json(issues);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error listing GitHub issues:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/github/workflows
 * List GitHub workflows
 */
router.get("/workflows", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const { owner, repo } = req.query as { owner: string; repo: string };

    const workflows = await listWorkflows(user.githubToken, owner, repo);
    res.json(workflows);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error listing GitHub workflows:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/github/branches
 * List GitHub branches
 */
router.get("/branches", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const { owner, repo } = req.query as { owner: string; repo: string };

    const branches = await listBranches(user.githubToken, owner, repo);
    res.json(branches);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error listing GitHub branches:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/github/pull-requests
 * Create a GitHub pull request
 */
router.post("/pull-requests", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const { owner, repo, title, body, head, base } = req.body as {
      owner: string;
      repo: string;
      title: string;
      body?: string;
      head: string;
      base: string;
    };

    const pullRequest = await createPullRequest(
      user.githubToken,
      owner,
      repo,
      head,
      base,
      title,
      body
    );
    res.json(pullRequest);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error creating GitHub pull request:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export { router as githubRoutes };
