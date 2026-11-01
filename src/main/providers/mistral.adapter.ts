import { OpenAICompatAdapter } from './openai-compat.adapter'
import { ModelDescriptorDTO } from '@shared/domain/models'

const MISTRAL_DEFAULT_MODELS: ModelDescriptorDTO[] = [
  {
    id: 'mistral-large-latest',
    providerId: 'mistral',
    name: 'Mistral Large 2',
    contextWindow: 128000,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: false
  },
  {
    id: 'codestral-latest',
    providerId: 'mistral',
    name: 'Codestral 2501 (Code Engine)',
    contextWindow: 256000,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  },
  {
    id: 'mistral-small-latest',
    providerId: 'mistral',
    name: 'Mistral Small (Fast)',
    contextWindow: 32768,
    outputLimit: 4096,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  }
]

export class MistralAdapter extends OpenAICompatAdapter {
  constructor() {
    super({
      id: 'mistral',
      name: 'Mistral AI',
      defaultBaseUrl: 'https://api.mistral.ai/v1',
      defaultModels: MISTRAL_DEFAULT_MODELS
    })
  }
}

