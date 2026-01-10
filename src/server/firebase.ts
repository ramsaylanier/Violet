import { createServerFn } from "@tanstack/start-client-core";
import { verifyIdToken } from "@/services/authService";
import {
  initializeFirestore,
  setupStorage,
  setupHosting,
  createFirestoreCollection,
} from "@/services/firebaseService";

export const initializeFirestoreDB = createServerFn({
  method: "POST",
}).handler(async (ctx) => {
  const request = (ctx.context as any)?.request;
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  await verifyIdToken(authHeader.substring(7));
  const { projectId, databaseId, location } = ctx.data as any as {
    projectId: string;
    databaseId?: string;
    location?: string;
  };
  return await initializeFirestore(projectId, databaseId, location);
});

export const setupFirebaseStorage = createServerFn({
  method: "POST",
}).handler(async (ctx) => {
  const request = (ctx.context as any)?.request;
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  await verifyIdToken(authHeader.substring(7));
  const { projectId } = ctx.data as any as { projectId: string };
  return await setupStorage(projectId);
});

export const setupFirebaseHosting = createServerFn({
  method: "POST",
}).handler(async (ctx) => {
  const request = (ctx.context as any)?.request;
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  await verifyIdToken(authHeader.substring(7));
  const { projectId, siteId } = ctx.data as any as {
    projectId: string;
    siteId?: string;
  };
  return await setupHosting(projectId, siteId);
});

export const createFirestoreCollectionDB = createServerFn({
  method: "POST",
}).handler(async (ctx) => {
  const request = (ctx.context as any)?.request;
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  await verifyIdToken(authHeader.substring(7));
  const { projectId, collectionName, initialData } = ctx.data as any as {
    projectId: string;
    collectionName: string;
    initialData?: Record<string, unknown>;
  };
  return await createFirestoreCollection(
    projectId,
    collectionName,
    initialData
  );
});
