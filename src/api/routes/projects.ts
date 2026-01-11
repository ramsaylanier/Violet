/**
 * Projects API routes
 */

import express from "express";
import { adminDb } from "@/lib/firebase-admin";
import { getRequireAuth } from "./auth.js";
import type { ProjectSettings } from "@/types";

const router = express.Router();

/**
 * GET /api/projects
 * List all projects for the authenticated user
 */
router.get("/", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);

    const snapshot = await adminDb
      .collection("projects")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const projects = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    }));

    res.json(projects);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error listing projects:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/projects
 * Create a new project
 */
router.post("/", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const { name, description, settings, metadata } = req.body as {
      name: string;
      description?: string;
      settings?: ProjectSettings;
      metadata?: { [key: string]: string };
    };

    const projectData: any = {
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: settings || { autoSync: false, notifications: true },
      userId,
    };

    // Only include optional fields if they are defined (not undefined)
    if (description !== undefined) {
      projectData.description = description;
    }
    if (metadata !== undefined) {
      projectData.metadata = metadata;
    }

    const docRef = await adminDb.collection("projects").add(projectData);

    const project = {
      id: docRef.id,
      ...projectData,
    };

    res.json(project);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error creating project:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/projects/:id
 * Get a specific project
 */
router.get("/:id", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const { id } = req.params;

    const doc = await adminDb.collection("projects").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Project not found" });
    }

    const data = doc.data()!;

    // Verify ownership
    if (data.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const project = {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };

    res.json(project);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error getting project:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * PUT /api/projects/:id
 * Update a project
 */
router.put("/:id", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const { id } = req.params;
    const updates = req.body as {
      name?: string;
      description?: string;
      settings?: ProjectSettings;
      metadata?: { [key: string]: string };
      repositories?: Array<{
        owner: string;
        name: string;
        fullName: string;
        url: string;
      }>;
      firebaseProjectId?: string | null;
    };

    const doc = await adminDb.collection("projects").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Project not found" });
    }

    const data = doc.data()!;

    // Verify ownership
    if (data.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.settings !== undefined) updateData.settings = updates.settings;
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata;
    if (updates.repositories !== undefined) {
      // Use FieldValue.delete() if array is empty, otherwise set the array
      if (updates.repositories.length === 0) {
        const { FieldValue } = await import("firebase-admin/firestore");
        updateData.repositories = FieldValue.delete();
      } else {
        updateData.repositories = updates.repositories;
      }
    }
    if (updates.firebaseProjectId !== undefined) {
      // Support setting or removing the Firebase project ID
      if (
        updates.firebaseProjectId === null ||
        updates.firebaseProjectId === ""
      ) {
        const { FieldValue } = await import("firebase-admin/firestore");
        updateData.firebaseProjectId = FieldValue.delete();
      } else {
        updateData.firebaseProjectId = updates.firebaseProjectId;
      }
    }

    await adminDb.collection("projects").doc(id).update(updateData);

    const updatedDoc = await adminDb.collection("projects").doc(id).get();
    const updatedData = updatedDoc.data()!;

    const project = {
      id: updatedDoc.id,
      ...updatedData,
      createdAt: updatedData.createdAt?.toDate() || new Date(),
      updatedAt: updatedData.updatedAt?.toDate() || new Date(),
    };

    res.json(project);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error updating project:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete a project
 */
router.delete("/:id", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const { id } = req.params;

    const doc = await adminDb.collection("projects").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Project not found" });
    }

    const data = doc.data()!;

    // Verify ownership
    if (data.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await adminDb.collection("projects").doc(id).delete();

    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error deleting project:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export { router as projectRoutes };
