import * as crypto from 'crypto'
import { createLogger } from '@ideia/logger'

const log = createLogger('api-key-manager')

export interface ApiKeyEntry {
  id: string
  name: string
  keyPrefix: string
  keyHash: string
  scopes: string[]
  createdAt: string
  lastUsedAt: string | null
  expiresAt: string | null
  active: boolean
}

export class APIKeyManager {
  private _keys: Map<string, ApiKeyEntry> = new Map()

  create(name: string, scopes: string[], expiresAt?: string): { id: string; key: string; keyPrefix: string } {
    const id = `key_${crypto.randomUUID().slice(0, 8)}`
    const key = `ideia_sk_${crypto.randomBytes(32).toString('hex')}`
    const keyPrefix = key.slice(0, 12)
    const keyHash = crypto.createHash('sha256').update(key).digest('hex')

    this._keys.set(id, {
      id, name, keyPrefix, keyHash, scopes,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      expiresAt: expiresAt || null,
      active: true,
    })

    log.info(`API key created: ${id} (${name})`)
    return { id, key, keyPrefix }
  }

  validate(key: string): { valid: boolean; entry?: ApiKeyEntry; error?: string } {
    const keyHash = crypto.createHash('sha256').update(key).digest('hex')
    for (const entry of this._keys.values()) {
      if (entry.keyHash !== keyHash) continue
      if (!entry.active) return { valid: false, error: 'Key is revoked' }
      if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) return { valid: false, error: 'Key expired' }
      entry.lastUsedAt = new Date().toISOString()
      return { valid: true, entry }
    }
    return { valid: false, error: 'Key not found' }
  }

  revoke(id: string): boolean {
    const entry = this._keys.get(id)
    if (!entry) return false
    entry.active = false
    log.info(`API key revoked: ${id}`)
    return true
  }

  list(): ApiKeyEntry[] {
    return Array.from(this._keys.values())
  }

  getById(id: string): ApiKeyEntry | undefined {
    return this._keys.get(id)
  }
}
