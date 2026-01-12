
export const githubTools = [
  {
    name: "create_github_repository",
    description:
      "Create a new GitHub repository. Use this when the user wants to create a new repository.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "The name of the repository" },
        description: {
          type: "string",
          description: "A description of the repository"
        },
        private: {
          type: "boolean",
          description: "Whether the repository should be private",
          default: false
        }
      },
      required: ["name"]
    }
  },
  {
    name: "create_github_issue",
    description:
      "Create a new GitHub issue in a repository. Use this when the user wants to create an issue.",
    inputSchema: {
      type: "object",
      properties: {
        owner: {
          type: "string",
          description: "The owner of the repository (username or org)"
        },
        repo: { type: "string", description: "The name of the repository" },
        title: { type: "string", description: "The title of the issue" },
        body: { type: "string", description: "The body content of the issue" },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Labels to apply to the issue"
        }
      },
      required: ["owner", "repo", "title"]
    }
  },
  {
    name: "list_github_repositories",
    description:
      "List all GitHub repositories for the authenticated user. Use this to see what repositories exist.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
] as const;
