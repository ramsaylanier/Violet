/**
 * Client-side agent API functions
 */

import { apiPost } from "./client.js";
import type { AgentResponse } from "@/server/agents/agentExecutor";

export async function chatWithAgent(data: {
  message: string;
  projectId?: string;
}): Promise<AgentResponse> {
  return apiPost<AgentResponse>("/agent/chat", data);
}
