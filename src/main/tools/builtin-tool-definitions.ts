/**
 * Built-in Agent Tool Definitions for OpenAI-Compatible Wire Protocols
 *
 * Defines the JSON schema for file and command CRUD tools passed to LLMs:
 * - read_file
 * - write_file
 * - list_directory
 * - file_search
 * - execute_command
 */

export interface OpenAIToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, unknown>
      required?: string[]
    }
  }
}

export const BUILTIN_TOOL_DEFINITIONS: OpenAIToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Reads the text content of a file within the active project workspace.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path of the file to read within the workspace.'
          },
          maxBytes: {
            type: 'number',
            description: 'Maximum bytes to read (default 500,000).'
          }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Creates a new file or overwrites an existing file with complete content in the active workspace.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path of the file to create or modify.'
          },
          content: {
            type: 'string',
            description: 'The complete text content to write to the file.'
          }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description: 'Lists all files, subdirectories, and sizes in a workspace folder.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Directory path to list (default: "." for workspace root).'
          },
          recursive: {
            type: 'boolean',
            description: 'Whether to list subdirectories recursively (default: false).'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'file_search',
      description: 'Searches for files across the workspace matching filename patterns or extensions (e.g. query: "config", extension: "json").',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search string to match against filenames.'
          },
          extension: {
            type: 'string',
            description: 'File extension filter without dot (e.g. "ts", "json").'
          },
          maxResults: {
            type: 'number',
            description: 'Maximum search results to return (default: 100).'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'execute_command',
      description: 'Executes a safe shell command, build script, test runner, or package manager in the project workspace.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The shell command to execute.'
          },
          args: {
            type: 'array',
            items: { type: 'string' },
            description: 'Arguments array for the command.'
          }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'edit_file',
      description:
        'Surgically replaces a specific contiguous block of text (targetContent) with new content (replacementContent) in a workspace file.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path of the file to edit.'
          },
          targetContent: {
            type: 'string',
            description: 'The exact string block to find and replace. Must match existing text in the file.'
          },
          replacementContent: {
            type: 'string',
            description: 'The new string to replace targetContent with.'
          }
        },
        required: ['path', 'targetContent', 'replacementContent']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'task_complete',
      description:
        'Call this tool when you have fully completed the user request and all verifications or edits are finished.',
      parameters: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description: 'A concise summary of all changes, actions taken, and final result for the user.'
          }
        },
        required: ['summary']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description:
        'Searches the live web for recent documentation, real-time news, library updates, APIs, and code examples beyond training cutoff. Returns titles, URLs, and text highlights.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query or keywords to look up on the web.'
          },
          numResults: {
            type: 'number',
            description: 'Number of search results to return (default: 5, max: 10).'
          }
        },
        required: ['query']
      }
    }
  }
]

export interface ParsedToolCall {
  id: string
  name: string
  args: Record<string, unknown>
}

/**
 * Extracts inline tool calls formatted as XML tags from model output:
 * <tool_call>{"name": "read_file", "arguments": {"path": "package.json"}}</tool_call>
 */
export function extractInlineToolCalls(content: string): ParsedToolCall[] {
  if (!content) return []
  const calls: ParsedToolCall[] = []

  // Pattern 1: <tool_call>{...}</tool_call>
  const toolCallRegex = /<tool_call>([\s\S]*?)<\/tool_call>/gi
  let match: RegExpExecArray | null

  while ((match = toolCallRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim())
      const name = parsed.name || parsed.tool
      const args = parsed.arguments || parsed.args || parsed.parameters || {}
      if (name && typeof name === 'string') {
        calls.push({
          id: `inline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: name.trim(),
          args: typeof args === 'string' ? JSON.parse(args) : args
        })
      }
    } catch {
      // Ignore malformed inline JSON
    }
  }

  // Pattern 2: <function=name>{...}</function>
  const funcRegex = /<function=([a-zA-Z0-9_-]+)>([\s\S]*?)<\/function>/gi
  while ((match = funcRegex.exec(content)) !== null) {
    try {
      const name = match[1].trim()
      const args = JSON.parse(match[2].trim())
      calls.push({
        id: `inline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name,
        args
      })
    } catch {
      // Ignore
    }
  }

  return calls
}

