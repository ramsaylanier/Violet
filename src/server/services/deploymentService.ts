/**
 * Deployment service - orchestrates downloads, builds, and deployments
 */

import * as fs from "fs/promises";
import * as path from "path";
import { tmpdir } from "os";
import type { Deployment, DeploymentStatus, Hosting } from "@/shared/types";
import {
  downloadGitHubTarball,
  extractTarball,
  detectProjectType,
  buildProject,
  deployToFirebaseHosting
} from "./firebaseHostingService";
import { getAccountId, deployToCloudflarePages } from "./cloudflareService";
import { getUserProfile } from "./authService";
import { decryptToken } from "@/server/lib/encryption";

/**
 * Download and build repository
 */
async function downloadAndBuildRepository(
  userId: string,
  owner: string,
  repo: string,
  branch: string
): Promise<string> {
  const user = await getUserProfile(userId);
  if (!user?.githubToken) {
    throw new Error("GitHub token not configured");
  }

  // GitHub tokens are used directly (not encrypted in this codebase)
  const githubToken = user.githubToken;

  // Download tarball
  const tarballPath = await downloadGitHubTarball(
    githubToken,
    owner,
    repo,
    branch
  );

  // Extract to temporary directory
  const extractPath = path.join(
    tmpdir(),
    `deploy-${owner}-${repo}-${Date.now()}-${Math.random().toString(36).substring(7)}`
  );

  await extractTarball(tarballPath, extractPath);

  // Detect project type and build if needed
  const projectType = await detectProjectType(extractPath);
  const buildDir = await buildProject(extractPath, projectType);

  return buildDir;
}

/**
 * Deploy to a hosting provider
 */
async function deployToHostingProvider(
  userId: string,
  hosting: Hosting,
  buildDir: string | null,
  project: { firebaseProjectId?: string | null }
): Promise<{
  providerId: string;
  provider: "firebase-hosting" | "cloudflare-pages";
  status: "success" | "error";
  url?: string;
  error?: string;
}> {
  try {
    if (hosting.provider === "firebase-hosting") {
      if (!project.firebaseProjectId) {
        throw new Error("Firebase project ID not configured");
      }

      // Extract siteId from hosting name or use a default
      // The hosting.name should be the siteId for Firebase
      const siteId = hosting.name;

      if (!project.firebaseProjectId || !buildDir) {
        throw new Error(
          !project.firebaseProjectId
            ? "Firebase project ID not configured"
            : "Build directory not available"
        );
      }

      const deployment = await deployToFirebaseHosting(
        userId,
        project.firebaseProjectId,
        siteId,
        buildDir
      );

      return {
        providerId: hosting.id,
        provider: "firebase-hosting",
        status: "success",
        url: deployment.url
      };
    } else if (hosting.provider === "cloudflare-pages") {
      const user = await getUserProfile(userId);
      if (!user?.cloudflareToken) {
        throw new Error("Cloudflare token not configured");
      }

      // Cloudflare tokens are stored encrypted, decrypt if needed
      let cloudflareToken: string;
      try {
        cloudflareToken = decryptToken(user.cloudflareToken);
      } catch {
        // If decryption fails, assume it's already plaintext (for development)
        cloudflareToken = user.cloudflareToken;
      }
      const accountId = await getAccountId(cloudflareToken);

      // Deploy to Cloudflare Pages
      const deployment = await deployToCloudflarePages(
        cloudflareToken,
        accountId,
        hosting.name
      );

      return {
        providerId: hosting.id,
        provider: "cloudflare-pages",
        status: "success",
        url: deployment.url
      };
    } else {
      throw new Error(`Unsupported hosting provider: ${hosting.provider}`);
    }
  } catch (error) {
    return {
      providerId: hosting.id,
      provider: hosting.provider,
      status: "error",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Clean up temporary directory
 */
async function cleanupTempDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    console.error(`Failed to cleanup directory ${dirPath}:`, error);
    // Don't throw - cleanup failures shouldn't break the flow
  }
}

/**
 * Deploy a deployment to selected hosting providers
 */
export async function deployDeployment(
  userId: string,
  deployment: Deployment,
  project: {
    firebaseProjectId?: string | null;
  },
  options: {
    branch: string;
    hostingProviderIds: string[];
  }
): Promise<DeploymentStatus> {
  const statusId = `deploy-${Date.now()}`;
  let buildDir: string | null = null;

  try {
    // Validate deployment has repository
    if (!deployment.repository) {
      throw new Error("Deployment does not have a repository configured");
    }

    // Validate hosting providers
    const selectedHosting = (deployment.hosting || []).filter((h) =>
      options.hostingProviderIds.includes(h.id)
    );

    if (selectedHosting.length === 0) {
      throw new Error("No valid hosting providers selected");
    }

    const { owner, name } = deployment.repository;

    // Step 1: Download and build
    buildDir = await downloadAndBuildRepository(
      userId,
      owner,
      name,
      options.branch
    );

    // Step 2: Deploy to each selected hosting provider
    const deploymentResults = await Promise.allSettled(
      selectedHosting.map((hosting) =>
        deployToHostingProvider(userId, hosting, buildDir, project)
      )
    );

    const deployments = deploymentResults.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        const hosting = selectedHosting[index];
        return {
          providerId: hosting.id,
          provider: hosting.provider,
          status: "error" as const,
          error: result.reason?.message || String(result.reason)
        };
      }
    });

    // Check if all deployments succeeded
    const allSucceeded = deployments.every((d) => d.status === "success");
    const anySucceeded = deployments.some((d) => d.status === "success");

    return {
      id: statusId,
      step: allSucceeded ? "success" : anySucceeded ? "success" : "error",
      progress: 100,
      message: allSucceeded
        ? "Deployment completed successfully"
        : anySucceeded
          ? "Deployment completed with some errors"
          : "Deployment failed",
      deployments
    };
  } catch (error) {
    return {
      id: statusId,
      step: "error",
      progress: 0,
      message: "Deployment failed",
      error: error instanceof Error ? error.message : String(error),
      deployments: []
    };
  } finally {
    // Cleanup build directory
    if (buildDir) {
      await cleanupTempDir(buildDir);
    }
  }
}
