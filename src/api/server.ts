/**
 * Express API server
 */

import express from 'express';
import cookieParser from 'cookie-parser';
import { authRoutes } from './routes/auth.js';
import { projectRoutes } from './routes/projects.js';
import { projectByIdRoutes } from './routes/projects.$projectId.js';
import { githubRoutes } from './routes/github.js';
import { firebaseRoutes } from './routes/firebase.js';
import { agentRoutes } from './routes/agent.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cookieParser());
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects', projectByIdRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/firebase', firebaseRoutes);
app.use('/api/agent', agentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
