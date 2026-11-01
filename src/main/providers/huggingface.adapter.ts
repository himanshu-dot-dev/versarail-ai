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
    isFreeTierAvailable: true
  },
  {
    id: 'Qwen/Qwen2.5-Coder-32B-Instruct',
    providerId: 'huggingface',
    name: 'Hugging Face Qwen 2.5 Coder 32B',
    contextWindow: 32768,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  },
  {
    id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
    providerId: 'huggingface',
    name: 'Hugging Face DeepSeek R1 Distill',
    contextWindow: 65536,
    outputLimit: 8192,
    supportsTools: false,
    supportsStreaming: true,
    isFreeTierAvailable: true
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

