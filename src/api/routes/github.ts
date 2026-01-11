/**
 * GitHub API routes
 */

import express from "express";
import {
  createRepository,
  listRepositories,
  createIssue,
  listIssues,
  listWorkflows,
  listBranches,
  createPullRequest,
} from "@/services/githubService";
import { getRequireAuth } from "./auth.js";
import { getUserProfile } from "@/services/authService";
import type { GitHubRepository, GitHubIssue } from "@/types";

const router = express.Router();

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
    res
      .status(500)
      .json({
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
    res
      .status(500)
      .json({
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
    res
      .status(500)
      .json({
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
    res
      .status(500)
      .json({
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
    res
      .status(500)
      .json({
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
    res
      .status(500)
      .json({
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
    res
      .status(500)
      .json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
  }
});

export { router as githubRoutes };
