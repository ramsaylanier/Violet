/**
 * GitHub API routes
 */

import express from "express";
import {
  createRepository,
  listRepositories,
  deleteRepository,
  getAuthenticatedUser,
  listOrganizations,
  getRepositoryId,
  createIssue,
  listIssues,
  updateIssue,
  closeIssue,
  reopenIssue,
  addIssueComment,
  listIssueComments,
  addIssueLabels,
  removeIssueLabels,
  getIssueNodeId,
  listProjects,
  listProjectsForRepository,
  getProject,
  createProject,
  listProjectItems,
  updateProjectItem,
  addProjectItem,
  listWorkflows,
  listBranches,
  createPullRequest
} from "@/services/githubService";
import { getRequireAuth } from "./auth.js";
import { getUserProfile, updateUserProfile } from "@/services/authService";

const router = express.Router();

/**
 * GET /api/github/oauth/authorize
 * Initiate GitHub OAuth flow
 */
router.get("/oauth/authorize", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const clientId = process.env.GITHUB_CLIENT_ID;

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
      maxAge: 600000 // 10 minutes
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
    //   - project: Full access to Projects V2 (read/write) - required for Projects V2 API
    const scope = "repo,user:email,delete_repo,admin:org,notifications,project";

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;

    // Return the URL instead of redirecting (client will redirect with proper auth)
    res.json({ url: authUrl });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error initiating GitHub OAuth:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
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
          Accept: "application/json"
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri
        })
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
    const frontendUrl = process.env.FRONTEND_URL || `http://localhost:3000`;
    res.redirect(`${frontendUrl}/settings?github_connected=true`);
  } catch (error) {
    console.error("Error handling GitHub OAuth callback:", error);
    res.clearCookie("github_oauth_state");
    const frontendUrl = process.env.FRONTEND_URL || `http://localhost:3000`;
    res.redirect(
      `${frontendUrl}/settings?github_error=${encodeURIComponent(error instanceof Error ? error.message : "Failed to connect GitHub")}`
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
      githubToken: FieldValue.delete()
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error disconnecting GitHub:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
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
      private: isPrivate
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
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * GET /api/github/user
 * Get the authenticated user's GitHub profile
 */
router.get("/user", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const userInfo = await getAuthenticatedUser(user.githubToken);
    res.json(userInfo);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error getting authenticated user:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * GET /api/github/organizations
 * List all organizations for the authenticated user
 */
router.get("/organizations", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const organizations = await listOrganizations(user.githubToken);
    res.json(organizations);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error listing organizations:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
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
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * GET /api/github/repositories/:owner/:repo/id
 * Get repository ID (for GraphQL)
 */
router.get("/repositories/:owner/:repo/id", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const { owner, repo } = req.params;

    if (!owner || !repo) {
      return res.status(400).json({ error: "Owner and repo are required" });
    }

    const repositoryId = await getRepositoryId(user.githubToken, owner, repo);

    if (!repositoryId) {
      return res.status(404).json({ error: "Repository not found" });
    }

    res.json({ id: repositoryId });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error getting repository ID:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
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
      error: error instanceof Error ? error.message : "Internal server error"
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
      error: error instanceof Error ? error.message : "Internal server error"
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
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * PATCH /api/github/issues/:owner/:repo/:number
 * Update a GitHub issue
 */
router.patch("/issues/:owner/:repo/:number", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const { owner, repo, number } = req.params;
    const { title, body, state, labels } = req.body as {
      title?: string;
      body?: string;
      state?: "open" | "closed";
      labels?: string[];
    };

    const issueNumber = parseInt(number, 10);
    if (isNaN(issueNumber)) {
      return res.status(400).json({ error: "Invalid issue number" });
    }

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (body !== undefined) updates.body = body;
    if (state !== undefined) updates.state = state;
    if (labels !== undefined) updates.labels = labels;

    const issue = await updateIssue(
      user.githubToken,
      owner,
      repo,
      issueNumber,
      updates
    );
    res.json(issue);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error updating GitHub issue:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * POST /api/github/issues/:owner/:repo/:number/close
 * Close a GitHub issue
 */
router.post("/issues/:owner/:repo/:number/close", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const { owner, repo, number } = req.params;
    const issueNumber = parseInt(number, 10);
    if (isNaN(issueNumber)) {
      return res.status(400).json({ error: "Invalid issue number" });
    }

    const issue = await closeIssue(user.githubToken, owner, repo, issueNumber);
    res.json(issue);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error closing GitHub issue:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * POST /api/github/issues/:owner/:repo/:number/reopen
 * Reopen a GitHub issue
 */
router.post("/issues/:owner/:repo/:number/reopen", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const { owner, repo, number } = req.params;
    const issueNumber = parseInt(number, 10);
    if (isNaN(issueNumber)) {
      return res.status(400).json({ error: "Invalid issue number" });
    }

    const issue = await reopenIssue(user.githubToken, owner, repo, issueNumber);
    res.json(issue);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error reopening GitHub issue:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * POST /api/github/issues/:owner/:repo/:number/comments
 * Add a comment to a GitHub issue
 */
router.post("/issues/:owner/:repo/:number/comments", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const { owner, repo, number } = req.params;
    const { body } = req.body as { body: string };

    if (!body) {
      return res.status(400).json({ error: "Comment body is required" });
    }

    const issueNumber = parseInt(number, 10);
    if (isNaN(issueNumber)) {
      return res.status(400).json({ error: "Invalid issue number" });
    }

    const comment = await addIssueComment(
      user.githubToken,
      owner,
      repo,
      issueNumber,
      body
    );
    res.json(comment);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error adding comment to GitHub issue:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * GET /api/github/issues/:owner/:repo/:number/comments
 * List comments for a GitHub issue
 */
router.get("/issues/:owner/:repo/:number/comments", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const { owner, repo, number } = req.params;
    const issueNumber = parseInt(number, 10);
    if (isNaN(issueNumber)) {
      return res.status(400).json({ error: "Invalid issue number" });
    }

    const comments = await listIssueComments(
      user.githubToken,
      owner,
      repo,
      issueNumber
    );
    res.json(comments);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error listing GitHub issue comments:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * POST /api/github/issues/:owner/:repo/:number/labels
 * Add labels to a GitHub issue
 */
router.post("/issues/:owner/:repo/:number/labels", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const { owner, repo, number } = req.params;
    const { labels } = req.body as { labels: string[] };

    if (!Array.isArray(labels) || labels.length === 0) {
      return res.status(400).json({ error: "Labels array is required" });
    }

    const issueNumber = parseInt(number, 10);
    if (isNaN(issueNumber)) {
      return res.status(400).json({ error: "Invalid issue number" });
    }

    await addIssueLabels(user.githubToken, owner, repo, issueNumber, labels);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error adding labels to GitHub issue:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * DELETE /api/github/issues/:owner/:repo/:number/labels
 * Remove labels from a GitHub issue
 */
router.delete("/issues/:owner/:repo/:number/labels", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const { owner, repo, number } = req.params;
    const { labels } = req.body as { labels: string[] };

    if (!Array.isArray(labels) || labels.length === 0) {
      return res.status(400).json({ error: "Labels array is required" });
    }

    const issueNumber = parseInt(number, 10);
    if (isNaN(issueNumber)) {
      return res.status(400).json({ error: "Invalid issue number" });
    }

    await removeIssueLabels(user.githubToken, owner, repo, issueNumber, labels);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error removing labels from GitHub issue:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * GET /api/github/issues/:owner/:repo/:number/node-id
 * Get the GraphQL node ID for a GitHub issue
 */
router.get("/issues/:owner/:repo/:number/node-id", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const { owner, repo, number } = req.params;

    if (!owner || !repo || !number) {
      return res
        .status(400)
        .json({ error: "Owner, repo, and issue number are required" });
    }

    const issueNumber = parseInt(number, 10);
    if (isNaN(issueNumber)) {
      return res.status(400).json({ error: "Invalid issue number" });
    }

    const nodeId = await getIssueNodeId(
      user.githubToken,
      owner,
      repo,
      issueNumber
    );
    res.json({ nodeId });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error getting issue node ID:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * GET /api/github/issues/aggregated
 * Get aggregated issues across multiple repositories
 */
router.get("/issues/aggregated", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const { repositories, state } = req.query as {
      repositories?: string;
      state?: "open" | "closed" | "all";
    };

    if (!repositories) {
      return res
        .status(400)
        .json({ error: "Repositories parameter is required" });
    }

    const repos = JSON.parse(repositories) as Array<{
      owner: string;
      name: string;
    }>;

    const allIssues = [];
    for (const repo of repos) {
      try {
        const issues = await listIssues(
          user.githubToken,
          repo.owner,
          repo.name,
          state || "open"
        );
        allIssues.push(
          ...issues.map((issue) => ({
            ...issue,
            repository: {
              owner: repo.owner,
              name: repo.name,
              fullName: `${repo.owner}/${repo.name}`
            }
          }))
        );
      } catch (error) {
        console.error(
          `Error fetching issues for ${repo.owner}/${repo.name}:`,
          error
        );
        // Continue with other repositories even if one fails
      }
    }

    res.json(allIssues);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error aggregating GitHub issues:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
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
      error: error instanceof Error ? error.message : "Internal server error"
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
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * GET /api/github/projects
 * List GitHub Projects
 */
router.get("/projects", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const { owner, ownerType } = req.query as {
      owner: string;
      ownerType?: "user" | "org";
    };

    console.log({ owner, ownerType });

    if (!owner) {
      return res.status(400).json({ error: "Owner parameter is required" });
    }

    const projects = await listProjects(
      user.githubToken,
      owner,
      ownerType || "user"
    );
    res.json(projects);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error listing GitHub projects:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * GET /api/github/repositories/:owner/:repo/projects
 * List GitHub Projects for a specific repository
 */
router.get("/repositories/:owner/:repo/projects", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const { owner, repo } = req.params;

    if (!owner || !repo) {
      return res
        .status(400)
        .json({ error: "Owner and repository parameters are required" });
    }

    const projects = await listProjectsForRepository(
      user.githubToken,
      owner,
      repo
    );
    res.json(projects);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error listing GitHub projects for repository:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * GET /api/github/projects/:projectId
 * Get a specific GitHub Project
 */
router.get("/projects/:projectId", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const { projectId } = req.params;

    const project = await getProject(user.githubToken, projectId);
    res.json(project);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error getting GitHub project:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * POST /api/github/projects
 * Create a new GitHub Project
 */
router.post("/projects", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const {
      owner,
      ownerType,
      title,
      body,
      public: publicProject,
      repositoryId
    } = req.body as {
      owner: string;
      ownerType?: "user" | "org";
      title: string;
      body?: string;
      public?: boolean;
      repositoryId?: string;
    };

    if (!owner || !title) {
      return res.status(400).json({ error: "Owner and title are required" });
    }

    const project = await createProject(
      user.githubToken,
      owner,
      ownerType || "user",
      title,
      body,
      publicProject || false,
      repositoryId
    );
    res.json(project);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error creating GitHub project:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * GET /api/github/projects/:projectId/items
 * List items in a GitHub Project
 */
router.get("/projects/:projectId/items", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const { projectId } = req.params;

    const items = await listProjectItems(user.githubToken, projectId);
    res.json(items);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error listing GitHub project items:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * PATCH /api/github/projects/:projectId/items/:itemId
 * Update a GitHub Project item
 */
router.patch("/projects/:projectId/items/:itemId", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const { projectId, itemId } = req.params;
    const { fieldId, value, valueId } = req.body as {
      fieldId: string;
      value?: string | number | null;
      valueId?: string | null;
    };

    if (!fieldId) {
      return res.status(400).json({ error: "Field ID is required" });
    }

    await updateProjectItem(
      user.githubToken,
      projectId,
      itemId,
      fieldId,
      value ?? null,
      valueId ?? null
    );
    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error updating GitHub project item:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * POST /api/github/projects/:projectId/items
 * Add an item to a GitHub Project
 */
router.post("/projects/:projectId/items", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const user = await getUserProfile(userId);

    if (!user?.githubToken) {
      return res.status(400).json({ error: "GitHub token not configured" });
    }

    const { projectId } = req.params;
    const { contentId } = req.body as { contentId: string };

    if (!contentId) {
      return res.status(400).json({ error: "Content ID is required" });
    }

    const item = await addProjectItem(user.githubToken, projectId, contentId);
    res.json(item);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error adding item to GitHub project:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
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
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

export { router as githubRoutes };
