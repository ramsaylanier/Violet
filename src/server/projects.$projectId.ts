import { createServerFn } from '@tanstack/react-start'
import { adminDb } from '@/lib/firebase-admin'
import { requireAuth } from '@/server/auth'
import type { Project } from '@/types'

export const getProject = createServerFn({
  method: 'GET',
})
  .handler(async (ctx) => {
    const userId = await requireAuth()
    const { projectId } = (ctx.data as unknown) as { projectId: string }

    const doc = await adminDb.collection('projects').doc(projectId).get()

    if (!doc.exists) {
      throw new Error('Project not found')
    }

    const projectData = doc.data()
    if (projectData?.userId !== userId) {
      throw new Error('Forbidden')
    }

    const project: Project = {
      id: doc.id,
      ...projectData,
      createdAt: projectData?.createdAt?.toDate() || new Date(),
      updatedAt: projectData?.updatedAt?.toDate() || new Date(),
    } as Project

    return project
  })

export const updateProject = createServerFn({
  method: 'POST',
})
  .handler(async (ctx) => {
    const userId = await requireAuth()
    const { projectId, updates } = (ctx.data as unknown) as { projectId: string; updates: Partial<Project> }

    const doc = await adminDb.collection('projects').doc(projectId).get()

    if (!doc.exists) {
      throw new Error('Project not found')
    }

    const projectData = doc.data()
    if (projectData?.userId !== userId) {
      throw new Error('Forbidden')
    }

    await adminDb.collection('projects').doc(projectId).update({
      ...updates,
      updatedAt: new Date(),
    })

    const updatedDoc = await adminDb.collection('projects').doc(projectId).get()
    const updatedProject: Project = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      createdAt: updatedDoc.data()?.createdAt?.toDate() || new Date(),
      updatedAt: updatedDoc.data()?.updatedAt?.toDate() || new Date(),
    } as Project

    return updatedProject
  })

export const deleteProject = createServerFn({
  method: 'DELETE',
})
  .handler(async (ctx) => {
    const request = (ctx.context as any)?.request as Request | undefined
    const authHeader = request?.headers?.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Unauthorized')
    }

    const token = authHeader.substring(7)
    const userId = await verifyIdToken(token)
    const { projectId } = (ctx.data as unknown) as { projectId: string }

    const doc = await adminDb.collection('projects').doc(projectId).get()

    if (!doc.exists) {
      throw new Error('Project not found')
    }

    const projectData = doc.data()
    if (projectData?.userId !== userId) {
      throw new Error('Forbidden')
    }

    await adminDb.collection('projects').doc(projectId).delete()

    return { success: true }
  })
