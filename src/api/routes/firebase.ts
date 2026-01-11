/**
 * Firebase API routes
 */

import express from 'express';
import { getRequireAuth } from './auth.js';
import {
  initializeFirestore,
  setupStorage,
  setupHosting,
  createFirestoreCollection,
} from '@/services/firebaseService';

const router = express.Router();

/**
 * POST /api/firebase/initialize-firestore
 * Initialize Firestore database
 */
router.post('/initialize-firestore', async (req, res) => {
  try {
    await getRequireAuth(req);
    const { projectId, databaseId, location } = req.body as {
      projectId: string;
      databaseId?: string;
      location?: string;
    };

    const result = await initializeFirestore(projectId, databaseId, location);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.error('Error initializing Firestore:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

/**
 * POST /api/firebase/setup-storage
 * Setup Firebase Storage
 */
router.post('/setup-storage', async (req, res) => {
  try {
    await getRequireAuth(req);
    const { projectId } = req.body as { projectId: string };

    const result = await setupStorage(projectId);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.error('Error setting up Storage:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

/**
 * POST /api/firebase/setup-hosting
 * Setup Firebase Hosting
 */
router.post('/setup-hosting', async (req, res) => {
  try {
    await getRequireAuth(req);
    const { projectId } = req.body as { projectId: string };

    const result = await setupHosting(projectId);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.error('Error setting up Hosting:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

/**
 * POST /api/firebase/create-firestore-collection
 * Create a Firestore collection
 */
router.post('/create-firestore-collection', async (req, res) => {
  try {
    await getRequireAuth(req);
    const { projectId, collectionId, initialData } = req.body as {
      projectId: string;
      collectionId: string;
      initialData?: Record<string, unknown>;
    };

    const result = await createFirestoreCollection(projectId, collectionId, initialData);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.error('Error creating Firestore collection:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

export { router as firebaseRoutes };
