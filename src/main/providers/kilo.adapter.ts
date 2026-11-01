import { OpenAICompatAdapter } from './openai-compat.adapter'
import { ModelDescriptorDTO } from '@shared/domain/models'

const KILO_DEFAULT_MODELS: ModelDescriptorDTO[] = [
  {
    id: 'deepseek/deepseek-r1:free',
    providerId: 'kilo',
    name: 'Kilo DeepSeek R1 (Free)',
    contextWindow: 65536,
    outputLimit: 8192,
    supportsTools: false,
    supportsStreaming: true,
    isFreeTierAvailable: true
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    providerId: 'kilo',
    name: 'Kilo Llama 3.3 70B (Free)',
    contextWindow: 128000,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  }
]

export class KiloAdapter extends OpenAICompatAdapter {
  constructor() {
    super({
      id: 'kilo',
      name: 'Kilo Gateway (Keyless Free)',
      defaultBaseUrl: 'https://api.kilo.ai/api/gateway/v1',
      defaultModels: KILO_DEFAULT_MODELS,
      keyless: true,
      validateUrl: 'https://api.kilo.ai/api/gateway/models'
    })
  }
}

