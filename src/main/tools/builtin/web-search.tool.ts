import { z } from 'zod'
import { ITool, ToolExecutionContext, PermissionDetails } from '../tool.interface'
import { SecretRedactor } from '../../security/secret-redactor'

export const WebSearchInputSchema = z.object({
  query: z.string().min(1, 'Search query cannot be empty'),
  numResults: z.number().int().min(1).max(10).optional().default(5)
})

export type WebSearchInput = z.infer<typeof WebSearchInputSchema>

export const WebSearchOutputSchema = z.object({
  query: z.string(),
  content: z.string()
})

export type WebSearchOutput = z.infer<typeof WebSearchOutputSchema>

export const EXA_PUBLIC_MCP_URL = 'https://mcp.exa.ai/mcp'

/**
 * Universal Free Web Search Tool
 *
 * Implements provider-independent, real-time web search using the public Exa MCP endpoint
 * (with optional BYOK via EXA_API_KEY environment variable).
 * Returns ranked web results and semantic sentence highlights to the AI Agent.
 */
export class WebSearchTool implements ITool<WebSearchInput, WebSearchOutput> {
  public readonly name = 'web_search'
  public readonly description =
    'Searches the live web for recent documentation, real-time news, library updates, APIs, and code examples beyond training cutoff.'
  public readonly capability = 'net:search' as const
  public readonly riskLevel = 'low' as const
  public readonly inputSchema = WebSearchInputSchema
  public readonly outputSchema = WebSearchOutputSchema

  public formatPermissionRequest(input: WebSearchInput, _context: ToolExecutionContext): PermissionDetails {
    const sanitizedQuery = SecretRedactor.redact(input.query)
    const limit = input.numResults ?? 5
    return {
      title: 'Web Search',
      description: `Search the web for: "${sanitizedQuery}" (limit: ${limit} results)`
    }
  }

  public async execute(input: WebSearchInput, context: ToolExecutionContext): Promise<WebSearchOutput> {
    const sanitizedQuery = SecretRedactor.redact(input.query.trim())
    const numResults = Math.min(Math.max(input.numResults ?? 5, 1), 10)

    const apiKey = process.env.EXA_API_KEY
    const url = apiKey
      ? `${EXA_PUBLIC_MCP_URL}?exaApiKey=${encodeURIComponent(apiKey)}`
      : EXA_PUBLIC_MCP_URL

    // Combine caller cancellation signal with a strict 20-second timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(new Error('Web search request timed out after 20 seconds')), 20000)

    if (context.signal) {
      context.signal.addEventListener('abort', () => controller.abort(context.signal?.reason), { once: true })
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream'
        },
        signal: controller.signal,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'web_search_exa',
            arguments: {
              query: sanitizedQuery,
              numResults
            }
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Web search service returned HTTP status ${response.status}: ${response.statusText}`)
      }

      const bodyText = await response.text()
      const extractedContent = this.parseMcpResponse(bodyText)

      return {
        query: sanitizedQuery,
        content: extractedContent || `No web search results found for query: "${sanitizedQuery}". Please try a more specific or alternative query.`
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Robust parser supporting both direct JSON-RPC result payloads
   * and Server-Sent Events (SSE) `data: {"result": ...}` formats.
   */
  public parseMcpResponse(body: string): string | undefined {
    const parsePayload = (text: string): string | undefined => {
      const trimmed = text.trim()
      if (!trimmed.startsWith('{')) return undefined
      try {
        const json = JSON.parse(trimmed)
        const contentItems: Array<{ type?: string; text?: string }> = json?.result?.content
        if (Array.isArray(contentItems)) {
          const textItem = contentItems.find((item) => typeof item.text === 'string' && item.text.trim().length > 0)
          if (textItem?.text) {
            return textItem.text
          }
        }
        return undefined
      } catch {
        return undefined
      }
    }

    const trimmedBody = body.trim()
    const directResult = parsePayload(trimmedBody)
    if (directResult) {
      return directResult
    }

    for (const line of trimmedBody.split('\n')) {
      if (line.startsWith('data: ')) {
        const parsed = parsePayload(line.slice(6))
        if (parsed) {
          return parsed
        }
      }
    }

    return undefined
  }
}

