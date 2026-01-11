/**
 * Agent API routes
 */

import express from 'express';
import { getRequireAuth } from './auth.js';
import { executeAgent, type AgentResponse } from '@/agents/agentExecutor';

const router = express.Router();

/**
 * POST /api/agent/chat
 * Chat with the agent
 */
router.post('/chat', async (req, res) => {
  try {
    const userId = await getRequireAuth(req);
    const { message, projectId } = req.body as {
      message: string;
      projectId?: string;
    };

    const context = {
      userId,
      projectId,
      request: req,
    };

    const response = await executeAgent(message, context);
    res.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.error('Error executing agent:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

export { router as agentRoutes };
