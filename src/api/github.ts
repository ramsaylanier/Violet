/**
 * Client-side GitHub API functions
 */

import { apiGet, apiPost } from "./client.js";
import type { GitHubRepository, GitHubIssue } from "@/types";

export async function createGitHubRepository(data: {
  name: string;
  description?: string;
  private?: boolean;
}): Promise<GitHubRepository> {
  return apiPost<GitHubRepository>("/github/repositories", data);
}

export async function listGitHubRepositories(): Promise<GitHubRepository[]> {
  return apiGet<GitHubRepository[]>("/github/repositories");
}

export async function createGitHubIssue(data: {
  owner: string;
  repo: string;
  title: string;
  body?: string;
}): Promise<GitHubIssue> {
  return apiPost<GitHubIssue>("/github/issues", data);
}

export async function listGitHubIssues(
  owner: string,
  repo: string
): Promise<GitHubIssue[]> {
  return apiGet<GitHubIssue[]>(
    `/github/issues?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`
  );
}

export async function listGitHubWorkflows(
  owner: string,
  repo: string
): Promise<any[]> {
  return apiGet<any[]>(
    `/github/workflows?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`
  );
}

export async function listGitHubBranches(
  owner: string,
  repo: string
): Promise<any[]> {
  return apiGet<any[]>(
    `/github/branches?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`
  );
}

export async function createGitHubPullRequest(data: {
  owner: string;
  repo: string;
  title: string;
  body?: string;
  head: string;
  base: string;
}): Promise<any> {
  return apiPost<any>("/github/pull-requests", data);
}

export async function disconnectGitHub(): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>("/github/oauth/disconnect");
}

export async function getGitHubOAuthUrl(): Promise<{ url: string }> {
  return apiGet<{ url: string }>("/github/oauth/authorize");
}
