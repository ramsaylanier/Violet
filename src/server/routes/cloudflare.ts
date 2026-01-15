/**
 * Cloudflare API routes
 */

import express from "express";
import {
  listZones,
  getZone,
  listDNSRecords,
  getDNSRecord,
  createDNSRecord,
  updateDNSRecord,
  deleteDNSRecord,
  getSSLSettings,
  updateSSLSettings,
  getZoneSetting,
  updateZoneSetting,
  verifyToken,
  getAccountId,
  listPagesProjects,
  getPagesProject,
  createPagesProject,
  listPagesDeployments,
  getPagesDeployment,
  deletePagesProject
} from "@/server/services/cloudflareService";
import { getRequireAuth } from "./auth.js";
import {
  getUserProfile,
  updateUserProfile
} from "@/server/services/authService";
import { encryptToken, decryptToken } from "@/server/lib/encryption";
import { adminDb } from "@/server/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const router = express.Router();

/**
 * POST /api/cloudflare/token
 * Store/update Cloudflare API token (encrypted)
 */
router.post("/token", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const { token } = req.body as { token: string };

    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Token is required" });
    }

    // Trim whitespace from token
    const trimmedToken = token.trim();

    // Verify the token by making a test request
    const verificationResult = await verifyToken(trimmedToken);
    if (!verificationResult.valid) {
      console.error(
        "Cloudflare token verification failed:",
        verificationResult.error
      );
      return res.status(400).json({
        error: verificationResult.error || "Invalid Cloudflare API token"
      });
    }

    // Encrypt the token before storing
    let encryptedToken: string;
    try {
      encryptedToken = encryptToken(trimmedToken);
    } catch (encryptError) {
      console.error("Error encrypting token:", encryptError);
      const errorMessage =
        encryptError instanceof Error
          ? encryptError.message
          : "Failed to encrypt token";

      // Check if it's the ENCRYPTION_KEY missing error
      if (errorMessage.includes("ENCRYPTION_KEY")) {
        return res.status(500).json({
          error:
            "Server configuration error: Encryption key not set. Please contact support."
        });
      }

      return res.status(500).json({
        error: `Failed to encrypt token: ${errorMessage}`
      });
    }

    // Store the encrypted token
    await updateUserProfile(userId, { cloudflareToken: encryptedToken });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error storing Cloudflare token:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * DELETE /api/cloudflare/token
 * Remove Cloudflare API token
 */
router.delete("/token", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);

    // Use FieldValue.delete() to properly remove the field
    await adminDb.collection("users").doc(userId).update({
      cloudflareToken: FieldValue.delete()
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Error removing Cloudflare token:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * Helper function to get decrypted Cloudflare token for a user
 */
async function getCloudflareToken(userId: string): Promise<string> {
  const user = await getUserProfile(userId);

  if (!user?.cloudflareToken) {
    throw new Error("Cloudflare token not configured");
  }

  try {
    return decryptToken(user.cloudflareToken);
  } catch (error) {
    console.error("Error decrypting Cloudflare token:", error);
    throw new Error("Failed to decrypt Cloudflare token");
  }
}

/**
 * GET /api/cloudflare/zones
 * List all zones (domains)
 */
router.get("/zones", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const token = await getCloudflareToken(userId);

    const zones = await listZones(token);
    res.json(zones);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (error instanceof Error && error.message.includes("not configured")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error listing zones:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * GET /api/cloudflare/zones/:zoneId
 * Get zone details
 */
router.get("/zones/:zoneId", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const token = await getCloudflareToken(userId);
    const { zoneId } = req.params;

    const zone = await getZone(token, zoneId);
    res.json(zone);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (error instanceof Error && error.message.includes("not configured")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error getting zone:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * GET /api/cloudflare/zones/:zoneId/dns-records
 * List DNS records for a zone
 */
router.get("/zones/:zoneId/dns-records", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const token = await getCloudflareToken(userId);
    const { zoneId } = req.params;
    const { type, name, content, match, per_page, page } = req.query as {
      type?: string;
      name?: string;
      content?: string;
      match?: "all" | "any";
      per_page?: string;
      page?: string;
    };

    const records = await listDNSRecords(token, zoneId, {
      type,
      name,
      content,
      match,
      per_page: per_page ? parseInt(per_page, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined
    });
    res.json(records);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (error instanceof Error && error.message.includes("not configured")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error listing DNS records:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * GET /api/cloudflare/zones/:zoneId/dns-records/:recordId
 * Get DNS record by ID
 */
router.get("/zones/:zoneId/dns-records/:recordId", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const token = await getCloudflareToken(userId);
    const { zoneId, recordId } = req.params;

    const record = await getDNSRecord(token, zoneId, recordId);
    res.json(record);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (error instanceof Error && error.message.includes("not configured")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error getting DNS record:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * POST /api/cloudflare/zones/:zoneId/dns-records
 * Create DNS record
 */
router.post("/zones/:zoneId/dns-records", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const token = await getCloudflareToken(userId);
    const { zoneId } = req.params;
    const record = req.body as {
      type: string;
      name: string;
      content: string;
      ttl?: number;
      priority?: number;
      proxied?: boolean;
      comment?: string;
      tags?: string[];
    };

    if (!record.type || !record.name || !record.content) {
      return res.status(400).json({
        error: "type, name, and content are required"
      });
    }

    const newRecord = await createDNSRecord(token, zoneId, record);
    res.json(newRecord);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (error instanceof Error && error.message.includes("not configured")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error creating DNS record:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * PATCH /api/cloudflare/zones/:zoneId/dns-records/:recordId
 * Update DNS record
 */
router.patch("/zones/:zoneId/dns-records/:recordId", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const token = await getCloudflareToken(userId);
    const { zoneId, recordId } = req.params;
    const updates = req.body as {
      type?: string;
      name?: string;
      content?: string;
      ttl?: number;
      priority?: number;
      proxied?: boolean;
      comment?: string;
      tags?: string[];
    };

    const updatedRecord = await updateDNSRecord(
      token,
      zoneId,
      recordId,
      updates
    );
    res.json(updatedRecord);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (error instanceof Error && error.message.includes("not configured")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error updating DNS record:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * DELETE /api/cloudflare/zones/:zoneId/dns-records/:recordId
 * Delete DNS record
 */
router.delete("/zones/:zoneId/dns-records/:recordId", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const token = await getCloudflareToken(userId);
    const { zoneId, recordId } = req.params;

    await deleteDNSRecord(token, zoneId, recordId);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (error instanceof Error && error.message.includes("not configured")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error deleting DNS record:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * GET /api/cloudflare/zones/:zoneId/ssl
 * Get SSL/TLS settings for a zone
 */
router.get("/zones/:zoneId/ssl", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const token = await getCloudflareToken(userId);
    const { zoneId } = req.params;

    const sslSettings = await getSSLSettings(token, zoneId);
    res.json(sslSettings);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (error instanceof Error && error.message.includes("not configured")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error getting SSL settings:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * PATCH /api/cloudflare/zones/:zoneId/ssl
 * Update SSL/TLS settings for a zone
 */
router.patch("/zones/:zoneId/ssl", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const token = await getCloudflareToken(userId);
    const { zoneId } = req.params;
    const settings = req.body as { enabled: boolean };

    const updatedSettings = await updateSSLSettings(token, zoneId, settings);
    res.json(updatedSettings);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (error instanceof Error && error.message.includes("not configured")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error updating SSL settings:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * GET /api/cloudflare/zones/:zoneId/settings/:settingName
 * Get zone setting
 */
router.get("/zones/:zoneId/settings/:settingName", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const token = await getCloudflareToken(userId);
    const { zoneId, settingName } = req.params;

    const setting = await getZoneSetting(token, zoneId, settingName);
    res.json(setting);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (error instanceof Error && error.message.includes("not configured")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error getting zone setting:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * PATCH /api/cloudflare/zones/:zoneId/settings/:settingName
 * Update zone setting
 */
router.patch("/zones/:zoneId/settings/:settingName", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const token = await getCloudflareToken(userId);
    const { zoneId, settingName } = req.params;
    const { value } = req.body as { value: string | number | boolean };

    if (value === undefined) {
      return res.status(400).json({ error: "value is required" });
    }

    const updatedSetting = await updateZoneSetting(
      token,
      zoneId,
      settingName,
      value
    );
    res.json(updatedSetting);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (error instanceof Error && error.message.includes("not configured")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error updating zone setting:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * GET /api/cloudflare/account
 * Get Cloudflare account ID
 */
router.get("/account", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const token = await getCloudflareToken(userId);

    const accountId = await getAccountId(token);
    res.json({ accountId });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (error instanceof Error && error.message.includes("not configured")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error getting account ID:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * GET /api/cloudflare/pages/projects
 * List Cloudflare Pages projects
 */
router.get("/pages/projects", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const token = await getCloudflareToken(userId);
    const { accountId } = req.query as { accountId?: string };

    if (!accountId) {
      // Get account ID if not provided
      const account = await getAccountId(token);
      const projects = await listPagesProjects(token, account);
      return res.json(projects);
    }

    const projects = await listPagesProjects(token, accountId);
    res.json(projects);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (error instanceof Error && error.message.includes("not configured")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error listing Pages projects:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * GET /api/cloudflare/pages/projects/:projectName
 * Get Pages project details
 */
router.get("/pages/projects/:projectName", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const token = await getCloudflareToken(userId);
    const { projectName } = req.params;
    const { accountId } = req.query as { accountId?: string };

    if (!accountId) {
      const account = await getAccountId(token);
      const project = await getPagesProject(token, account, projectName);
      return res.json(project);
    }

    const project = await getPagesProject(token, accountId, projectName);
    res.json(project);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (error instanceof Error && error.message.includes("not configured")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error getting Pages project:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * POST /api/cloudflare/pages/projects
 * Create a new Pages project
 */
router.post("/pages/projects", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const token = await getCloudflareToken(userId);
    const { accountId, ...projectData } = req.body as {
      accountId?: string;
      name: string;
      production_branch?: string;
      build_config?: {
        build_command?: string;
        destination_dir?: string;
        root_dir?: string;
      };
    };

    if (!projectData.name) {
      return res.status(400).json({ error: "Project name is required" });
    }

    const finalAccountId = accountId || (await getAccountId(token));
    const project = await createPagesProject(
      token,
      finalAccountId,
      projectData
    );
    res.json(project);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (error instanceof Error && error.message.includes("not configured")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error creating Pages project:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * DELETE /api/cloudflare/pages/projects/:projectName
 * Delete a Pages project
 */
router.delete("/pages/projects/:projectName", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const token = await getCloudflareToken(userId);
    const { projectName } = req.params;
    const { accountId } = req.query as { accountId?: string };

    const finalAccountId = accountId || (await getAccountId(token));
    await deletePagesProject(token, finalAccountId, projectName);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (error instanceof Error && error.message.includes("not configured")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error deleting Pages project:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * GET /api/cloudflare/pages/projects/:projectName/deployments
 * List deployments for a Pages project
 */
router.get("/pages/projects/:projectName/deployments", async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const token = await getCloudflareToken(userId);
    const { projectName } = req.params;
    const { accountId, page, per_page } = req.query as {
      accountId?: string;
      page?: string;
      per_page?: string;
    };

    const finalAccountId = accountId || (await getAccountId(token));
    const deployments = await listPagesDeployments(
      token,
      finalAccountId,
      projectName,
      {
        page: page ? parseInt(page, 10) : undefined,
        per_page: per_page ? parseInt(per_page, 10) : undefined
      }
    );
    res.json(deployments);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (error instanceof Error && error.message.includes("not configured")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error listing deployments:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

/**
 * GET /api/cloudflare/pages/projects/:projectName/deployments/:deploymentId
 * Get deployment details
 */
router.get(
  "/pages/projects/:projectName/deployments/:deploymentId",
  async (req, res) => {
    try {
      const userId = await getRequireAuth(req);
      const token = await getCloudflareToken(userId);
      const { projectName, deploymentId } = req.params;
      const { accountId } = req.query as { accountId?: string };

      const finalAccountId = accountId || (await getAccountId(token));
      const deployment = await getPagesDeployment(
        token,
        finalAccountId,
        projectName,
        deploymentId
      );
      res.json(deployment);
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") {
        return res.status(401).json({ error: "Unauthorized" });
      }
      if (error instanceof Error && error.message.includes("not configured")) {
        return res.status(400).json({ error: error.message });
      }
      console.error("Error getting deployment:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error"
      });
    }
  }
);

export { router as cloudflareRoutes };
