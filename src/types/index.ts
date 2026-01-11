export interface Project {
  id: string
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
  userId: string // Added for querying
  repositories?: Array<{
    owner: string
    name: string
    fullName: string
    url: string
  }>
  githubProjects?: Array<{
    projectId: string
    name: string
    owner: string
    ownerType: 'user' | 'org'
    url?: string
  }>
  firebaseProjectId?: string
  settings: ProjectSettings
  metadata: Record<string, unknown>
}

export interface ProjectSettings {
  autoSync: boolean
  notifications: boolean
}

export interface GitHubRepository {
  id: number
  name: string
  full_name: string
  description: string | null
  private: boolean
  html_url: string
  created_at: string
  updated_at: string
}

export interface GitHubIssue {
  id: number
  number: number
  title: string
  body: string | null
  state: 'open' | 'closed'
  labels: Array<{ id: number; name: string; color: string }>
  created_at: string
  updated_at: string
  assignees?: Array<{ id: number; login: string; avatar_url?: string }>
  milestone?: {
    id: number
    title: string
    description?: string
    due_on?: string | null
    state: 'open' | 'closed'
  } | null
  html_url?: string
  user?: {
    id: number
    login: string
    avatar_url?: string
  }
  comments?: number
}

export interface GitHubIssueComment {
  id: number
  body: string
  user: {
    id: number
    login: string
    avatar_url?: string
  }
  created_at: string
  updated_at: string
  html_url?: string
}

export interface Task {
  id: string
  projectId: string
  userId: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  type: string
  input: unknown
  output?: unknown
  error?: string
  createdAt: Date
  completedAt?: Date
}

export interface User {
  id: string
  email: string
  name?: string
  createdAt: Date
  githubToken?: string // encrypted reference
  googleToken?: string // encrypted reference
}

export interface FirebaseProject {
  projectId: string
  projectNumber?: string
  displayName?: string
  name?: string
  resources?: {
    hostingSite?: string
    realtimeDatabaseInstance?: string
    storageBucket?: string
    locationId?: string
  }
}

export interface GitHubProject {
  id: string
  number: number
  title: string
  body?: string | null
  url: string
  shortDescription?: string | null
  closed: boolean
  closedAt?: string | null
  createdAt: string
  updatedAt: string
  public: boolean
  owner?: {
    id: string
    login: string
    type: 'User' | 'Organization'
  }
  creator?: {
    id: string
    login: string
  }
}

export interface GitHubProjectField {
  id: string
  name: string
  dataType: 'TEXT' | 'NUMBER' | 'DATE' | 'SINGLE_SELECT' | 'ITERATION'
  singleSelectOptions?: Array<{
    id: string
    name: string
    nameHTML?: string
    description?: string | null
  }>
}

export interface GitHubProjectItem {
  id: string
  type: 'ISSUE' | 'PULL_REQUEST' | 'DRAFT_ISSUE'
  content?: {
    id: number
    number: number
    title: string
    body?: string | null
    state?: 'OPEN' | 'CLOSED'
    url?: string
    repository?: {
      name: string
      owner: {
        login: string
      }
    }
  } | null
  fieldValues?: Array<{
    field: {
      id: string
      name: string
    }
    value?: string | number | null
    singleSelectOptionId?: string | null
    iterationId?: string | null
  }>
  createdAt?: string
  updatedAt?: string
}
