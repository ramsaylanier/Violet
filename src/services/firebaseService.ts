import admin from "firebase-admin";
import type { FirebaseProject } from "@/types";

// Note: Firebase Admin SDK project creation requires billing-enabled projects
// This service handles Firestore, Storage, and Hosting setup for existing projects

export async function initializeFirestore(
  _projectId: string,
  _databaseId = "(default)",
  _location = "us-central1"
) {
  // Firestore is automatically initialized when the project is created
  // This function can be used to verify or configure settings
  const db = admin.firestore();

  // Check if database exists by trying to access it
  try {
    await db.collection("_test").limit(1).get();
    return { success: true, message: "Firestore database is accessible" };
  } catch (error) {
    throw new Error(`Failed to access Firestore database: ${error}`);
  }
}

export async function setupStorage(_projectId: string) {
  // Storage bucket is automatically created with the project
  // This can be used to verify or configure bucket settings
  try {
    // Note: Storage bucket operations require additional permissions
    return { success: true, message: "Storage bucket should be available" };
  } catch (error) {
    throw new Error(`Failed to setup Storage: ${error}`);
  }
}

export async function setupHosting(projectId: string, siteId?: string) {
  // Hosting setup requires manual configuration or additional API calls
  // This is a placeholder for future implementation
  try {
    return {
      success: true,
      message: "Hosting configuration pending",
      siteId: siteId || projectId
    };
  } catch (error) {
    throw new Error(`Failed to setup Hosting: ${error}`);
  }
}

export async function createFirestoreCollection(
  projectId: string,
  collectionName: string,
  initialData?: Record<string, unknown>
) {
  const db = admin.firestore();

  if (initialData) {
    await db.collection(collectionName).doc("_init").set(initialData);
  }

  return { success: true, collection: collectionName };
}

/**
 * Validate Firebase project ID format
 * Firebase project IDs must be:
 * - 6-30 characters
 * - lowercase letters, numbers, and hyphens
 * - must start with a letter
 * - cannot end with a hyphen
 */
export function validateFirebaseProjectId(projectId: string): boolean {
  if (!projectId || typeof projectId !== "string") {
    return false;
  }

  // Check length
  if (projectId.length < 6 || projectId.length > 30) {
    return false;
  }

  // Check format: lowercase letters, numbers, hyphens
  const projectIdRegex = /^[a-z][a-z0-9-]*[a-z0-9]$/;
  return projectIdRegex.test(projectId);
}

/**
 * Verify that a Firebase project exists and is accessible
 * This performs basic validation - full metadata requires Firebase Management API
 */
export async function verifyFirebaseProject(
  projectId: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Basic format validation
    if (!validateFirebaseProjectId(projectId)) {
      return { valid: false, error: "Invalid project ID format" };
    }

    // Note: Full verification requires Firebase Management API or Google Cloud Resource Manager API
    // For MVP, we'll do basic format validation
    // Future: Use Firebase Management API with Google OAuth to verify project exists

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Failed to verify project"
    };
  }
}

/**
 * Get Firebase project metadata
 * Requires Firebase Management API + Google OAuth
 * For MVP, returns basic info based on project ID
 */
export async function getFirebaseProjectMetadata(
  projectId: string
): Promise<FirebaseProject | null> {
  try {
    // Basic validation
    if (!validateFirebaseProjectId(projectId)) {
      return null;
    }

    // Note: Full metadata requires Firebase Management API
    // For MVP, return basic structure
    // Future: Call Firebase Management API: GET https://firebase.googleapis.com/v1beta1/projects/{projectId}

    return {
      projectId
      // Additional fields would come from Firebase Management API
    };
  } catch (error) {
    console.error("Error getting Firebase project metadata:", error);
    return null;
  }
}

/**
 * List Firebase projects for the authenticated user
 * Requires Google OAuth token with Firebase Management API access
 */
export async function listFirebaseProjects(
  accessToken: string
): Promise<FirebaseProject[]> {
  try {
    const response = await fetch(
      "https://firebase.googleapis.com/v1beta1/projects",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Firebase API error:", {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      throw new Error(
        errorData.error?.message ||
          `Failed to list Firebase projects: ${response.statusText}`
      );
    }

    const data = await response.json();

    // The API returns projects in the format:
    // { results: [{ name: "projects/project-id", projectId: "project-id", displayName: "...", ... }] }
    const projects = data.results || [];

    return projects.map((project: any) => {
      // Extract project ID from name (format: "projects/project-id")
      const projectId =
        project.projectId || project.name?.split("/")[1] || project.name;

      return {
        projectId,
        projectNumber: project.projectNumber,
        displayName: project.displayName,
        name: project.name,
        resources: project.resources
      } as FirebaseProject;
    });
  } catch (error) {
    console.error("Error listing Firebase projects:", error);
    throw error;
  }
}
