import { OpenAICompatAdapter } from './openai-compat.adapter'
import { ModelDescriptorDTO } from '@shared/domain/models'

const NVIDIA_DEFAULT_MODELS: ModelDescriptorDTO[] = [
  {
    id: 'meta/llama-3.3-70b-instruct',
    providerId: 'nvidia',
    name: 'NVIDIA Llama 3.3 70B Instruct',
    contextWindow: 128000,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  },
  {
    id: 'deepseek-ai/deepseek-r1',
    providerId: 'nvidia',
    name: 'NVIDIA DeepSeek R1',
    contextWindow: 131072,
    outputLimit: 16384,
    supportsTools: false,
    supportsStreaming: true,
    isFreeTierAvailable: true
  },
  {
    id: 'nvidia/nemotron-4-340b-instruct',
    providerId: 'nvidia',
    name: 'NVIDIA Nemotron 4 340B',
    contextWindow: 4096,
    outputLimit: 4096,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  }
]

export class NvidiaAdapter extends OpenAICompatAdapter {
  constructor() {
    super({
      id: 'nvidia',
      name: 'NVIDIA NIM',
      defaultBaseUrl: 'https://integrate.api.nvidia.com/v1',
      defaultModels: NVIDIA_DEFAULT_MODELS,
      forceSingleToolCall: true,
      timeoutMs: 180_000
    })
  }
}

