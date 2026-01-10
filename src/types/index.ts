export interface Project {
  id: string
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
  userId: string // Added for querying
  githubRepo?: {
    owner: string
    name: string
    fullName: string
    url: string
  }
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
}
