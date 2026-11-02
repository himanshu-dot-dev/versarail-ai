import { OpenAICompatAdapter } from './openai-compat.adapter'
import { ModelDescriptorDTO } from '@shared/domain/models'

const POLLINATIONS_DEFAULT_MODELS: ModelDescriptorDTO[] = [
  {
    id: 'openai',
    providerId: 'pollinations',
    name: 'Pollinations GPT-OSS 20B (Keyless)',
    contextWindow: 128000,
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
      defaultBaseUrl: 'https://text.pollinations.ai/v1',
      defaultModels: POLLINATIONS_DEFAULT_MODELS,
      keyless: true,
      extraHeaders: {
        'User-Agent': 'Mozilla/5.0 VersaRail-AI-Agent-Harness/0.1.0'
      }
    })
  }
}

