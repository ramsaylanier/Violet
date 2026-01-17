/**
 * Client-side GitHub API functions
 */

import { apiGet, apiPost, apiPatch, apiDelete } from "./client.js";
import type {
  GitHubRepository,
  GitHubIssue,
  GitHubIssueComment,
  GitHubProject,
  GitHubProjectItem,
  GitHubWorkflow,
  GitHubWorkflowInput,
  GitHubWorkflowRun
} from "@/shared/types";

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

export async function listGitHubWorkflowDefinitions(
  owner: string,
  repo: string
): Promise<GitHubWorkflow[]> {
  return apiGet<GitHubWorkflow[]>(
    `/github/workflows?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`
  );
}

export async function getGitHubWorkflowDefinition(
  owner: string,
  repo: string,
  workflowId: string
): Promise<GitHubWorkflow & { inputs?: GitHubWorkflowInput[] }> {
  return apiGet<GitHubWorkflow & { inputs?: GitHubWorkflowInput[] }>(
    `/github/workflows/${encodeURIComponent(workflowId)}?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`
  );
}

export async function dispatchGitHubWorkflow(
  owner: string,
  repo: string,
  workflowId: string,
  data: {
    ref: string;
    inputs?: Record<string, string>;
  }
): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>(
    `/github/workflows/${encodeURIComponent(workflowId)}/dispatch`,
    {
      owner,
      repo,
      ...data
    }
  );
}

export async function listGitHubWorkflowRuns(
  owner: string,
  repo: string,
  options?: {
    workflowId?: string;
    branch?: string;
    status?: string;
    per_page?: number;
  }
): Promise<GitHubWorkflowRun[]> {
  const params = new URLSearchParams({
    owner: owner,
    repo: repo
  });

  if (options?.workflowId) {
    params.append("workflowId", options.workflowId);
  }
  if (options?.branch) {
    params.append("branch", options.branch);
  }
  if (options?.status) {
    params.append("status", options.status);
  }
  if (options?.per_page) {
    params.append("per_page", options.per_page.toString());
  }

  return apiGet<GitHubWorkflowRun[]>(
    `/github/workflows/runs?${params.toString()}`
  );
}

export async function getGitHubWorkflowRun(
  owner: string,
  repo: string,
  runId: number
): Promise<GitHubWorkflowRun> {
  return apiGet<GitHubWorkflowRun>(
    `/github/workflows/runs/${runId}?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`
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

export async function deleteGitHubRepository(
  owner: string,
  repo: string
): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(
    `/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  );
}

export async function disconnectGitHub(): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>("/github/oauth/disconnect");
}

export async function getGitHubOAuthUrl(): Promise<{ url: string }> {
  return apiGet<{ url: string }>("/github/oauth/authorize");
}

// Issue management functions

export async function updateGitHubIssue(
  owner: string,
  repo: string,
  issueNumber: number,
  updates: {
    title?: string;
    body?: string;
    state?: "open" | "closed";
    labels?: string[];
  }
): Promise<GitHubIssue> {
  return apiPatch<GitHubIssue>(
    `/github/issues/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${issueNumber}`,
    updates
  );
}

export async function closeGitHubIssue(
  owner: string,
  repo: string,
  issueNumber: number
): Promise<GitHubIssue> {
  return apiPost<GitHubIssue>(
    `/github/issues/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${issueNumber}/close`
  );
}

export async function reopenGitHubIssue(
  owner: string,
  repo: string,
  issueNumber: number
): Promise<GitHubIssue> {
  return apiPost<GitHubIssue>(
    `/github/issues/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${issueNumber}/reopen`
  );
}

export async function addGitHubIssueComment(
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
): Promise<GitHubIssueComment> {
  return apiPost<GitHubIssueComment>(
    `/github/issues/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${issueNumber}/comments`,
    { body }
  );
}

export async function listGitHubIssueComments(
  owner: string,
  repo: string,
  issueNumber: number
): Promise<GitHubIssueComment[]> {
  return apiGet<GitHubIssueComment[]>(
    `/github/issues/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${issueNumber}/comments`
  );
}

export async function addGitHubIssueLabels(
  owner: string,
  repo: string,
  issueNumber: number,
  labels: string[]
): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>(
    `/github/issues/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${issueNumber}/labels`,
    { labels }
  );
}

export async function removeGitHubIssueLabels(
  owner: string,
  repo: string,
  issueNumber: number,
  labels: string[]
): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(
    `/github/issues/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${issueNumber}/labels`,
    { labels }
  );
}

export async function listGitHubIssuesAggregated(
  repositories: Array<{ owner: string; name: string }>,
  state?: "open" | "closed" | "all"
): Promise<
  Array<
    GitHubIssue & {
      repository: { owner: string; name: string; fullName: string };
    }
  >
> {
  return apiGet<
    Array<
      GitHubIssue & {
        repository: { owner: string; name: string; fullName: string };
      }
    >
  >(
    `/github/issues/aggregated?repositories=${encodeURIComponent(JSON.stringify(repositories))}${state ? `&state=${state}` : ""}`
  );
}

// GitHub Projects functions

export async function listGitHubProjects(
  owner: string,
  ownerType?: "user" | "org"
): Promise<GitHubProject[]> {
  return apiGet<GitHubProject[]>(
    `/github/projects?owner=${encodeURIComponent(owner)}${ownerType ? `&ownerType=${ownerType}` : ""}`
  );
}

export async function listGitHubProjectsForRepository(
  owner: string,
  repo: string
): Promise<GitHubProject[]> {
  return apiGet<GitHubProject[]>(
    `/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/projects`
  );
}

export async function getGitHubUser(): Promise<{
  login: string;
  id: number;
  type: string;
}> {
  return apiGet<{ login: string; id: number; type: string }>("/github/user");
}

export async function getGitHubRepositoryId(
  owner: string,
  repo: string
): Promise<string> {
  const response = await apiGet<{ id: string }>(
    `/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/id`
  );
  return response.id;
}

export async function listGitHubOrganizations(): Promise<
  Array<{
    login: string;
    id: number;
    avatar_url?: string;
  }>
> {
  return apiGet<Array<{ login: string; id: number; avatar_url?: string }>>(
    "/github/organizations"
  );
}

export async function getGitHubProject(
  projectId: string
): Promise<GitHubProject> {
  return apiGet<GitHubProject>(
    `/github/projects/${encodeURIComponent(projectId)}`
  );
}

export async function createGitHubProject(data: {
  owner: string;
  ownerType?: "user" | "org";
  title: string;
  body?: string;
  public?: boolean;
  repositoryId?: string;
}): Promise<GitHubProject> {
  return apiPost<GitHubProject>("/github/projects", data);
}

export async function listGitHubProjectItems(
  projectId: string
): Promise<GitHubProjectItem[]> {
  return apiGet<GitHubProjectItem[]>(
    `/github/projects/${encodeURIComponent(projectId)}/items`
  );
}

export async function updateGitHubProjectItem(
  projectId: string,
  itemId: string,
  data: {
    fieldId: string;
    value?: string | number | null;
    valueId?: string | null;
  }
): Promise<{ success: boolean }> {
  return apiPatch<{ success: boolean }>(
    `/github/projects/${encodeURIComponent(projectId)}/items/${encodeURIComponent(itemId)}`,
    data
  );
}

export async function getGitHubIssueNodeId(
  owner: string,
  repo: string,
  issueNumber: number
): Promise<string> {
  const response = await apiGet<{ nodeId: string }>(
    `/github/issues/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${issueNumber}/node-id`
  );
  return response.nodeId;
}

export async function addGitHubProjectItem(
  projectId: string,
  contentId: string
): Promise<GitHubProjectItem> {
  return apiPost<GitHubProjectItem>(
    `/github/projects/${encodeURIComponent(projectId)}/items`,
    { contentId }
  );
}
