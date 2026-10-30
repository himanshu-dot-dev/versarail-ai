import { OpenAICompatAdapter } from './openai-compat.adapter'
import { ModelDescriptorDTO } from '@shared/domain/models'

const OPENROUTER_DEFAULT_MODELS: ModelDescriptorDTO[] = [
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    providerId: 'openrouter',
    name: 'Meta Llama 3.3 70B (Free)',
    contextWindow: 131072,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  },
  {
    id: 'google/gemini-2.0-flash-exp:free',
    providerId: 'openrouter',
    name: 'Gemini 2.0 Flash Exp (Free)',
    contextWindow: 1048576,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  }
]

export class OpenRouterAdapter extends OpenAICompatAdapter {
  constructor() {
    super({
      id: 'openrouter',
      name: 'OpenRouter Gateway',
      defaultBaseUrl: 'https://openrouter.ai/api/v1',
      defaultModels: OPENROUTER_DEFAULT_MODELS
    })
  }
}

