/**
 * VersaRail AI Agent Harness - Sensitive File & Directory Exclusion Filter
 * Enforces automatic rejection of sensitive files, secret environments, SSH/GPG keys,
 * and high-volume dependency directories (.env, .git, .ssh, node_modules, private keys).
 */

export interface ExclusionCheckResult {
  excluded: boolean
  matchedPattern?: string
  reason?: string
}

export interface CustomExclusionRule {
  pattern: RegExp | string
  description: string
}

export class ExclusionFilter {
  // Directory or path segments that are blocked at any depth
  private static readonly BLOCKED_SEGMENTS = new Set<string>([
    '.git',
    '.ssh',
    'node_modules',
    '.aws',
    '.azure',
    '.gcp',
    '.gnupg',
    '.npm',
    '.yarn',
    '.pnpm-store',
    '.docker',
    '.kube',
    '.terraform',
    '.vault-token'
  ])

  // Exact file names blocked regardless of parent folder
  private static readonly BLOCKED_FILENAMES = new Set<string>([
    '.env',
    'id_rsa',
    'id_ed25519',
    'id_ecdsa',
    'id_dsa',
    'known_hosts',
    'authorized_keys',
    'credentials',
    'secrets.json',
    'secrets.yaml',
    'secrets.yml',
    '.npmrc',
    '.pypirc',
    '.netrc',
    '.htpasswd',
    'wp-config.php',
    'shadow',
    'sam',
    'system',
    'security',
    'docker-compose.override.yml'
  ])

  // File extensions blocked (private keys, certificates, keystores)
  private static readonly BLOCKED_EXTENSIONS = new Set<string>([
    '.pem',
    '.key',
    '.pkcs12',
    '.pfx',
    '.keystore',
    '.jks',
    '.der',
    '.p12'
  ])

  // Regex patterns matching sensitive environment and credential files
  private static readonly BLOCKED_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
    { pattern: /^\.env(\..+)?$/i, description: 'Environment secret file (.env*)' },
    { pattern: /\.key$/i, description: 'Private key file (.key)' },
    { pattern: /\.pem$/i, description: 'Certificate or PEM private key (.pem)' },
    { pattern: /\.p12$/i, description: 'PKCS#12 certificate bundle (.p12)' },
    { pattern: /^id_[a-z0-9_]+/i, description: 'SSH private key identifier' },
    { pattern: /(?:^|[/\\])\.git(?:[/\\]|$)/i, description: 'Git internal metadata directory' },
    { pattern: /(?:^|[/\\])\.ssh(?:[/\\]|$)/i, description: 'SSH configuration or keys directory' },
    { pattern: /(?:^|[/\\])node_modules(?:[/\\]|$)/i, description: 'Node package dependencies directory' },
    { pattern: /(?:^|[/\\])\.aws(?:[/\\]|$)/i, description: 'AWS credentials directory' },
    { pattern: /(?:^|[/\\])\.docker(?:[/\\]|$)/i, description: 'Docker configuration and credentials' },
    { pattern: /(?:^|[/\\])\.kube(?:[/\\]|$)/i, description: 'Kubernetes configuration and certificates' },
    { pattern: /(?:^|[/\\])\.terraform(?:[/\\]|$)/i, description: 'Terraform state and secret files' },
    { pattern: /(?:^|[/\\])\.config[/\\]gh[/\\]/i, description: 'GitHub CLI credentials' },
    { pattern: /(?:^|[/\\])\.config[/\\]gcloud[/\\]/i, description: 'Google Cloud SDK credentials' }
  ]

  private static customRules: CustomExclusionRule[] = []

  /**
   * Adds a custom exclusion rule.
   */
  public static addCustomExclusion(pattern: RegExp | string, description: string): void {
    this.customRules.push({ pattern, description })
  }

  /**
   * Resets all custom exclusion rules to baseline defaults.
   */
  public static resetCustomExclusions(): void {
    this.customRules = []
  }

  /**
   * Evaluates if a given path (relative or absolute) matches any default or custom exclusion rule.
   */
  public static isExcluded(targetPath: string): ExclusionCheckResult {
    if (!targetPath) {
      return { excluded: false }
    }

    // Normalize slashes to forward slashes for cross-platform evaluation
    const normalized = targetPath.replace(/\\/g, '/').replace(/^\/+/, '')
    const segments = normalized.split('/')
    const baseName = segments[segments.length - 1] || ''

    // 1. Check if any segment in the path matches a blocked directory name
    for (const segment of segments) {
      const lowerSegment = segment.toLowerCase()
      if (this.BLOCKED_SEGMENTS.has(lowerSegment)) {
        return {
          excluded: true,
          matchedPattern: segment,
          reason: `Path contains protected directory "${segment}"`
        }
      }
    }

    // 2. Check exact base filename match
    const lowerBase = baseName.toLowerCase()
    if (this.BLOCKED_FILENAMES.has(lowerBase)) {
      return {
        excluded: true,
        matchedPattern: baseName,
        reason: `Target filename "${baseName}" is a protected credential or environment file`
      }
    }

    // 3. Check blocked file extensions
    const extMatch = lowerBase.match(/\.[a-z0-9]+$/i)
    if (extMatch && this.BLOCKED_EXTENSIONS.has(extMatch[0])) {
      return {
        excluded: true,
        matchedPattern: extMatch[0],
        reason: `File extension "${extMatch[0]}" is restricted (private key / certificate)`
      }
    }

    // 4. Check regex pattern rules
    for (const rule of this.BLOCKED_PATTERNS) {
      if (rule.pattern.test(baseName) || rule.pattern.test(normalized)) {
        return {
          excluded: true,
          matchedPattern: rule.pattern.toString(),
          reason: rule.description
        }
      }
    }

    // 5. Check custom user/workspace rules
    for (const rule of this.customRules) {
      if (typeof rule.pattern === 'string') {
        if (normalized.includes(rule.pattern) || baseName === rule.pattern) {
          return {
            excluded: true,
            matchedPattern: rule.pattern,
            reason: rule.description
          }
        }
      } else if (rule.pattern.test(normalized) || rule.pattern.test(baseName)) {
        return {
          excluded: true,
          matchedPattern: rule.pattern.toString(),
          reason: rule.description
        }
      }
    }

    return { excluded: false }
  }
}

