import { OpenAICompatAdapter } from './openai-compat.adapter'
import { ModelDescriptorDTO } from '@shared/domain/models'

const GROQ_DEFAULT_MODELS: ModelDescriptorDTO[] = [
  {
    id: 'llama-3.3-70b-versatile',
    providerId: 'groq',
    name: 'Llama 3.3 70B Versatile',
    contextWindow: 128000,
    outputLimit: 32768,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  },
  {
    id: 'llama-3.1-8b-instant',
    providerId: 'groq',
    name: 'Llama 3.1 8B Instant',
    contextWindow: 128000,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  },
  {
    id: 'mixtral-8x7b-32768',
    providerId: 'groq',
    name: 'Mixtral 8x7B 32k',
    contextWindow: 32768,
    outputLimit: 4096,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  }
]

export class GroqAdapter extends OpenAICompatAdapter {
  constructor() {
    super({
      id: 'groq',
      name: 'GroqCloud LPU',
      defaultBaseUrl: 'https://api.groq.com/openai/v1',
      defaultModels: GROQ_DEFAULT_MODELS
    })
  }
}

