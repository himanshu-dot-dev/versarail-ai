export class SecretRedactor {
  private static patterns: RegExp[] = [
    // Google Gemini API Keys
    /AIzaSy[A-Za-z0-9_-]{33}/g,
    // OpenAI API Keys
    /sk-[a-zA-Z0-9]{20,T3BlbkFJ[a-zA-Z0-9]{20,}/g,
    /sk-proj-[a-zA-Z0-9_-]{48,}/g,
    // Groq API Keys
    /gsk_[a-zA-Z0-9]{48,}/g,
    // Anthropic API Keys
    /sk-ant-[a-zA-Z0-9_-]{40,}/g,
    // GitHub Tokens
    /gh[pousr]_[A-Za-z0-9_]{36,255}/g,
    // AWS Access Key ID
    /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
    // Generic Bearer Token
    /Bearer\s+([a-zA-Z0-9_\-.~+/]{20,})/gi
  ]

  /**
   * Redacts all detected secret patterns from the input string.
   */
  public static redact(text: string): string {
    if (!text || typeof text !== 'string') {
      return text
    }

    let sanitized = text
    for (const pattern of this.patterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED_SECRET]')
    }
    return sanitized
  }

  /**
   * Redacts secrets recursively from structured objects or arrays.
   */
  public static redactObject<T>(obj: T): T {
    if (!obj || typeof obj !== 'object') {
      if (typeof obj === 'string') {
        return this.redact(obj) as unknown as T
      }
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactObject(item)) as unknown as T
    }

    const copy: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      // Direct key name heuristics (e.g. apiKey, secret, password)
      if (/(?:api_?key|secret|password|token|auth)/i.test(key) && typeof value === 'string') {
        copy[key] = '[REDACTED_SECRET]'
      } else {
        copy[key] = this.redactObject(value)
      }
    }
    return copy as T
  }
}

