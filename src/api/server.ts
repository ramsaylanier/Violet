/**
 * Express API server
 */

// Load environment variables from .env file
import "dotenv/config";

import express from "express";
import cookieParser from "cookie-parser";
import { authRoutes } from "./routes/auth.js";
import { projectRoutes } from "./routes/projects";
import { projectByIdRoutes } from "./routes/projects.$projectId";
import { githubRoutes } from "./routes/github";
import { firebaseRoutes } from "./routes/firebase";
import { agentRoutes } from "./routes/agent";

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

app.use(cookieParser());
app.use(express.json());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/projects", projectByIdRoutes);
app.use("/api/github", githubRoutes);
app.use("/api/firebase", firebaseRoutes);
app.use("/api/agent", agentRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
