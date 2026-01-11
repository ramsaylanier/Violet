/**
 * Client-side Firebase API functions
 */

import { apiPost } from "./client.js";

export async function initializeFirestoreDB(data: {
  projectId: string;
  databaseId?: string;
  location?: string;
}): Promise<any> {
  return apiPost<any>("/firebase/initialize-firestore", data);
}

export async function setupFirebaseStorage(data: {
  projectId: string;
}): Promise<any> {
  return apiPost<any>("/firebase/setup-storage", data);
}

export async function setupFirebaseHosting(data: {
  projectId: string;
}): Promise<any> {
  return apiPost<any>("/firebase/setup-hosting", data);
}

export async function createFirestoreCollectionDB(data: {
  projectId: string;
  databaseId?: string;
  collectionId: string;
}): Promise<any> {
  return apiPost<any>("/firebase/create-firestore-collection", data);
}
