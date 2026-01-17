/**
 * Deployments API routes
 */

import express from "express";
import { adminDb } from "@/server/lib/firebase-admin";
import { getRequireAuth } from "./auth.js";
import { deployDeployment } from "@/server/services/deploymentService";
import type { Project } from "@/shared/types";

const router = express.Router();

/**
 * POST /api/deployments/:projectId/:deploymentId/deploy
 * Deploy a deployment to selected hosting providers
 */
router.post("/:projectId/:deploymentId/deploy", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const { projectId, deploymentId } = req.params;
    const { branch, hostingProviderIds } = req.body as {
      branch: string;
      hostingProviderIds: string[];
    };

    if (!branch) {
      return res.status(400).json({ error: "Branch is required" });
    }

    if (!hostingProviderIds || hostingProviderIds.length === 0) {
      return res
        .status(400)
        .json({ error: "At least one hosting provider must be selected" });
    }

    // Get project
    const projectDoc = await adminDb
      .collection("projects")
      .doc(projectId)
      .get();

    if (!projectDoc.exists) {
      return res.status(404).json({ error: "Project not found" });
    }

    const project = projectDoc.data()! as Project;

    // Verify ownership
    if (project.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Find deployment
    const deployment = project.deployments?.find((d) => d.id === deploymentId);

    console.log(deployment);

    if (!deployment) {
      return res.status(404).json({ error: "Deployment not found" });
    }

    // Deploy
    const status = await deployDeployment(
      userId,
      deployment,
      {
        firebaseProjectId: project.firebaseProjectId || null
      },
      {
        branch,
        hostingProviderIds
      }
    );

    res.json(status);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error deploying:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

export { router as deploymentRoutes };
