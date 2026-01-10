import { createServerFn } from "@tanstack/start-client-core";
import { verifyIdToken } from "@/services/authService";
import { executeAgent, type AgentResponse } from "@/agents/agentExecutor";

const chatWithAgentHandler = async (ctx: any): Promise<AgentResponse> => {
  const request = (ctx.context as any)?.request;
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.substring(7);
  const userId = await verifyIdToken(token);
  const { message, projectId } = ctx.data as any as {
    message: string;
    projectId?: string;
  };

  const context = {
    userId,
    projectId,
    request,
  };

  return await executeAgent(message, context);
};

export const chatWithAgent = createServerFn({
  method: "POST",
}).handler(chatWithAgentHandler as any);
