import { OpenAICompatAdapter } from './openai-compat.adapter'
import { ModelDescriptorDTO } from '@shared/domain/models'

const HUGGINGFACE_DEFAULT_MODELS: ModelDescriptorDTO[] = [
  {
    id: 'meta-llama/Llama-3.3-70B-Instruct',
    providerId: 'huggingface',
    name: 'Hugging Face Llama 3.3 70B',
    contextWindow: 128000,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: false
  },
  {
    id: 'Qwen/Qwen3.8-27B',
    providerId: 'huggingface',
    name: 'Hugging Face Qwen 3.8 27B',
    contextWindow: 65536,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: false
  },
  {
    id: 'deepseek-ai/DeepSeek-V4.1-Flash',
    providerId: 'huggingface',
    name: 'Hugging Face DeepSeek V4.1 Flash',
    contextWindow: 128000,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: false
  }
]

export class HuggingFaceAdapter extends OpenAICompatAdapter {
  constructor() {
    super({
      id: 'huggingface',
      name: 'Hugging Face Router',
      defaultBaseUrl: 'https://router.huggingface.co/v1',
      defaultModels: HUGGINGFACE_DEFAULT_MODELS
    })
  }
}

