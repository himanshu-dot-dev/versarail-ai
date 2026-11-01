import { app, safeStorage } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

export interface EncryptedCredentialRecord {
  id: string
  providerId: string
  label: string
  customEndpoint?: string
  encryptedApiKey: string // base64 representation of safeStorage encrypted Buffer
  maskedKey: string
  createdAt: string
  updatedAt: string
}

export interface CredentialMetadata {
  id: string
  providerId: string
  label: string
  customEndpoint?: string
  maskedKey: string
  isSessionOnly: boolean
  createdAt: string
}

export class SecretStorageService {
  private static instance: SecretStorageService | null = null
  private storageFilePath: string
  private sessionStore = new Map<
    string,
    {
      apiKey: string
      providerId: string
      label: string
      customEndpoint?: string
      createdAt: string
    }
  >() // In-memory session fallback

  private constructor(customStoragePath?: string) {
    if (customStoragePath) {
      this.storageFilePath = customStoragePath
    } else {
      let userDataPath = ''
      try {
        userDataPath = app?.getPath ? app.getPath('userData') : process.cwd()
      } catch {
        userDataPath = process.cwd()
      }
      this.storageFilePath = join(userDataPath, 'credentials.enc')
    }
  }

  public static getInstance(customStoragePath?: string): SecretStorageService {
    if (!this.instance) {
      this.instance = new SecretStorageService(customStoragePath)
    }
    return this.instance
  }

  public static resetInstance(): void {
    this.instance = null
  }

  /**
   * Checks whether the current operating system provides an acceptable secure keyring.
   * Refuses persistence if Linux returns 'basic_text' (plaintext salt fallback).
   */
  public isHardwareEncryptionAvailable(): boolean {
    if (!safeStorage?.isEncryptionAvailable || !safeStorage.isEncryptionAvailable()) {
      return false
    }

    const backend = safeStorage.getSelectedStorageBackend ? safeStorage.getSelectedStorageBackend() : 'unavailable'
    if (backend === 'basic_text') {
      console.warn(
        '[Security Warning] safeStorage backend is "basic_text". OS keyring is unavailable. Refusing disk persistence.'
      )
      return false
    }

    return true
  }

  /**
   * Generates a safe masked preview of an API key (e.g. "AIza••••••••4a8b")
   */
  public static maskKey(key: string): string {
    if (!key || key.length < 8) {
      return '••••••••'
    }
    const prefix = key.slice(0, 4)
    const suffix = key.slice(-4)
    return `${prefix}••••••••${suffix}`
  }

  /**
   * Securely saves or updates a provider credential.
   */
  public async saveCredential(params: {
    id: string
    providerId: string
    label: string
    apiKey: string
    customEndpoint?: string
  }): Promise<{ isSessionOnly: boolean }> {
    const isHardwareSafe = this.isHardwareEncryptionAvailable()

    // Keep in session store for fast in-memory retrieval
    this.sessionStore.set(params.id, {
      apiKey: params.apiKey,
      providerId: params.providerId,
      label: params.label,
      customEndpoint: params.customEndpoint,
      createdAt: new Date().toISOString()
    })

    if (!isHardwareSafe) {
      return { isSessionOnly: true }
    }

    // Encrypt using safeStorage (asynchronous where available, sync fallback)
    const storageAny = safeStorage as unknown as Record<string, (arg: unknown) => unknown>
    let encryptedBuffer: Buffer

    if (typeof storageAny.encryptStringAsync === 'function') {
      encryptedBuffer = (await storageAny.encryptStringAsync(params.apiKey)) as Buffer
    } else {
      encryptedBuffer = safeStorage.encryptString(params.apiKey)
    }
    const record: EncryptedCredentialRecord = {
      id: params.id,
      providerId: params.providerId,
      label: params.label,
      customEndpoint: params.customEndpoint,
      encryptedApiKey: encryptedBuffer.toString('base64'),
      maskedKey: SecretStorageService.maskKey(params.apiKey),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const records = this.readStorageFile()
    const existingIndex = records.findIndex((r) => r.id === params.id)
    if (existingIndex >= 0) {
      records[existingIndex] = record
    } else {
      records.push(record)
    }

    this.writeStorageFile(records)
    return { isSessionOnly: false }
  }

  /**
   * Retrieves and decrypts the credential on demand for privileged HTTP requests.
   */
  public async getDecryptedKey(credentialId: string): Promise<string | null> {
    // Check in-memory session store first
    if (this.sessionStore.has(credentialId)) {
      const sessionKey = this.sessionStore.get(credentialId)?.apiKey
      if (!sessionKey) return null
      return Buffer.isBuffer(sessionKey) ? (sessionKey as Buffer).toString('utf-8') : String(sessionKey)
    }

    const records = this.readStorageFile()
    const record = records.find((r) => r.id === credentialId)
    if (!record) {
      return null
    }

    try {
      const buffer = Buffer.from(record.encryptedApiKey, 'base64')
      const storageAny = safeStorage as unknown as Record<string, (arg: unknown) => unknown>
      let decrypted: unknown

      if (typeof storageAny.decryptStringAsync === 'function') {
        decrypted = await storageAny.decryptStringAsync(buffer)
      } else {
        decrypted = safeStorage.decryptString(buffer)
      }

      if (!decrypted) {
        return null
      }

      let keyStr: string
      if (typeof decrypted === 'object' && decrypted !== null && 'result' in (decrypted as any)) {
        const res = (decrypted as any).result
        keyStr = Buffer.isBuffer(res) ? res.toString('utf-8') : String(res ?? '')
      } else if (Buffer.isBuffer(decrypted)) {
        keyStr = (decrypted as Buffer).toString('utf-8')
      } else {
        keyStr = typeof decrypted === 'string' ? decrypted : String(decrypted)
      }

      // Cache decrypted key in sessionStore for immediate subsequent access
      this.sessionStore.set(credentialId, {
        apiKey: keyStr,
        providerId: record.providerId,
        label: record.label,
        customEndpoint: record.customEndpoint,
        createdAt: record.createdAt
      })

      return keyStr
    } catch (err) {
      console.error(`[SecretStorage] Failed to decrypt key for credential ${credentialId}:`, err)
      return null
    }
  }

  /**
   * Returns list of stored credential metadata (with masked keys; raw keys never returned).
   */
  public listCredentialMetadata(): CredentialMetadata[] {
    const list: CredentialMetadata[] = []

    // Read disk records
    const diskRecords = this.readStorageFile()
    for (const record of diskRecords) {
      list.push({
        id: record.id,
        providerId: record.providerId,
        label: record.label,
        customEndpoint: record.customEndpoint,
        maskedKey: record.maskedKey,
        isSessionOnly: false,
        createdAt: record.createdAt
      })
    }

    // Include session-only credentials
    for (const [id, data] of this.sessionStore.entries()) {
      if (!list.some((r) => r.id === id)) {
        list.push({
          id,
          providerId: data.providerId as any,
          label: data.label,
          customEndpoint: data.customEndpoint,
          maskedKey: SecretStorageService.maskKey(data.apiKey),
          isSessionOnly: true,
          createdAt: data.createdAt
        })
      }
    }

    return list
  }

  /**
   * Returns metadata for a single credential by ID.
   */
  public getCredentialMetadata(credentialId: string): CredentialMetadata | undefined {
    return this.listCredentialMetadata().find((c) => c.id === credentialId)
  }

  /**
   * Deletes a credential from disk and memory.
   */
  public deleteCredential(credentialId: string): boolean {
    const wasInSession = this.sessionStore.delete(credentialId)

    const records = this.readStorageFile()
    const filtered = records.filter((r) => r.id !== credentialId)
    if (filtered.length !== records.length) {
      this.writeStorageFile(filtered)
      return true
    }
    return wasInSession
  }

  private readStorageFile(): EncryptedCredentialRecord[] {
    if (!existsSync(this.storageFilePath)) {
      return []
    }
    try {
      const content = readFileSync(this.storageFilePath, 'utf-8')
      return JSON.parse(content) as EncryptedCredentialRecord[]
    } catch (err) {
      console.error('[SecretStorage] Error reading credentials file:', err)
      return []
    }
  }

  private writeStorageFile(records: EncryptedCredentialRecord[]): void {
    try {
      writeFileSync(this.storageFilePath, JSON.stringify(records, null, 2), {
        encoding: 'utf-8',
        mode: 0o600 // Strict user read/write only permissions
      })
    } catch (err) {
      console.error('[SecretStorage] Error writing credentials file:', err)
      throw new Error('Failed to persist encrypted credentials to disk')
    }
  }
}
