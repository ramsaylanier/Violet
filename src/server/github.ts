import { createServerFn } from "@tanstack/start-client-core";
import { verifyIdToken, getUserProfile } from "@/services/authService";
import {
  createRepository,
  listRepositories,
  createIssue,
  listIssues,
  listWorkflows,
  listBranches,
  createPullRequest,
} from "@/services/githubService";
import type { GitHubRepository, GitHubIssue } from "@/types";

export const createGitHubRepository = createServerFn({
  method: "POST",
}).handler(async (ctx) => {
  const request = (ctx.context as any)?.request;
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.substring(7);
  const userId = await verifyIdToken(token);
  const user = await getUserProfile(userId);

  if (!user?.githubToken) {
    throw new Error("GitHub token not configured");
  }

  const {
    name,
    description,
    private: isPrivate,
  } = ctx.data as any as {
    name: string;
    description?: string;
    private?: boolean;
  };
  return await createRepository(user.githubToken, name, description, isPrivate);
});

export const listGitHubRepositories = createServerFn({
  method: "GET",
}).handler(async (ctx) => {
  const request = (ctx.context as any)?.request;
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.substring(7);
  const userId = await verifyIdToken(token);
  const user = await getUserProfile(userId);

  if (!user?.githubToken) {
    throw new Error("GitHub token not configured");
  }

  return await listRepositories(user.githubToken);
});

export const createGitHubIssue = createServerFn({
  method: "POST",
}).handler(async (ctx) => {
  const request = (ctx.context as any)?.request;
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.substring(7);
  const userId = await verifyIdToken(token);
  const user = await getUserProfile(userId);

  if (!user?.githubToken) {
    throw new Error("GitHub token not configured");
  }

  const { owner, repo, title, body, labels } = ctx.data as any as {
    owner: string;
    repo: string;
    title: string;
    body?: string;
    labels?: string[];
  };
  return await createIssue(user.githubToken, owner, repo, title, body, labels);
});

export const listGitHubIssues = createServerFn({
  method: "GET",
}).handler(async (ctx) => {
  const request = (ctx.context as any)?.request;
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.substring(7);
  const userId = await verifyIdToken(token);
  const user = await getUserProfile(userId);

  if (!user?.githubToken) {
    throw new Error("GitHub token not configured");
  }

  const { owner, repo, state } = ctx.data as any as {
    owner: string;
    repo: string;
    state?: "open" | "closed" | "all";
  };
  return await listIssues(user.githubToken, owner, repo, state);
});

export const listGitHubWorkflows = createServerFn({
  method: "GET",
}).handler(async (ctx) => {
  const request = (ctx.context as any)?.request;
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.substring(7);
  const userId = await verifyIdToken(token);
  const user = await getUserProfile(userId);

  if (!user?.githubToken) {
    throw new Error("GitHub token not configured");
  }

  const { owner, repo } = ctx.data as any as { owner: string; repo: string };
  return await listWorkflows(user.githubToken, owner, repo);
});

export const listGitHubBranches = createServerFn({
  method: "GET",
}).handler(async (ctx) => {
  const request = (ctx.context as any)?.request;
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.substring(7);
  const userId = await verifyIdToken(token);
  const user = await getUserProfile(userId);

  if (!user?.githubToken) {
    throw new Error("GitHub token not configured");
  }

  const { owner, repo } = ctx.data as any as { owner: string; repo: string };
  return await listBranches(user.githubToken, owner, repo);
});

export const createGitHubPullRequest = createServerFn({
  method: "POST",
}).handler(async (ctx) => {
  const request = (ctx.context as any)?.request;
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.substring(7);
  const userId = await verifyIdToken(token);
  const user = await getUserProfile(userId);

  if (!user?.githubToken) {
    throw new Error("GitHub token not configured");
  }

  const { owner, repo, head, base, title, body } = ctx.data as any as {
    owner: string;
    repo: string;
    head: string;
    base: string;
    title: string;
    body?: string;
  };
  return await createPullRequest(
    user.githubToken,
    owner,
    repo,
    head,
    base,
    title,
    body
  );
});
