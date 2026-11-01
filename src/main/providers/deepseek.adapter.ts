import { OpenAICompatAdapter } from './openai-compat.adapter'
import { ModelDescriptorDTO } from '@shared/domain/models'

const DEEPSEEK_DEFAULT_MODELS: ModelDescriptorDTO[] = [
  {
    id: 'deepseek-ai/DeepSeek-V3',
    providerId: 'deepseek',
    name: 'DeepSeek V3 (Chat & Coding)',
    contextWindow: 65536,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  },
  {
    id: 'deepseek-ai/DeepSeek-R1',
    providerId: 'deepseek',
    name: 'DeepSeek R1 (Frontier Reasoning)',
    contextWindow: 65536,
    outputLimit: 8192,
    supportsTools: false,
    supportsStreaming: true,
    isFreeTierAvailable: true
  },
  {
    id: 'Qwen/Qwen2.5-Coder-32B-Instruct',
    providerId: 'deepseek',
    name: 'Qwen 2.5 Coder 32B (SiliconFlow)',
    contextWindow: 32768,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  }
]

export class DeepSeekAdapter extends OpenAICompatAdapter {
  constructor() {
    super({
      id: 'deepseek',
      name: 'SiliconFlow / DeepSeek',
      defaultBaseUrl: 'https://api.siliconflow.com/v1',
      defaultModels: DEEPSEEK_DEFAULT_MODELS,
      timeoutMs: 120_000
    })
  }
}

