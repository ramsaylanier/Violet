import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/server/auth";
import {
  initializeFirestore,
  setupStorage,
  setupHosting,
  createFirestoreCollection,
} from "@/services/firebaseService";

export const initializeFirestoreDB = createServerFn({
  method: "POST",
}).handler(async (ctx) => {
  const userId = await requireAuth();
  const { projectId, databaseId, location } = (ctx.data as any) as {
    projectId: string;
    databaseId?: string;
    location?: string;
  };
  return await initializeFirestore(projectId, databaseId, location);
});

export const setupFirebaseStorage = createServerFn({
  method: "POST",
}).handler(async (ctx) => {
  const userId = await requireAuth();
  const { projectId } = (ctx.data as any) as { projectId: string };
  return await setupStorage(projectId);
});

export const setupFirebaseHosting = createServerFn({
  method: "POST",
}).handler(async (ctx) => {
  const userId = await requireAuth();
  const { projectId, siteId } = (ctx.data as any) as {
    projectId: string;
    siteId?: string;
  };
  return await setupHosting(projectId, siteId);
});

export const createFirestoreCollectionDB = createServerFn({
  method: "POST",
}).handler(async (ctx) => {
  const userId = await requireAuth();
  const { projectId, collectionName, initialData } = (ctx.data as any) as {
    projectId: string;
    collectionName: string;
    initialData?: unknown;
  };
  return await createFirestoreCollection(projectId, collectionName, initialData);
});