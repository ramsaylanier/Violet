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

    const projects = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        domains: data.domains
          ? data.domains.map((domain: any) => ({
              ...domain,
              linkedAt:
                domain.linkedAt?.toDate?.() ||
                (domain.linkedAt instanceof Date
                  ? domain.linkedAt
                  : new Date(domain.linkedAt))
            }))
          : undefined,
        hosting: data.hosting
          ? data.hosting.map((hosting: any) => ({
              ...hosting,
              linkedAt:
                hosting.linkedAt?.toDate?.() ||
                (hosting.linkedAt instanceof Date
                  ? hosting.linkedAt
                  : new Date(hosting.linkedAt))
            }))
          : undefined
      };
    });

    res.json(projects);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error listing projects:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
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
      userId
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
      ...projectData
    };

    res.json(project);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error creating project:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
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
      domains: data.domains
        ? data.domains.map((domain: any) => ({
            ...domain,
            linkedAt:
              domain.linkedAt?.toDate?.() ||
              (domain.linkedAt instanceof Date
                ? domain.linkedAt
                : new Date(domain.linkedAt))
          }))
        : undefined,
      hosting: data.hosting
        ? data.hosting.map((hosting: any) => ({
            ...hosting,
            linkedAt:
              hosting.linkedAt?.toDate?.() ||
              (hosting.linkedAt instanceof Date
                ? hosting.linkedAt
                : new Date(hosting.linkedAt))
          }))
        : undefined
    };

    res.json(project);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error getting project:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
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
      domains?: Array<{
        zoneId: string;
        zoneName: string;
        provider: "cloudflare";
        linkedAt: Date | string;
      }>;
      hosting?: Array<{
        id: string;
        provider: "cloudflare-pages" | "firebase-hosting";
        name: string;
        url?: string;
        status?: string;
        linkedAt: Date | string;
      }>;
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
      updatedAt: new Date()
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
    if (updates.domains !== undefined) {
      // Convert Date objects to Firestore Timestamps
      const { FieldValue } = await import("firebase-admin/firestore");
      if (updates.domains.length === 0) {
        updateData.domains = FieldValue.delete();
      } else {
        updateData.domains = updates.domains.map((domain) => ({
          ...domain,
          linkedAt:
            domain.linkedAt instanceof Date
              ? domain.linkedAt
              : new Date(domain.linkedAt)
        }));
      }
    }
    if (updates.hosting !== undefined) {
      // Convert Date objects to Firestore Timestamps
      const { FieldValue } = await import("firebase-admin/firestore");
      if (updates.hosting.length === 0) {
        updateData.hosting = FieldValue.delete();
      } else {
        updateData.hosting = updates.hosting.map((hosting) => ({
          ...hosting,
          linkedAt:
            hosting.linkedAt instanceof Date
              ? hosting.linkedAt
              : new Date(hosting.linkedAt)
        }));
      }
    }

    await adminDb.collection("projects").doc(id).update(updateData);

    const updatedDoc = await adminDb.collection("projects").doc(id).get();
    const updatedData = updatedDoc.data()!;

    // Convert Firestore Timestamps to Date objects for domains and hosting
    const project = {
      id: updatedDoc.id,
      ...updatedData,
      createdAt: updatedData.createdAt?.toDate() || new Date(),
      updatedAt: updatedData.updatedAt?.toDate() || new Date(),
      domains: updatedData.domains
        ? updatedData.domains.map((domain: any) => ({
            ...domain,
            linkedAt:
              domain.linkedAt?.toDate?.() ||
              (domain.linkedAt instanceof Date
                ? domain.linkedAt
                : new Date(domain.linkedAt))
          }))
        : undefined,
      hosting: updatedData.hosting
        ? updatedData.hosting.map((hosting: any) => ({
            ...hosting,
            linkedAt:
              hosting.linkedAt?.toDate?.() ||
              (hosting.linkedAt instanceof Date
                ? hosting.linkedAt
                : new Date(hosting.linkedAt))
          }))
        : undefined
    };

    res.json(project);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error updating project:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
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
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

export { router as projectRoutes };
