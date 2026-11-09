# AI Provider Brand Icons

This directory contains original vector SVG icons for all supported AI providers in VersaRail AI.

> [!NOTE]
> Per project requirements, these assets are prepared and stored here in the asset layer. They will be connected to the live UI (`ProvidersView.tsx`, `PromptComposer.tsx`, etc.) in a future UI update.

## Asset Roster

| Provider ID / Type | Brand / Name | File Name | Description / Theme |
| :--- | :--- | :--- | :--- |
| `openai` / `custom` | OpenAI (Official Logo) | [`openai.svg`](./openai.svg) | Official OpenAI floral spiral mark (`currentColor`) |
| `custom` | Custom OpenAI-Compatible | [`custom.svg`](./custom.svg) | Dedicated asset matching `p.providerId === 'custom'` |
| `custom` | OpenAI-Compatible Alias | [`openai-compatible.svg`](./openai-compatible.svg) | Explicit alias for OpenAI-compatible gateways / proxies |
| `gemini` | Google Gemini | [`gemini.svg`](./gemini.svg) | Full official brand gradient (Blue/Emerald/Coral) |
| `groq` | GroqCloud | [`groq.svg`](./groq.svg) | Official stylized "G" loop (Vector path) |
| `cerebras` | Cerebras Cloud | [`cerebras.svg`](./cerebras.svg) | Official wafer engine brand icon (Orange `#F15A29`) |
| `nvidia` | NVIDIA NIM | [`nvidia.svg`](./nvidia.svg) | Official NVIDIA green emblem (`#76B900`) |
| `mistral` | Mistral AI | [`mistral.svg`](./mistral.svg) | Official layered pixel/bar gradient (`#F2A000`) |
| `deepseek` | DeepSeek / SiliconFlow | [`deepseek.svg`](./deepseek.svg) | Official DeepSeek blue whale / dolphin vector (`#0C6FF9`) |
| `cloudflare` | Cloudflare Workers AI | [`cloudflare.svg`](./cloudflare.svg) | Official Cloudflare brand cloud (`#F38020`) |
| `cohere` | Cohere | [`cohere.svg`](./cohere.svg) | Official Cohere organic coral mark (`#D15545`) |
| `pollinations` | Pollinations.ai | [`pollinations.svg`](./pollinations.svg) | Official Pollinations AI blossom vector mark |
| `kilo` | Kilo Gateway | [`kilo.svg`](./kilo.svg) | Official Kilo Code square matrix / geometric mark |
| `openrouter` | OpenRouter Gateway | [`openrouter.svg`](./openrouter.svg) | Official OpenRouter interconnected routes mark (`#6566F1`) |
| `huggingface` | Hugging Face | [`huggingface.svg`](./huggingface.svg) | Official Hugging Face emoji logo (`#FFD21E` / `#FF9D0B`) |
| `custom` / `ollama` | Ollama / Local AI | [`ollama.svg`](./ollama.svg) | Official Ollama llama vector mark |

---

## Usage in React / Vite (When Ready to Connect)

When you are ready to use these in `ProvidersView.tsx` or other components:

### Option 1: Direct URL Import (Standard in Vite)
```tsx
import geminiIcon from '../../assets/providers/gemini.svg'
import groqIcon from '../../assets/providers/groq.svg'
import customIcon from '../../assets/providers/custom.svg'
import huggingFaceIcon from '../../assets/providers/huggingface.svg'

<img src={customIcon} alt="Custom OpenAI-Compatible" className="w-5 h-5 object-contain" />
```

### Option 2: Provider Icon Map
```tsx
const PROVIDER_ICONS: Record<string, string> = {
  gemini: new URL('../../assets/providers/gemini.svg', import.meta.url).href,
  groq: new URL('../../assets/providers/groq.svg', import.meta.url).href,
  cerebras: new URL('../../assets/providers/cerebras.svg', import.meta.url).href,
  nvidia: new URL('../../assets/providers/nvidia.svg', import.meta.url).href,
  mistral: new URL('../../assets/providers/mistral.svg', import.meta.url).href,
  deepseek: new URL('../../assets/providers/deepseek.svg', import.meta.url).href,
  cloudflare: new URL('../../assets/providers/cloudflare.svg', import.meta.url).href,
  cohere: new URL('../../assets/providers/cohere.svg', import.meta.url).href,
  pollinations: new URL('../../assets/providers/pollinations.svg', import.meta.url).href,
  kilo: new URL('../../assets/providers/kilo.svg', import.meta.url).href,
  openrouter: new URL('../../assets/providers/openrouter.svg', import.meta.url).href,
  huggingface: new URL('../../assets/providers/huggingface.svg', import.meta.url).href,
  custom: new URL('../../assets/providers/custom.svg', import.meta.url).href,
  ollama: new URL('../../assets/providers/ollama.svg', import.meta.url).href
}
```
