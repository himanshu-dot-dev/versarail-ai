import { OpenAICompatAdapter } from './openai-compat.adapter'
import { ModelDescriptorDTO } from '@shared/domain/models'

const OPENROUTER_DEFAULT_MODELS: ModelDescriptorDTO[] = [
  {
    id: 'openrouter/free',
    providerId: 'openrouter',
    name: 'OpenRouter Free (Auto-Mesh)',
    contextWindow: 131072,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  },
  {
    id: 'nvidia/nemotron-3.5-lightning:free',
    providerId: 'openrouter',
    name: 'Nvidia Nemotron 3.5 Lightning (Free)',
    contextWindow: 131072,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  },
  {
    id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    providerId: 'openrouter',
    name: 'Nvidia Nemotron 3 Ultra 550B (Free)',
    contextWindow: 131072,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  },
  {
    id: 'cohere/north-mini-code:free',
    providerId: 'openrouter',
    name: 'Cohere North Mini Code (Free)',
    contextWindow: 131072,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  },
  {
    id: 'google/gemma-4-31b-it:free',
    providerId: 'openrouter',
    name: 'Google Gemma 4 31B (Free)',
    contextWindow: 131072,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    providerId: 'openrouter',
    name: 'Meta Llama 3.3 70B Instruct',
    contextWindow: 131072,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: false
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    providerId: 'openrouter',
    name: 'Meta Llama 3.3 70B (Free)',
    contextWindow: 131072,
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

