import type { createProject, updateProject } from '@/api/projects'

export const projectTools = [
  {
    name: 'create_project',
    description: 'Create a new development project. Use this when the user wants to create a new project.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'The name of the project' },
        description: { type: 'string', description: 'A description of the project' },
        settings: {
          type: 'object',
          properties: {
            autoSync: { type: 'boolean', description: 'Whether to automatically sync with GitHub/Firebase' },
            notifications: { type: 'boolean', description: 'Whether to enable notifications' },
          },
        },
        metadata: { type: 'object', description: 'Additional metadata for the project' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_project',
    description: 'Update an existing project. Use this when the user wants to modify a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'The ID of the project to update' },
        updates: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            githubRepo: { type: 'object' },
            firebaseProjectId: { type: 'string' },
          },
        },
      },
      required: ['projectId', 'updates'],
    },
  },
] as const
