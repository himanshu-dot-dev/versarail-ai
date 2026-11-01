import { OpenAICompatAdapter } from './openai-compat.adapter'
import { ModelDescriptorDTO } from '@shared/domain/models'

const POLLINATIONS_DEFAULT_MODELS: ModelDescriptorDTO[] = [
  {
    id: 'openai',
    providerId: 'pollinations',
    name: 'Pollinations GPT-4o (Keyless)',
    contextWindow: 128000,
    outputLimit: 4096,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  },
  {
    id: 'deepseek-r1',
    providerId: 'pollinations',
    name: 'Pollinations DeepSeek R1 (Keyless)',
    contextWindow: 65536,
    outputLimit: 8192,
    supportsTools: false,
    supportsStreaming: true,
    isFreeTierAvailable: true
  },
  {
    id: 'mistral',
    providerId: 'pollinations',
    name: 'Pollinations Mistral Small (Keyless)',
    contextWindow: 32768,
    outputLimit: 4096,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  }
]

export class PollinationsAdapter extends OpenAICompatAdapter {
  constructor() {
    super({
      id: 'pollinations',
      name: 'Pollinations (Keyless Free)',
      defaultBaseUrl: 'https://gen.pollinations.ai/v1',
      defaultModels: POLLINATIONS_DEFAULT_MODELS,
      keyless: true,
      extraHeaders: {
        'User-Agent': 'Mozilla/5.0 VersaRail-AI-Agent-Harness/0.1.0'
      }
    })
  }
}

