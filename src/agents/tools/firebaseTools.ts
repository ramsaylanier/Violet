export const firebaseTools = [
  {
    name: "initialize_firestore",
    description:
      "Initialize a Firestore database for a Firebase project. Use this when setting up a new Firebase project.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "The Firebase project ID" },
        databaseId: {
          type: "string",
          description: 'The database ID (default: "(default)")',
          default: "(default)"
        },
        location: {
          type: "string",
          description: 'The location for the database (default: "us-central1")',
          default: "us-central1"
        }
      },
      required: ["projectId"]
    }
  },
  {
    name: "setup_firebase_storage",
    description:
      "Setup Firebase Storage for a project. Use this when setting up storage buckets.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "The Firebase project ID" }
      },
      required: ["projectId"]
    }
  },
  {
    name: "setup_firebase_hosting",
    description:
      "Setup Firebase Hosting for a project. Use this when setting up hosting.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "The Firebase project ID" },
        siteId: { type: "string", description: "Optional site ID for hosting" }
      },
      required: ["projectId"]
    }
  }
] as const;
