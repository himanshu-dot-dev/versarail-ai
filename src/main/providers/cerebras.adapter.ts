import { OpenAICompatAdapter } from './openai-compat.adapter'
import { ModelDescriptorDTO } from '@shared/domain/models'

const CEREBRAS_DEFAULT_MODELS: ModelDescriptorDTO[] = [
  {
    id: 'llama3.3-70b',
    providerId: 'cerebras',
    name: 'Cerebras Llama 3.3 70B',
    contextWindow: 128000,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  },
  {
    id: 'llama3.1-8b',
    providerId: 'cerebras',
    name: 'Cerebras Llama 3.1 8B',
    contextWindow: 128000,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  }
]

export class CerebrasAdapter extends OpenAICompatAdapter {
  constructor() {
    super({
      id: 'cerebras',
      name: 'Cerebras Cloud',
      defaultBaseUrl: 'https://api.cerebras.ai/v1',
      defaultModels: CEREBRAS_DEFAULT_MODELS
    })
  }
}

