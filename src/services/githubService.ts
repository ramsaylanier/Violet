import { Octokit } from '@octokit/rest'
import type { GitHubRepository, GitHubIssue } from '@/types'

export function createGitHubClient(token: string): Octokit {
  return new Octokit({
    auth: token,
  })
}

export async function createRepository(
  token: string,
  name: string,
  description?: string,
  isPrivate = false
): Promise<GitHubRepository> {
  const octokit = createGitHubClient(token)
  const response = await octokit.repos.createForAuthenticatedUser({
    name,
    description,
    private: isPrivate,
    auto_init: true,
  })

  return {
    id: response.data.id,
    name: response.data.name,
    full_name: response.data.full_name,
    description: response.data.description,
    private: response.data.private,
    html_url: response.data.html_url,
    created_at: response.data.created_at,
    updated_at: response.data.updated_at,
  }
}

export async function listRepositories(token: string): Promise<GitHubRepository[]> {
  const octokit = createGitHubClient(token)
  const response = await octokit.repos.listForAuthenticatedUser({
    per_page: 100,
    sort: 'updated',
  })

  return response.data.map((repo) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description ?? null,
    private: repo.private,
    html_url: repo.html_url,
    created_at: repo.created_at || new Date().toISOString(),
    updated_at: repo.updated_at || new Date().toISOString(),
  }))
}

export async function createIssue(
  token: string,
  owner: string,
  repo: string,
  title: string,
  body?: string,
  labels?: string[]
): Promise<GitHubIssue> {
  const octokit = createGitHubClient(token)
  const response = await octokit.issues.create({
    owner,
    repo,
    title,
    body,
    labels,
  })

  return {
    id: response.data.id,
    number: response.data.number,
    title: response.data.title,
    body: response.data.body,
    state: response.data.state as 'open' | 'closed',
    labels: Array.isArray(response.data.labels)
      ? response.data.labels
          .filter((label): label is { id: number; name: string; color: string } => typeof label === 'object' && label !== null && 'id' in label && 'name' in label)
          .map((label) => ({
            id: (label as { id: number }).id,
            name: (label as { name: string }).name,
            color: (label as { color?: string }).color || '000000',
          }))
      : [],
    created_at: response.data.created_at,
    updated_at: response.data.updated_at,
  }
}

export async function listIssues(
  token: string,
  owner: string,
  repo: string,
  state: 'open' | 'closed' | 'all' = 'open'
): Promise<GitHubIssue[]> {
  const octokit = createGitHubClient(token)
  const response = await octokit.issues.listForRepo({
    owner,
    repo,
    state,
    per_page: 100,
  })

  return response.data.map((issue) => ({
    id: issue.id,
    number: issue.number,
    title: issue.title,
    body: issue.body ?? null,
    state: issue.state as 'open' | 'closed',
    labels: Array.isArray(issue.labels)
      ? issue.labels
          .filter((label): label is { id: number; name: string; color: string } => typeof label === 'object' && label !== null && 'id' in label && 'name' in label)
          .map((label) => ({
            id: (label as { id: number }).id,
            name: (label as { name: string }).name,
            color: (label as { color?: string }).color || '000000',
          }))
      : [],
    created_at: issue.created_at,
    updated_at: issue.updated_at,
  }))
}

export async function listWorkflows(token: string, owner: string, repo: string) {
  const octokit = createGitHubClient(token)
  const response = await octokit.actions.listWorkflowRunsForRepo({
    owner,
    repo,
    per_page: 10,
  })

  return response.data.workflow_runs.map((run) => ({
    id: run.id,
    name: run.name,
    status: run.status,
    conclusion: run.conclusion,
    created_at: run.created_at,
    updated_at: run.updated_at,
    html_url: run.html_url,
  }))
}

export async function listBranches(token: string, owner: string, repo: string) {
  const octokit = createGitHubClient(token)
  const response = await octokit.repos.listBranches({
    owner,
    repo,
  })

  return response.data.map((branch) => ({
    name: branch.name,
    protected: branch.protected,
    commit: {
      sha: branch.commit.sha,
      url: branch.commit.url,
    },
  }))
}

export async function createPullRequest(
  token: string,
  owner: string,
  repo: string,
  head: string,
  base: string,
  title: string,
  body?: string
) {
  const octokit = createGitHubClient(token)
  const response = await octokit.pulls.create({
    owner,
    repo,
    head,
    base,
    title,
    body,
  })

  return {
    id: response.data.id,
    number: response.data.number,
    title: response.data.title,
    state: response.data.state,
    html_url: response.data.html_url,
    created_at: response.data.created_at,
  }
}
