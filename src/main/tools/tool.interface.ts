import { z } from 'zod'

export type ToolCapability = 'fs:read' | 'fs:write' | 'fs:delete' | 'cmd:exec' | 'net:search'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface ToolExecutionContext {
  runId?: string
  workspacePath?: string | null
  signal?: AbortSignal
}

export interface PermissionDetails {
  title: string
  description: string
  targetPath?: string
  command?: string
  args?: string[]
  diffPreview?: string
}

export interface ITool<TInput = any, TOutput = any> {
  readonly name: string
  readonly description: string
  readonly capability: ToolCapability
  readonly riskLevel: RiskLevel
  readonly inputSchema: z.ZodType<any, any, any>
  readonly outputSchema: z.ZodType<any, any, any>

  /**
   * Generates human-readable details and security parameters for the Permission Modal.
   */
  formatPermissionRequest(input: TInput, context: ToolExecutionContext): PermissionDetails

  /**
   * Executes the tool with validated arguments.
   * Only called after PermissionBroker has authorized the payload hash.
   */
  execute(input: TInput, context: ToolExecutionContext): Promise<TOutput>
}
