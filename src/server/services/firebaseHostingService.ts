import * as fs from "fs/promises";
import * as path from "path";
import { tmpdir } from "os";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import * as tar from "tar";
import { gzip } from "zlib";
import { promisify } from "util";
import type {
  FirebaseHostingDeployment,
  FirebaseHostingSite
} from "@/shared/types";
import { withTokenRefresh } from "./googleTokenService";

const gzipAsync = promisify(gzip);

/**
 * Download GitHub repository as tarball
 * Note: Firebase's "native" GitHub integration actually uses GitHub Actions,
 * which requires setup in the repo. For API-based deployment, we download
 * the repo as a tarball and deploy via API (same as GitLab).
 */
export async function downloadGitHubTarball(
  githubToken: string,
  owner: string,
  repo: string,
  branch: string = "main"
): Promise<string> {
  let tarballPath: string | null = null;
  try {
    // GitHub tarball API: https://api.github.com/repos/{owner}/{repo}/tarball/{ref}
    const tarballUrl = `https://api.github.com/repos/${owner}/${repo}/tarball/${branch}`;

    const tarballResponse = await fetch(tarballUrl, {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: "application/vnd.github.v3.raw"
      }
    });

    if (!tarballResponse.ok) {
      const errorText = await tarballResponse.text().catch(() => "");
      throw new Error(
        `Failed to download GitHub tarball: ${tarballResponse.statusText}${errorText ? ` - ${errorText}` : ""}`
      );
    }

    // Save to temporary file
    const tempDir = tmpdir();
    tarballPath = path.join(
      tempDir,
      `github-${owner}-${repo}-${Date.now()}-${Math.random().toString(36).substring(7)}.tar.gz`
    );

    const fileStream = createWriteStream(tarballPath);
    await pipeline(tarballResponse.body as any, fileStream);

    return tarballPath;
  } catch (error) {
    // Clean up tarball on error
    if (tarballPath) {
      try {
        await fs.unlink(tarballPath);
      } catch (cleanupError) {
        console.error("Failed to cleanup tarball:", cleanupError);
      }
    }
    console.error("Error downloading GitHub tarball:", error);
    throw error;
  }
}

/**
 * Download GitLab repository as tarball
 */
export async function downloadGitLabTarball(
  gitlabToken: string,
  owner: string,
  repo: string,
  branch: string = "main"
): Promise<string> {
  let tarballPath: string | null = null;
  try {
    // First, get the project ID
    const projectResponse = await fetch(
      `https://gitlab.com/api/v4/projects/${encodeURIComponent(`${owner}/${repo}`)}`,
      {
        headers: {
          "PRIVATE-TOKEN": gitlabToken
        }
      }
    );

    if (!projectResponse.ok) {
      const errorData = await projectResponse.json().catch(() => ({}));
      throw new Error(
        errorData.message ||
          `Failed to get GitLab project: ${projectResponse.statusText}`
      );
    }

    const project = await projectResponse.json();
    const projectId = project.id;

    if (!projectId) {
      throw new Error("Project ID not found in GitLab response");
    }

    // Download the tarball
    const tarballUrl = `https://gitlab.com/api/v4/projects/${projectId}/repository/archive.tar.gz?sha=${encodeURIComponent(branch)}`;

    const tarballResponse = await fetch(tarballUrl, {
      headers: {
        "PRIVATE-TOKEN": gitlabToken
      }
    });

    if (!tarballResponse.ok) {
      const errorData = await tarballResponse.text().catch(() => "");
      throw new Error(
        `Failed to download tarball: ${tarballResponse.statusText}${errorData ? ` - ${errorData}` : ""}`
      );
    }

    // Save to temporary file
    const tempDir = tmpdir();
    tarballPath = path.join(
      tempDir,
      `gitlab-${owner}-${repo}-${Date.now()}-${Math.random().toString(36).substring(7)}.tar.gz`
    );

    const fileStream = createWriteStream(tarballPath);
    await pipeline(tarballResponse.body as any, fileStream);

    return tarballPath;
  } catch (error) {
    // Clean up tarball on error
    if (tarballPath) {
      try {
        await fs.unlink(tarballPath);
      } catch (cleanupError) {
        console.error("Failed to cleanup tarball:", cleanupError);
      }
    }
    console.error("Error downloading GitLab tarball:", error);
    throw error;
  }
}

/**
 * Extract tarball to directory
 */
export async function extractTarball(
  tarballPath: string,
  extractPath: string
): Promise<string> {
  try {
    // Ensure extract path exists
    await fs.mkdir(extractPath, { recursive: true });

    await tar.extract({
      file: tarballPath,
      cwd: extractPath,
      strip: 1 // Remove the root directory from the archive
    });

    // Clean up tarball after successful extraction
    try {
      await fs.unlink(tarballPath);
    } catch (unlinkError) {
      console.warn("Failed to delete tarball after extraction:", unlinkError);
      // Don't throw - extraction was successful
    }

    return extractPath;
  } catch (error) {
    // Clean up extract directory on error
    try {
      await fs.rm(extractPath, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error("Failed to cleanup extract directory:", cleanupError);
    }
    console.error("Error extracting tarball:", error);
    throw error;
  }
}

/**
 * Detect project type (static site vs SPA)
 */
export async function detectProjectType(
  repoPath: string
): Promise<{ type: "static" | "spa"; buildDir?: string }> {
  try {
    const packageJsonPath = path.join(repoPath, "package.json");
    const firebaseJsonPath = path.join(repoPath, "firebase.json");
    const indexHtmlPath = path.join(repoPath, "index.html");

    // Check for package.json (SPA)
    try {
      const packageJson = JSON.parse(
        await fs.readFile(packageJsonPath, "utf-8")
      );

      // Check for build scripts
      const hasBuildScript =
        packageJson.scripts?.build || packageJson.scripts?.["build:prod"];

      // Check for common build output directories
      const possibleDirs = ["dist", "build", "out", "public", ".next"];
      for (const dir of possibleDirs) {
        const dirPath = path.join(repoPath, dir);
        try {
          const stats = await fs.stat(dirPath);
          if (stats.isDirectory()) {
            return { type: "spa", buildDir: dir };
          }
        } catch {
          // Directory doesn't exist, continue
        }
      }

      // If package.json exists with build script, it's an SPA that needs building
      if (hasBuildScript) {
        return { type: "spa" };
      }
    } catch {
      // No package.json, continue checking
    }

    // Check for firebase.json (may have hosting config)
    try {
      const firebaseJson = JSON.parse(
        await fs.readFile(firebaseJsonPath, "utf-8")
      );
      if (firebaseJson.hosting?.public) {
        return { type: "static", buildDir: firebaseJson.hosting.public };
      }
    } catch {
      // No firebase.json or invalid, continue
    }

    // Check for index.html in root (static site)
    try {
      await fs.access(indexHtmlPath);
      return { type: "static" };
    } catch {
      // No index.html
    }

    // Default to static
    return { type: "static" };
  } catch (error) {
    console.error("Error detecting project type:", error);
    return { type: "static" };
  }
}

/**
 * Build project if needed
 */
export async function buildProject(
  repoPath: string,
  projectType: { type: "static" | "spa"; buildDir?: string }
): Promise<string> {
  try {
    if (projectType.type === "static" && projectType.buildDir) {
      // Already built, return the build directory
      return path.join(repoPath, projectType.buildDir);
    }

    if (projectType.type === "static") {
      // Static site, no build needed
      return repoPath;
    }

    // SPA - need to build
    const packageJsonPath = path.join(repoPath, "package.json");
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));

    // Install dependencies
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);

    // Check for package manager
    const hasYarn = await fs
      .access(path.join(repoPath, "yarn.lock"))
      .then(() => true)
      .catch(() => false);

    const installCmd = hasYarn ? "yarn install" : "npm install";

    try {
      await execAsync(installCmd, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large outputs
      });
    } catch (installError: any) {
      throw new Error(
        `Failed to install dependencies: ${installError.message || installError}`
      );
    }

    // Build
    const buildScript = packageJson.scripts?.build;
    if (!buildScript) {
      throw new Error("No build script found in package.json");
    }

    try {
      await execAsync(buildScript, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large outputs
      });
    } catch (buildError: any) {
      throw new Error(`Build failed: ${buildError.message || buildError}`);
    }

    // Determine output directory
    const outputDirs = ["dist", "build", "out", "public", ".next"];
    for (const dir of outputDirs) {
      const dirPath = path.join(repoPath, dir);
      try {
        const stats = await fs.stat(dirPath);
        if (stats.isDirectory()) {
          return dirPath;
        }
      } catch {
        // Directory doesn't exist
      }
    }

    // Default to repo root if no build dir found
    return repoPath;
  } catch (error) {
    console.error("Error building project:", error);
    throw error;
  }
}

/**
 * Deploy to Firebase Hosting using API
 * Automatically refreshes token if expired
 */
export async function deployToFirebaseHosting(
  userId: string,
  firebaseProjectId: string,
  siteId: string,
  buildDir: string
): Promise<FirebaseHostingDeployment> {
  return withTokenRefresh(userId, async (accessToken) => {
    try {
      // Step 1: Create a new version
      const versionResponse = await fetch(
        `https://firebasehosting.googleapis.com/v1beta1/sites/${siteId}/versions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            config: {
              headers: [
                {
                  glob: "**",
                  headers: {
                    "Cache-Control": "max-age=3600"
                  }
                }
              ]
            }
          })
        }
      );

      if (!versionResponse.ok) {
        const errorData = await versionResponse.json().catch(() => ({}));
        const errorText = await versionResponse.text().catch(() => "");
        throw new Error(
          errorData.error?.message ||
            `Failed to create version: ${versionResponse.statusText}${errorText ? ` - ${errorText}` : ""}`
        );
      }

      const versionData = await versionResponse.json();
      const versionName = versionData.name;

      if (!versionName) {
        console.error(
          "Version creation response:",
          JSON.stringify(versionData, null, 2)
        );
        throw new Error(
          "Version name not returned from version creation. Response: " +
            JSON.stringify(versionData)
        );
      }

      // Step 2: Get list of files and prepare for upload
      const files = await getAllFiles(buildDir);
      const fileHashes: Record<string, string> = {};
      const fileContents: Record<string, Buffer> = {};

      // Calculate hashes for all files (must be gzipped first)
      for (const file of files) {
        const fullPath = path.join(buildDir, file);
        const content = await fs.readFile(fullPath);
        fileContents[file] = content;

        // Gzip the file content before hashing
        const gzippedContent = await gzipAsync(content);
        // File paths must start with /
        const filePath = file.startsWith("/") ? file : `/${file}`;
        fileHashes[filePath] = await calculateHash(gzippedContent);
      }

      // Step 3: Populate files (get upload URLs)
      // versionName should be in format: sites/{siteId}/versions/{versionId}
      // We need to use the full API URL
      const populateUrl = versionName.startsWith("https://")
        ? `${versionName}:populateFiles`
        : `https://firebasehosting.googleapis.com/v1beta1/${versionName}:populateFiles`;

      const populateResponse = await fetch(populateUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          files: fileHashes
        })
      });

      if (!populateResponse.ok) {
        const errorData = await populateResponse.json().catch(() => ({}));
        const errorText = await populateResponse.text().catch(() => "");
        throw new Error(
          errorData.error?.message ||
            `Failed to populate files: ${populateResponse.statusText}${errorText ? ` - ${errorText}` : ""}`
        );
      }

      const populateData = await populateResponse.json();
      const uploadRequiredHashes = populateData.uploadRequiredHashes || [];
      const uploadUrl = populateData.uploadUrl;

      if (!uploadUrl) {
        throw new Error("Upload URL not returned from populateFiles");
      }

      // Step 4: Upload files that need uploading (as gzipped)
      const uploadPromises = uploadRequiredHashes.map(async (hash: string) => {
        // Find the file path that matches this hash
        const filePath = Object.keys(fileHashes).find(
          (f) => fileHashes[f] === hash
        );
        if (!filePath) {
          console.warn(`File not found for hash: ${hash}`);
          return;
        }

        // Remove leading / to get relative path
        const relativePath = filePath.startsWith("/")
          ? filePath.slice(1)
          : filePath;
        const content = fileContents[relativePath];
        if (!content) {
          console.warn(`Content not found for file: ${relativePath}`);
          return;
        }

        // Gzip the content for upload
        const gzippedContent = await gzipAsync(content);

        // Upload to the specific hash endpoint
        const fileUploadUrl = `${uploadUrl}/${hash}`;

        const uploadResponse = await fetch(fileUploadUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/octet-stream"
          },
          body: gzippedContent
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text().catch(() => "");
          throw new Error(
            `Failed to upload file ${filePath}: ${uploadResponse.statusText}${errorText ? ` - ${errorText}` : ""}`
          );
        }
      });

      await Promise.all(uploadPromises);

      // Step 5: Finalize version (update status to FINALIZED)
      // According to docs: PATCH with update_mask=status
      const finalizeUrl = versionName.startsWith("https://")
        ? `${versionName}?update_mask=status`
        : `https://firebasehosting.googleapis.com/v1beta1/${versionName}?update_mask=status`;

      const finalizeResponse = await fetch(finalizeUrl, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: "FINALIZED"
        })
      });

      if (!finalizeResponse.ok) {
        const errorData = await finalizeResponse.json().catch(() => ({}));
        const errorText = await finalizeResponse.text().catch(() => "");
        throw new Error(
          errorData.error?.message ||
            `Failed to finalize version: ${finalizeResponse.statusText}${errorText ? ` - ${errorText}` : ""}`
        );
      }

      // Step 6: Create release
      // According to docs: POST with versionName as query parameter
      const releaseUrl = `https://firebasehosting.googleapis.com/v1beta1/sites/${siteId}/releases?versionName=${encodeURIComponent(versionName)}`;

      const releaseResponse = await fetch(releaseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!releaseResponse.ok) {
        const errorData = await releaseResponse.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message ||
            `Failed to create release: ${releaseResponse.statusText}`
        );
      }

      const releaseData = await releaseResponse.json();

      return {
        id: releaseData.name?.split("/").pop() || "",
        siteId,
        version: versionName,
        status: "success",
        url: `https://${siteId}.web.app`,
        createdAt: new Date(),
        completedAt: new Date(),
        method: "api"
      };
    } catch (error) {
      console.error("Error deploying to Firebase Hosting:", error);
      throw error;
    }
  });
}

/**
 * Get all files in a directory recursively
 */
async function getAllFiles(
  dir: string,
  baseDir: string = dir
): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      const subFiles = await getAllFiles(fullPath, baseDir);
      files.push(...subFiles);
    } else {
      files.push(relativePath);
    }
  }

  return files;
}

/**
 * Calculate SHA256 hash of file content
 */
async function calculateHash(content: Buffer): Promise<string> {
  const { createHash } = await import("crypto");
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Get deployment status
 * Automatically refreshes token if expired
 */
export async function getDeploymentStatus(
  userId: string,
  firebaseProjectId: string,
  siteId: string,
  deploymentId: string
): Promise<FirebaseHostingDeployment> {
  return withTokenRefresh(userId, async (accessToken) => {
    try {
      const response = await fetch(
        `https://firebasehosting.googleapis.com/v1beta1/sites/${siteId}/releases/${deploymentId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message ||
            `Failed to get deployment status: ${response.statusText}`
        );
      }

      const data = await response.json();

      return {
        id: deploymentId,
        siteId,
        version: data.versionName || "",
        status: data.releaseTime ? "success" : "in_progress",
        url: `https://${siteId}.web.app`,
        createdAt: data.createTime ? new Date(data.createTime) : new Date(),
        completedAt: data.releaseTime ? new Date(data.releaseTime) : undefined,
        method: "api"
      };
    } catch (error) {
      console.error("Error getting deployment status:", error);
      throw error;
    }
  });
}

/**
 * List hosting sites for a Firebase project
 * Automatically refreshes token if expired
 */
export async function listHostingSites(
  userId: string,
  firebaseProjectId: string
): Promise<FirebaseHostingSite[]> {
  return withTokenRefresh(userId, async (accessToken) => {
    try {
      const response = await fetch(
        `https://firebasehosting.googleapis.com/v1beta1/projects/${firebaseProjectId}/sites`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message ||
            `Failed to list hosting sites: ${response.statusText}`
        );
      }

      const data = await response.json();
      const sites = data.sites || [];

      return sites.map((site: any) => ({
        name: site.name || "",
        siteId: site.siteId || site.name?.split("/").pop() || "",
        defaultUrl: site.defaultUrl || `https://${site.siteId || ""}.web.app`,
        appId: site.appId
      }));
    } catch (error) {
      console.error("Error listing hosting sites:", error);
      throw error;
    }
  });
}

/**
 * List custom domains for a Firebase Hosting site
 * Automatically refreshes token if expired
 */
export async function listFirebaseDomains(
  userId: string,
  projectId: string,
  siteId: string
): Promise<
  Array<{
    domain: string;
    status: string;
    updateTime?: string;
    provisioning?: {
      certStatus?: string;
      dnsStatus?: string;
    };
  }>
> {
  return withTokenRefresh(userId, async (accessToken) => {
    try {
      const response = await fetch(
        `https://firebasehosting.googleapis.com/v1beta1/projects/${projectId}/sites/${siteId}/customDomains`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message ||
            `Failed to list domains: ${response.statusText}`
        );
      }

      const data = await response.json();
      const domains = data.customDomains || [];

      return domains.map((domain: any) => ({
        domain: domain.name || domain.domain || "",
        status: domain.status || "UNKNOWN",
        updateTime: domain.updateTime,
        provisioning: domain.provisioning
      }));
    } catch (error) {
      console.error("Error listing Firebase domains:", error);
      throw error;
    }
  });
}

/**
 * Add a custom domain to a Firebase Hosting site
 * Uses the official Firebase Hosting API v1beta1 endpoint
 * Automatically refreshes token if expired
 */
export async function addFirebaseDomain(
  userId: string,
  projectId: string,
  siteId: string,
  domain: string
): Promise<{
  domain: string;
  status: string;
  updateTime?: string;
  provisioning?: {
    certStatus?: string;
    dnsStatus?: string;
  };
}> {
  return withTokenRefresh(userId, async (accessToken) => {
    try {
      const response = await fetch(
        `https://firebasehosting.googleapis.com/v1beta1/projects/${projectId}/sites/${siteId}/customDomains?customDomainId=${domain}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message ||
            `Failed to add domain: ${response.statusText}`
        );
      }

      const data = await response.json();

      // The API returns the domain name in the 'name' field
      const domainName = data.name || domain;

      return {
        domain: domainName,
        status: data.status || "PENDING",
        updateTime: data.updateTime,
        provisioning: data.provisioning
      };
    } catch (error) {
      console.error("Error adding Firebase domain:", error);
      throw error;
    }
  });
}

/**
 * Get DNS records required for a Firebase Hosting custom domain
 * Returns the DNS records that need to be configured for the domain to work
 * Automatically refreshes token if expired
 */
export async function getFirebaseDomainDNSRecords(
  userId: string,
  projectId: string,
  siteId: string,
  domain: string
): Promise<
  Array<{
    domainName: string;
    type: string;
    rdata: string;
    requiredAction?: string;
  }>
> {
  return withTokenRefresh(userId, async (accessToken) => {
    try {
      // First, get the custom domain details which includes DNS record set
      const response = await fetch(
        `https://firebasehosting.googleapis.com/v1beta1/projects/${projectId}/sites/${siteId}/customDomains/${domain}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message ||
            `Failed to get domain DNS records: ${response.statusText}`
        );
      }

      const data = await response.json();
      // The API returns DNS records in the dnsUpdates field
      // According to Firebase API, this contains the required DNS records
      const dnsRecords: Array<{
        domainName: string;
        type: string;
        rdata: string;
        requiredAction?: string;
      }> = [];

      if (dnsRecords.length === 0 && data.requiredDnsUpdates?.desired) {
        if (Array.isArray(data.requiredDnsUpdates.desired)) {
          for (const dnsUpdate of data.requiredDnsUpdates.desired) {
            if (dnsUpdate.records && Array.isArray(dnsUpdate.records)) {
              for (const record of dnsUpdate.records) {
                dnsRecords.push({
                  domainName: record.domainName || domain,
                  type: record.type || "",
                  rdata: record.rdata || "",
                  requiredAction: record.requiredAction
                });
              }
            }
          }
        }
      }

      return dnsRecords;
    } catch (error) {
      console.error("Error getting Firebase domain DNS records:", error);
      throw error;
    }
  });
}
