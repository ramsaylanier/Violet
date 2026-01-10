import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { chatWithAgent } from '@/server/agent'
import { useAuth } from '@/hooks/useAuth'
import { Send, Bot, User } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: Array<{
    tool: string
    input: unknown
    result?: unknown
    error?: string
  }>
}

interface ChatInterfaceProps {
  projectId?: string
}

export function ChatInterface({ projectId }: ChatInterfaceProps) {
  const { firebaseUser } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim() || !firebaseUser || loading) return

    const userMessage: Message = {
      role: 'user',
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const idToken = await firebaseUser.getIdToken()
      const response = await chatWithAgent({
        request: new Request('http://localhost', {
          headers: {
            authorization: `Bearer ${idToken}`,
          },
        }),
        data: {
          message: input,
          projectId,
        },
      })

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.message,
        toolCalls: response.toolCalls,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response from agent'}`,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <div className="p-4 border-b">
        <h3 className="font-semibold">AI Assistant</h3>
        <p className="text-sm text-muted-foreground">Ask me to create projects, repositories, or issues</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            Start a conversation to get help with your projects
          </div>
        )}
        
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              
              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <div className="text-xs font-medium mb-1">Actions taken:</div>
                  {message.toolCalls.map((toolCall, i) => (
                    <div key={i} className="text-xs space-y-1">
                      <div>
                        <span className="font-medium">{toolCall.tool}</span>
                        {toolCall.error && (
                          <span className="text-destructive ml-2">❌ {toolCall.error}</span>
                        )}
                        {toolCall.result && !toolCall.error && (
                          <span className="text-green-600 ml-2">✓ Success</span>
                        )}
                        {toolCall.result && typeof toolCall.result === 'object' && (
                          <pre className="text-xs mt-1 overflow-x-auto">{JSON.stringify(toolCall.result, null, 2)}</pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}
        
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-muted rounded-lg p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Ask me to create a project, repository, or issue..."
            className="min-h-[60px] resize-none"
            disabled={loading || !firebaseUser}
          />
          <Button onClick={handleSend} disabled={loading || !firebaseUser || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
