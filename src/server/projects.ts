import { createServerFn } from '@tanstack/start-client-core'
import { adminDb } from '@/lib/firebase-admin'
import { verifyIdToken } from '@/services/authService'
import type { Project, ProjectSettings } from '@/types'

export const listProjects = createServerFn({
  method: 'GET',
})
  .handler(async (ctx) => {
    const request = (ctx.context as any)?.request as Request | undefined
    const authHeader = request?.headers?.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Unauthorized')
    }

    const token = authHeader.substring(7)
    const userId = await verifyIdToken(token)

    const snapshot = await adminDb
      .collection('projects')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get()

    const projects: Project[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Project[]

    return projects
  })

export const createProject = createServerFn({
  method: 'POST',
})
  .handler(async (ctx) => {
    const request = (ctx.context as any)?.request
    const authHeader = request?.headers?.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Unauthorized')
    }

    const token = authHeader.substring(7)
    const userId = await verifyIdToken(token)
    const { name, description, settings, metadata } = (ctx.data as unknown) as { name: string; description?: string; settings?: ProjectSettings; metadata?: Record<string, unknown> }

    const projectData: Omit<Project, 'id'> = {
      name,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: settings || { autoSync: false, notifications: true },
      metadata: metadata || {},
      userId, // Add userId for querying
    }

    const docRef = await adminDb.collection('projects').add(projectData)

    const project: Project = {
      id: docRef.id,
      ...projectData,
    }

    return project
  })
