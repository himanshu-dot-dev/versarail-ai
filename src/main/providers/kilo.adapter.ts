import { OpenAICompatAdapter } from './openai-compat.adapter'
import { ModelDescriptorDTO } from '@shared/domain/models'

const KILO_DEFAULT_MODELS: ModelDescriptorDTO[] = [
  {
    id: 'kilo-auto/free',
    providerId: 'kilo',
    name: 'Kilo Auto Free (Rotates Free Models)',
    contextWindow: 256000,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  },
  {
    id: 'nvidia/nemotron-3.5-super-vl:free',
    providerId: 'kilo',
    name: 'NVIDIA Nemotron 3.5 Super VL (Free)',
    contextWindow: 1000000,
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

