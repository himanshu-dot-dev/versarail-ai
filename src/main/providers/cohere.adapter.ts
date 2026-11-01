import { OpenAICompatAdapter } from './openai-compat.adapter'
import { ModelDescriptorDTO } from '@shared/domain/models'

const COHERE_DEFAULT_MODELS: ModelDescriptorDTO[] = [
  {
    id: 'command-r-plus-08-2024',
    providerId: 'cohere',
    name: 'Cohere Command R+',
    contextWindow: 128000,
    outputLimit: 4096,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  },
  {
    id: 'command-r-08-2024',
    providerId: 'cohere',
    name: 'Cohere Command R',
    contextWindow: 128000,
    outputLimit: 4096,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  }
]

export class CohereAdapter extends OpenAICompatAdapter {
  constructor() {
    super({
      id: 'cohere',
      name: 'Cohere',
      defaultBaseUrl: 'https://api.cohere.com/compatibility/v1',
      defaultModels: COHERE_DEFAULT_MODELS
    })
  }
}

