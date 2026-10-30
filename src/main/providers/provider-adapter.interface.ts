import { ProviderId, ModelDescriptorDTO } from '@shared/domain/models'

export interface KeyValidationResult {
  valid: boolean
  latencyMs: number
  modelsCount: number
  error?: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionRequest {
  apiKey: string
  model: string
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
  customEndpoint?: string
}

export interface StreamChunk {
  textDelta?: string
  toolCallsDelta?: Array<{
    id?: string
    name?: string
    arguments?: string
  }>
  finishReason?: string | null
  usage?: {
    promptTokens: number
    completionTokens: number
  }
}

export interface IProviderAdapter {
  readonly id: ProviderId
  readonly name: string

  validateKey(apiKey: string, customEndpoint?: string): Promise<KeyValidationResult>
  listModels(apiKey: string, customEndpoint?: string): Promise<ModelDescriptorDTO[]>
  streamCompletion(request: ChatCompletionRequest): AsyncIterable<StreamChunk>
}

