/**
 * Project by ID API routes
 */

import express from 'express';
import { adminDb } from '@/lib/firebase-admin';
import { getRequireAuth } from './auth.js';
import type { ProjectSettings } from '@/types';

const router = express.Router();

/**
 * GET /api/projects/:id
 * Get a specific project
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const { id } = req.params;

    const doc = await adminDb.collection('projects').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const data = doc.data()!;
    
    // Verify ownership
    if (data.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const project = {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };

    res.json(project);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.error('Error getting project:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

/**
 * PUT /api/projects/:id
 * Update a project
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const { id } = req.params;
    const { name, description, settings, metadata } = req.body as {
      name?: string;
      description?: string;
      settings?: ProjectSettings;
      metadata?: { [key: string]: string };
    };

    const doc = await adminDb.collection('projects').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const data = doc.data()!;
    
    // Verify ownership
    if (data.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (settings !== undefined) updateData.settings = settings;
    if (metadata !== undefined) updateData.metadata = metadata;

    await adminDb.collection('projects').doc(id).update(updateData);

    const updatedDoc = await adminDb.collection('projects').doc(id).get();
    const updatedData = updatedDoc.data()!;

    const project = {
      id: updatedDoc.id,
      ...updatedData,
      createdAt: updatedData.createdAt?.toDate() || new Date(),
      updatedAt: updatedData.updatedAt?.toDate() || new Date(),
    };

    res.json(project);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.error('Error updating project:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete a project
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const { id } = req.params;

    const doc = await adminDb.collection('projects').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const data = doc.data()!;
    
    // Verify ownership
    if (data.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await adminDb.collection('projects').doc(id).delete();

    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.error('Error deleting project:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

export { router as projectByIdRoutes };
