import { Octokit } from "@octokit/rest";
import type {
  GitHubRepository,
  GitHubIssue,
  GitHubIssueComment,
  GitHubProject,
  GitHubProjectItem
} from "@/types";

export function createGitHubClient(token: string): Octokit {
  return new Octokit({
    auth: token
  });
}

// GraphQL helper for Projects v2
async function graphqlQuery(
  token: string,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<any> {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GraphQL error: ${error}`);
  }

  const result = await response.json();
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
}

export async function createRepository(
  token: string,
  name: string,
  description?: string,
  isPrivate = false
): Promise<GitHubRepository> {
  try {
    const octokit = createGitHubClient(token);
    const response = await octokit.repos.createForAuthenticatedUser({
      name,
      description,
      private: isPrivate,
      auto_init: true
    });

    return {
      id: response.data.id,
      name: response.data.name,
      full_name: response.data.full_name,
      description: response.data.description,
      private: response.data.private,
      html_url: response.data.html_url,
      created_at: response.data.created_at,
      updated_at: response.data.updated_at
    };
  } catch (error: any) {
    console.error("Error creating GitHub repository:", error);
    // Log more details about the error
    if (error?.response) {
      console.error("GitHub API Error Details:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      });
    }
    throw error;
  }
}

export async function listRepositories(
  token: string
): Promise<GitHubRepository[]> {
  const octokit = createGitHubClient(token);
  const response = await octokit.repos.listForAuthenticatedUser({
    per_page: 100,
    sort: "updated"
  });

  return response.data.map((repo) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description ?? null,
    private: repo.private,
    html_url: repo.html_url,
    created_at: repo.created_at || new Date().toISOString(),
    updated_at: repo.updated_at || new Date().toISOString()
  }));
}

export async function getAuthenticatedUser(token: string): Promise<{
  login: string;
  id: number;
  type: string;
}> {
  const octokit = createGitHubClient(token);
  const response = await octokit.users.getAuthenticated();
  return {
    login: response.data.login,
    id: response.data.id,
    type: response.data.type
  };
}

export async function listOrganizations(token: string): Promise<
  Array<{
    login: string;
    id: number;
    avatar_url?: string;
  }>
> {
  const octokit = createGitHubClient(token);
  const response = await octokit.orgs.listForAuthenticatedUser({
    per_page: 100
  });
  return response.data.map((org) => ({
    login: org.login,
    id: org.id,
    avatar_url: org.avatar_url
  }));
}

export async function deleteRepository(
  token: string,
  owner: string,
  repo: string
): Promise<void> {
  console.log({ owner, repo });
  try {
    const octokit = createGitHubClient(token);
    await octokit.repos.delete({
      owner,
      repo
    });
  } catch (error: any) {
    console.error("Error deleting GitHub repository:", error);
    // Log more details about the error
    if (error?.response) {
      console.error("GitHub API Error Details:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      });
    }
    throw error;
  }
}

export async function createIssue(
  token: string,
  owner: string,
  repo: string,
  title: string,
  body?: string,
  labels?: string[]
): Promise<GitHubIssue> {
  const octokit = createGitHubClient(token);
  const response = await octokit.issues.create({
    owner,
    repo,
    title,
    body,
    labels
  });

  return {
    id: response.data.id,
    number: response.data.number,
    title: response.data.title,
    body: response.data.body ?? null,
    state: response.data.state as "open" | "closed",
    labels: Array.isArray(response.data.labels)
      ? response.data.labels
          .filter(
            (label): label is { id: number; name: string; color: string } =>
              typeof label === "object" &&
              label !== null &&
              "id" in label &&
              "name" in label
          )
          .map((label) => ({
            id: (label as { id: number }).id,
            name: (label as { name: string }).name,
            color: (label as { color?: string }).color || "000000"
          }))
      : [],
    created_at: response.data.created_at,
    updated_at: response.data.updated_at,
    assignees: response.data.assignees?.map((assignee) => ({
      id: assignee.id,
      login: assignee.login,
      avatar_url: assignee.avatar_url
    })),
    milestone: response.data.milestone
      ? {
          id: response.data.milestone.id,
          title: response.data.milestone.title,
          description: response.data.milestone.description ?? undefined,
          due_on: response.data.milestone.due_on ?? null,
          state: response.data.milestone.state as "open" | "closed"
        }
      : null,
    html_url: response.data.html_url,
    user: response.data.user
      ? {
          id: response.data.user.id,
          login: response.data.user.login,
          avatar_url: response.data.user.avatar_url
        }
      : undefined,
    comments: response.data.comments
  };
}

export async function listIssues(
  token: string,
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "open"
): Promise<GitHubIssue[]> {
  const octokit = createGitHubClient(token);
  const response = await octokit.issues.listForRepo({
    owner,
    repo,
    state,
    per_page: 100
  });

  // Filter out pull requests (they have a pull_request property)
  const issuesOnly = response.data.filter(
    (issue) => !issue.pull_request
  );

  return issuesOnly.map((issue) => ({
    id: issue.id,
    number: issue.number,
    title: issue.title,
    body: issue.body ?? null,
    state: issue.state as "open" | "closed",
    labels: Array.isArray(issue.labels)
      ? issue.labels
          .filter(
            (label): label is { id: number; name: string; color: string } =>
              typeof label === "object" &&
              label !== null &&
              "id" in label &&
              "name" in label
          )
          .map((label) => ({
            id: (label as { id: number }).id,
            name: (label as { name: string }).name,
            color: (label as { color?: string }).color || "000000"
          }))
      : [],
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    assignees: issue.assignees?.map((assignee) => ({
      id: assignee.id,
      login: assignee.login,
      avatar_url: assignee.avatar_url
    })),
    milestone: issue.milestone
      ? {
          id: issue.milestone.id,
          title: issue.milestone.title,
          description: issue.milestone.description ?? undefined,
          due_on: issue.milestone.due_on ?? null,
          state: issue.milestone.state as "open" | "closed"
        }
      : null,
    html_url: issue.html_url,
    user: issue.user
      ? {
          id: issue.user.id,
          login: issue.user.login,
          avatar_url: issue.user.avatar_url
        }
      : undefined,
    comments: issue.comments
  }));
}

export async function listWorkflows(
  token: string,
  owner: string,
  repo: string
) {
  const octokit = createGitHubClient(token);
  const response = await octokit.actions.listWorkflowRunsForRepo({
    owner,
    repo,
    per_page: 10
  });

  return response.data.workflow_runs.map((run) => ({
    id: run.id,
    name: run.name,
    status: run.status,
    conclusion: run.conclusion,
    created_at: run.created_at,
    updated_at: run.updated_at,
    html_url: run.html_url
  }));
}

export async function listBranches(token: string, owner: string, repo: string) {
  const octokit = createGitHubClient(token);
  const response = await octokit.repos.listBranches({
    owner,
    repo
  });

  return response.data.map((branch) => ({
    name: branch.name,
    protected: branch.protected,
    commit: {
      sha: branch.commit.sha,
      url: branch.commit.url
    }
  }));
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
  const octokit = createGitHubClient(token);
  const response = await octokit.pulls.create({
    owner,
    repo,
    head,
    base,
    title,
    body
  });

  return {
    id: response.data.id,
    number: response.data.number,
    title: response.data.title,
    state: response.data.state,
    html_url: response.data.html_url,
    created_at: response.data.created_at
  };
}

// Issue management functions

export async function updateIssue(
  token: string,
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
  const octokit = createGitHubClient(token);
  const response = await octokit.issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    ...updates
  });

  return {
    id: response.data.id,
    number: response.data.number,
    title: response.data.title,
    body: response.data.body ?? null,
    state: response.data.state as "open" | "closed",
    labels: Array.isArray(response.data.labels)
      ? response.data.labels
          .filter(
            (label): label is { id: number; name: string; color: string } =>
              typeof label === "object" &&
              label !== null &&
              "id" in label &&
              "name" in label
          )
          .map((label) => ({
            id: (label as { id: number }).id,
            name: (label as { name: string }).name,
            color: (label as { color?: string }).color || "000000"
          }))
      : [],
    created_at: response.data.created_at,
    updated_at: response.data.updated_at,
    assignees: response.data.assignees?.map((assignee) => ({
      id: assignee.id,
      login: assignee.login,
      avatar_url: assignee.avatar_url
    })),
    milestone: response.data.milestone
      ? {
          id: response.data.milestone.id,
          title: response.data.milestone.title,
          description: response.data.milestone.description ?? undefined,
          due_on: response.data.milestone.due_on ?? null,
          state: response.data.milestone.state as "open" | "closed"
        }
      : null,
    html_url: response.data.html_url,
    user: response.data.user
      ? {
          id: response.data.user.id,
          login: response.data.user.login,
          avatar_url: response.data.user.avatar_url
        }
      : undefined,
    comments: response.data.comments
  };
}

export async function closeIssue(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<GitHubIssue> {
  return updateIssue(token, owner, repo, issueNumber, { state: "closed" });
}

export async function reopenIssue(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<GitHubIssue> {
  return updateIssue(token, owner, repo, issueNumber, { state: "open" });
}

export async function addIssueComment(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
): Promise<GitHubIssueComment> {
  const octokit = createGitHubClient(token);
  const response = await octokit.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body
  });

  return {
    id: response.data.id,
    body: response.data.body || "",
    user: response.data.user
      ? {
          id: response.data.user.id,
          login: response.data.user.login,
          avatar_url: response.data.user.avatar_url
        }
      : {
          id: 0,
          login: "unknown"
        },
    created_at: response.data.created_at,
    updated_at: response.data.updated_at,
    html_url: response.data.html_url
  };
}

export async function listIssueComments(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<GitHubIssueComment[]> {
  const octokit = createGitHubClient(token);
  const response = await octokit.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100
  });

  return response.data.map((comment) => ({
    id: comment.id,
    body: comment.body || "",
    user: comment.user
      ? {
          id: comment.user.id,
          login: comment.user.login,
          avatar_url: comment.user.avatar_url
        }
      : {
          id: 0,
          login: "unknown"
        },
    created_at: comment.created_at,
    updated_at: comment.updated_at,
    html_url: comment.html_url
  }));
}

export async function addIssueLabels(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
  labels: string[]
): Promise<void> {
  const octokit = createGitHubClient(token);
  await octokit.issues.addLabels({
    owner,
    repo,
    issue_number: issueNumber,
    labels
  });
}

export async function removeIssueLabels(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
  labels: string[]
): Promise<void> {
  const octokit = createGitHubClient(token);
  // Remove labels one by one since the API doesn't support batch removal
  await Promise.all(
    labels.map((label) =>
      octokit.issues.removeLabel({
        owner,
        repo,
        issue_number: issueNumber,
        name: label
      })
    )
  );
}

// GitHub Projects v2 functions (GraphQL)

export async function listProjectsForRepository(
  token: string,
  owner: string,
  repo: string
): Promise<GitHubProject[]> {
  const query = `
    query($owner: String!, $repo: String!, $first: Int!) {
      repository(owner: $owner, name: $repo) {
        projectsV2(first: $first) {
          nodes {
            id
            number
            title
            readme
            url
            shortDescription
            closed
            closedAt
            createdAt
            updatedAt
            public: public
            owner {
              __typename
              ... on User {
                id
                login
              }
              ... on Organization {
                id
                login
              }
            }
            creator {
              __typename
              ... on User {
                id
                login
              }
              ... on Bot {
                id
                login
              }
            }
          }
        }
      }
    }
  `;

  const data = await graphqlQuery(token, query, {
    owner,
    repo,
    first: 100
  });

  const projects = data.repository?.projectsV2?.nodes || [];
  return projects.map((project: any) => ({
    id: project.id,
    number: project.number,
    title: project.title,
    body: project.readme || null,
    url: project.url,
    shortDescription: project.shortDescription,
    closed: project.closed,
    closedAt: project.closedAt,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    public: project.public,
    owner: project.owner
      ? {
          id: project.owner.id,
          login: project.owner.login,
          type:
            (project.owner.__typename || "User") === "User"
              ? "User"
              : "Organization"
        }
      : undefined,
    creator: project.creator
      ? {
          id: project.creator.id,
          login: project.creator.login
        }
      : undefined
  }));
}

export async function listProjects(
  token: string,
  owner: string,
  ownerType: "user" | "org" = "user"
): Promise<GitHubProject[]> {
  // Use separate queries for user and org since GraphQL doesn't support dynamic field names
  const query =
    ownerType === "user"
      ? `
      query($login: String!, $first: Int!) {
        user(login: $login) {
          projectsV2(first: $first) {
            nodes {
              id
              number
              title
              readme
              url
              shortDescription
              closed
              closedAt
              createdAt
              updatedAt
              public: public
              owner {
                __typename
                ... on User {
                  id
                  login
                }
                ... on Organization {
                  id
                  login
                }
              }
              creator {
                __typename
                ... on User {
                  id
                  login
                }
                ... on Bot {
                  id
                  login
                }
              }
            }
          }
        }
      }
    `
      : `
      query($login: String!, $first: Int!) {
        organization(login: $login) {
          projectsV2(first: $first) {
            nodes {
              id
              number
              title
              readme
              url
              shortDescription
              closed
              closedAt
              createdAt
              updatedAt
              public: public
              owner {
                __typename
                ... on User {
                  id
                  login
                }
                ... on Organization {
                  id
                  login
                }
              }
              creator {
                __typename
                ... on User {
                  id
                  login
                }
                ... on Bot {
                  id
                  login
                }
              }
            }
          }
        }
      }
    `;

  const data = await graphqlQuery(token, query, {
    login: owner,
    first: 100
  });

  const projects =
    (ownerType === "user" ? data.user : data.organization)?.projectsV2?.nodes ||
    [];
  return projects.map((project: any) => ({
    id: project.id,
    number: project.number,
    title: project.title,
    body: project.readme || null,
    url: project.url,
    shortDescription: project.shortDescription,
    closed: project.closed,
    closedAt: project.closedAt,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    public: project.public,
    owner: project.owner
      ? {
          id: project.owner.id,
          login: project.owner.login,
          type:
            (project.owner.__typename || "User") === "User"
              ? "User"
              : "Organization"
        }
      : undefined,
    creator: project.creator
      ? {
          id: project.creator.id,
          login: project.creator.login
        }
      : undefined
  }));
}

export async function getProject(
  token: string,
  projectId: string
): Promise<GitHubProject> {
  const query = `
    query($id: ID!) {
      node(id: $id) {
        ... on ProjectV2 {
          id
          number
          title
          readme
          url
          shortDescription
          closed
          closedAt
          createdAt
          updatedAt
          public: public
          owner {
            __typename
            ... on User {
              id
              login
            }
            ... on Organization {
              id
              login
            }
          }
          creator {
            __typename
            ... on User {
              id
              login
            }
            ... on Bot {
              id
              login
            }
          }
        }
      }
    }
  `;

  const data = await graphqlQuery(token, query, { id: projectId });
  const project = data.node;

  if (!project) {
    throw new Error("Project not found");
  }

  return {
    id: project.id,
    number: project.number,
    title: project.title,
    body: project.readme || null,
    url: project.url,
    shortDescription: project.shortDescription,
    closed: project.closed,
    closedAt: project.closedAt,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    public: project.public,
    owner: project.owner
      ? {
          id: project.owner.id,
          login: project.owner.login,
          type:
            (project.owner.__typename || "User") === "User"
              ? "User"
              : "Organization"
        }
      : undefined,
    creator: project.creator
      ? {
          id: project.creator.id,
          login: project.creator.login
        }
      : undefined
  };
}

export async function getRepositoryId(
  token: string,
  owner: string,
  repo: string
): Promise<string | null> {
  const query = `
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        id
      }
    }
  `;

  try {
    const data = await graphqlQuery(token, query, { owner, repo });
    return data.repository?.id || null;
  } catch (error) {
    console.error(`Error getting repository ID for ${owner}/${repo}:`, error);
    return null;
  }
}

export async function createProject(
  token: string,
  owner: string,
  ownerType: "user" | "org" = "user",
  title: string,
  body?: string,
  publicProject: boolean = false,
  repositoryId?: string
): Promise<GitHubProject> {
  // First, get the owner's node ID based on ownerType
  const ownerQuery =
    ownerType === "user"
      ? `
      query($login: String!) {
        user(login: $login) {
          id
        }
      }
    `
      : `
      query($login: String!) {
        organization(login: $login) {
          id
        }
      }
    `;

  const ownerData = await graphqlQuery(token, ownerQuery, { login: owner });
  const ownerId = ownerData.user?.id || ownerData.organization?.id;

  if (!ownerId) {
    throw new Error(
      `Owner ${owner} not found as ${ownerType === "user" ? "user" : "organization"}`
    );
  }

  const mutation = `
    mutation($input: CreateProjectV2Input!) {
      createProjectV2(input: $input) {
        projectV2 {
          id
          number
          title
          readme
          url
          shortDescription
          closed
          closedAt
          createdAt
          updatedAt
          public: public
          owner {
            __typename
            ... on User {
              id
              login
            }
            ... on Organization {
              id
              login
            }
          }
          creator {
            __typename
            ... on User {
              id
              login
            }
            ... on Bot {
              id
              login
            }
          }
        }
      }
    }
  `;

  const input: any = {
    ownerId,
    title
  };

  if (repositoryId) {
    input.repositoryId = repositoryId;
  }

  const data = await graphqlQuery(token, mutation, {
    input
  });

  const project = data.createProjectV2.projectV2;
  return {
    id: project.id,
    number: project.number,
    title: project.title,
    body: project.readme || null,
    url: project.url,
    shortDescription: project.shortDescription,
    closed: project.closed,
    closedAt: project.closedAt,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    public: project.public,
    owner: project.owner
      ? {
          id: project.owner.id,
          login: project.owner.login,
          type:
            (project.owner.__typename || "User") === "User"
              ? "User"
              : "Organization"
        }
      : undefined,
    creator: project.creator
      ? {
          id: project.creator.id,
          login: project.creator.login
        }
      : undefined
  };
}

export async function listProjectItems(
  token: string,
  projectId: string
): Promise<GitHubProjectItem[]> {
  const query = `
    query($id: ID!, $first: Int!) {
      node(id: $id) {
        ... on ProjectV2 {
          items(first: $first) {
            nodes {
              id
              type
              content {
                ... on Issue {
                  id
                  number
                  title
                  body
                  state
                  url
                  repository {
                    name
                    owner {
                      login
                    }
                  }
                }
                ... on PullRequest {
                  id
                  number
                  title
                  body
                  state
                  url
                  repository {
                    name
                    owner {
                      login
                    }
                  }
                }
                ... on DraftIssue {
                  id
                  title
                  body
                }
              }
              fieldValues(first: 50) {
                nodes {
                  ... on ProjectV2ItemFieldTextValue {
                    field {
                      ... on ProjectV2Field {
                        id
                        name
                      }
                    }
                    text
                  }
                  ... on ProjectV2ItemFieldNumberValue {
                    field {
                      ... on ProjectV2Field {
                        id
                        name
                      }
                    }
                    number
                  }
                  ... on ProjectV2ItemFieldDateValue {
                    field {
                      ... on ProjectV2Field {
                        id
                        name
                      }
                    }
                    date
                  }
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    field {
                      ... on ProjectV2SingleSelectField {
                        id
                        name
                      }
                    }
                    optionId
                  }
                  ... on ProjectV2ItemFieldIterationValue {
                    field {
                      ... on ProjectV2IterationField {
                        id
                        name
                      }
                    }
                    iterationId
                  }
                }
              }
              createdAt
              updatedAt
            }
          }
        }
      }
    }
  `;

  const data = await graphqlQuery(token, query, {
    id: projectId,
    first: 100
  });

  const project = data.node;
  if (!project || !project.items) {
    return [];
  }

  return project.items.nodes.map((item: any) => ({
    id: item.id,
    type: item.type || "DRAFT_ISSUE",
    content: item.content
      ? {
          id: item.content.id,
          number: item.content.number,
          title: item.content.title,
          body: item.content.body,
          state: item.content.state,
          url: item.content.url,
          repository: item.content.repository
            ? {
                name: item.content.repository.name,
                owner: {
                  login: item.content.repository.owner.login
                }
              }
            : undefined
        }
      : null,
    fieldValues: item.fieldValues?.nodes?.map((fv: any) => ({
      field: {
        id: fv.field.id,
        name: fv.field.name
      },
      value: fv.text || fv.number || fv.date || null,
      singleSelectOptionId: fv.optionId || null,
      iterationId: fv.iterationId || null
    })),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  }));
}

export async function updateProjectItem(
  token: string,
  projectId: string,
  itemId: string,
  fieldId: string,
  value: string | number | null,
  valueId?: string | null
): Promise<void> {
  // This is a simplified version - actual implementation depends on field type
  const mutation = `
    mutation($input: UpdateProjectV2ItemFieldValueInput!) {
      updateProjectV2ItemFieldValue(input: $input) {
        projectV2Item {
          id
        }
      }
    }
  `;

  const input: any = {
    projectId,
    itemId,
    fieldId
  };

  if (valueId) {
    input.value = {
      singleSelectOptionId: valueId
    };
  } else if (typeof value === "string") {
    input.value = {
      text: value
    };
  } else if (typeof value === "number") {
    input.value = {
      number: value
    };
  } else {
    input.value = null;
  }

  await graphqlQuery(token, mutation, { input });
}

export async function addProjectItem(
  token: string,
  projectId: string,
  contentId: string
): Promise<GitHubProjectItem> {
  const mutation = `
    mutation($input: AddProjectV2ItemByIdInput!) {
      addProjectV2ItemById(input: $input) {
        item {
          id
          type
        }
      }
    }
  `;

  const data = await graphqlQuery(token, mutation, {
    input: {
      projectId,
      contentId
    }
  });

  // Fetch the full item details
  const items = await listProjectItems(token, projectId);
  const item = items.find((i) => i.id === data.addProjectV2ItemById.item.id);
  if (!item) {
    throw new Error("Failed to retrieve created item");
  }

  return item;
}
