import { createServerFn } from "@tanstack/react-start";
import { adminDb } from "@/lib/firebase-admin";
import { requireAuth } from "@/server/auth";
import type { ProjectSettings } from "@/types";

export const listProjects = createServerFn({
  method: "GET",
}).handler(async () => {
  const userId = await requireAuth();

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

  return projects;
});

export const createProject = createServerFn({
  method: "POST",
}).handler(async (ctx) => {
  const userId = await requireAuth();
  const { name, description, settings, metadata } = ctx.data as unknown as {
    name: string;
    description?: string;
    settings?: ProjectSettings;
    metadata?: { [key: string]: string };
  };

  const projectData = {
    name,
    description,
    createdAt: new Date(),
    updatedAt: new Date(),
    settings: settings || { autoSync: false, notifications: true },
    metadata: metadata || null,
    userId, // Add userId for querying
  };

  const docRef = await adminDb.collection("projects").add(projectData);

  const project = {
    id: docRef.id,
    ...projectData,
  };

  return project;
});
