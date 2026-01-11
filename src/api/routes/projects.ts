/**
 * Projects API routes
 */

import express from 'express';
import { adminDb } from '@/lib/firebase-admin';
import { getRequireAuth } from './auth.js';
import type { ProjectSettings } from '@/types';

const router = express.Router();

/**
 * GET /api/projects
 * List all projects for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const userId = await getRequireAuth(req);

    const snapshot = await adminDb
      .collection('projects')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const projects = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    }));

    res.json(projects);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.error('Error listing projects:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

/**
 * POST /api/projects
 * Create a new project
 */
router.post('/', async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const { name, description, settings, metadata } = req.body as {
      name: string;
      description?: string;
      settings?: ProjectSettings;
      metadata?: { [key: string]: string };
    };

    const projectData = {
      name,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: settings || { autoSync: false, notifications: true },
      metadata: metadata || null,
      userId,
    };

    const docRef = await adminDb.collection('projects').add(projectData);

    const project = {
      id: docRef.id,
      ...projectData,
    };

    res.json(project);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.error('Error creating project:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

export { router as projectRoutes };
