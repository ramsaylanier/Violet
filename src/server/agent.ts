import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/server/auth";
import { executeAgent, type AgentResponse } from "@/agents/agentExecutor";

const chatWithAgentHandler = async (ctx: any): Promise<AgentResponse> => {
  const userId = await requireAuth();
  const { message, projectId } = ctx.data as any as {
    message: string;
    projectId?: string;
  };

  const request = (ctx.context as any)?.request;
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
