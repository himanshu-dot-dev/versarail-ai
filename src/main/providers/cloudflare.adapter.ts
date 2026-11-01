import { OpenAICompatAdapter } from './openai-compat.adapter'
import { ModelDescriptorDTO } from '@shared/domain/models'

const CLOUDFLARE_DEFAULT_MODELS: ModelDescriptorDTO[] = [
  {
    id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    providerId: 'cloudflare',
    name: 'Cloudflare Llama 3.3 70B Fast',
    contextWindow: 128000,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  },
  {
    id: '@cf/qwen/qwen2.5-coder-32b-instruct',
    providerId: 'cloudflare',
    name: 'Cloudflare Qwen 2.5 Coder 32B',
    contextWindow: 32768,
    outputLimit: 8192,
    supportsTools: true,
    supportsStreaming: true,
    isFreeTierAvailable: true
  },
  {
    id: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
    providerId: 'cloudflare',
    name: 'Cloudflare DeepSeek R1 Distill',
    contextWindow: 65536,
    outputLimit: 8192,
    supportsTools: false,
    supportsStreaming: true,
    isFreeTierAvailable: true
  }
]

export class CloudflareAdapter extends OpenAICompatAdapter {
  constructor() {
    super({
      id: 'cloudflare',
      name: 'Cloudflare Workers AI',
      defaultBaseUrl: 'https://api.cloudflare.com/client/v4/accounts/gateway/ai/v1',
      defaultModels: CLOUDFLARE_DEFAULT_MODELS
    })
  }
}

