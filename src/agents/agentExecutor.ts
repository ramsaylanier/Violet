import Anthropic from '@anthropic-ai/sdk'
import { githubTools } from './tools/githubTools'
import { firebaseTools } from './tools/firebaseTools'
import { projectTools } from './tools/projectTools'
import * as githubAPI from '@/api/github'
import * as firebaseAPI from '@/api/firebase'
import * as projectAPI from '@/api/projects'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// Combine all tools
const allTools = [...githubTools, ...firebaseTools, ...projectTools]

export interface AgentContext {
  userId: string
  projectId?: string
  request?: any // Express Request or Fetch Request
}

export interface AgentResponse {
  message: string
  toolCalls?: Array<{
    tool: string
    input: Record<string, unknown>
    result?: unknown
    error?: string
  }>
}

export async function executeAgent(
  message: string,
  context: AgentContext
): Promise<AgentResponse> {
  const systemPrompt = `You are a helpful AI assistant for managing development projects. You can:
- Create and manage GitHub repositories and issues
- Set up Firebase projects and services
- Create and update development projects
- Answer questions about projects and provide guidance

Always be concise and helpful. When a user asks you to do something, use the appropriate tools.`

  const tools = allTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  }))

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
      tools,
    })

    const toolCalls: AgentResponse['toolCalls'] = []
    let finalMessage = ''

    // Process the response
    for (const content of response.content) {
      if (content.type === 'text') {
        finalMessage += content.text
      } else if (content.type === 'tool_use') {
        // Execute the tool call
        const toolName = content.name
        const toolInput = content.input

        try {
          let result: unknown

          // Route to appropriate API function
          if (toolName === 'create_github_repository') {
            result = await githubAPI.createGitHubRepository(toolInput as any)
          } else if (toolName === 'create_github_issue') {
            result = await githubAPI.createGitHubIssue(toolInput as any)
          } else if (toolName === 'list_github_repositories') {
            result = await githubAPI.listGitHubRepositories()
          } else if (toolName === 'initialize_firestore') {
            result = await firebaseAPI.initializeFirestoreDB(toolInput as any)
          } else if (toolName === 'setup_firebase_storage') {
            result = await firebaseAPI.setupFirebaseStorage(toolInput as any)
          } else if (toolName === 'setup_firebase_hosting') {
            result = await firebaseAPI.setupFirebaseHosting(toolInput as any)
          } else if (toolName === 'create_project') {
            result = await projectAPI.createProject(toolInput as any)
          } else if (toolName === 'update_project') {
            const { projectId, updates } = toolInput as any;
            result = await projectAPI.updateProject(projectId, updates)
          } else {
            throw new Error(`Unknown tool: ${toolName}`)
          }

          toolCalls.push({
            tool: toolName,
            input: toolInput as Record<string, unknown>,
            result: result as Record<string, unknown> | undefined,
          })

          // Send tool result back to Claude for final response
          const toolResponse = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 4096,
            system: systemPrompt,
            messages: [
              {
                role: 'user',
                content: message,
              },
              {
                role: 'assistant',
                content: response.content,
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'tool_result',
                    tool_use_id: content.id,
                    content: JSON.stringify(result),
                  },
                ],
              },
            ],
            tools,
          })

          // Extract final message from tool response
          for (const content of toolResponse.content) {
            if (content.type === 'text') {
              finalMessage = content.text
            }
          }
        } catch (error) {
          toolCalls.push({
            tool: toolName,
            input: toolInput,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }

    return {
      message: finalMessage || 'Task completed successfully.',
      toolCalls,
    }
  } catch (error) {
    throw new Error(`Agent execution failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}
