/**
 * Express API server
 */

// Load environment variables from .env files
import "dotenv-flow/config";

import express from "express";
import cookieParser from "cookie-parser";
import { authRoutes } from "./routes/auth.js";
import { projectRoutes } from "./routes/projects.js";
import { githubRoutes } from "./routes/github.js";
import { firebaseRoutes } from "./routes/firebase.js";
import { agentRoutes } from "./routes/agent.js";
import { cloudflareRoutes } from "./routes/cloudflare.js";
import { deploymentRoutes } from "./routes/deployments.js";

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

app.use(cookieParser());
app.use(express.json());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/github", githubRoutes);
app.use("/api/firebase", firebaseRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/cloudflare", cloudflareRoutes);
app.use("/api/deployments", deploymentRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
