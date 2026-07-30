import * as crypto from 'crypto'
import { createLogger } from '@ideia/logger';
import { ConfigManager } from '@ideia/config-engine';
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
const config = ConfigManager.getInstance();
const logger = createLogger('sigstore-signer');


export interface SignatureResult {
  artifactPath: string
  signaturePath: string
  certificatePath: string
  keyId: string
  timestamp: string
  digest: string
}

export class SigstoreSigner {
  async signArtifact(artifactPath: string, outputDir?: string): Promise<SignatureResult> {
    const dir = outputDir || resolve(artifactPath, '..')
    const content = readFileSync(artifactPath)
    const digest = crypto.createHash('sha256').update(content).digest('hex')
    const keyId = `ideia-${Date.now().toString(36)}`

    const signature = crypto.sign('sha256', content, {
      key: this._getSigningKey(),
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    })

    const signaturePath = resolve(dir, `${resolve(artifactPath).split(/[\\/]/).pop()}.sig`)
    const certificatePath = resolve(dir, `${resolve(artifactPath).split(/[\\/]/).pop()}.cert`)

    writeFileSync(signaturePath, signature.toString('base64'), 'utf-8')
    writeFileSync(certificatePath, this._generateCertPlaceholder(keyId, digest), 'utf-8')

    return {
      artifactPath,
      signaturePath,
      certificatePath,
      keyId,
      timestamp: new Date().toISOString(),
      digest,
    }
  }

  async signSBOM(sbomPath: string): Promise<SignatureResult> {
    return this.signArtifact(sbomPath)
  }

  async verifySignature(artifactPath: string, signaturePath: string): Promise<boolean> {
    try {
      if (!existsSync(signaturePath)) return false
      const content = readFileSync(artifactPath)
      const signature = Buffer.from(readFileSync(signaturePath, 'utf-8'), 'base64')
      return crypto.verify(
        'sha256',
        content,
        { key: this._getPublicKey(), padding: crypto.constants.RSA_PKCS1_PSS_PADDING },
        signature,
      )
    } catch {
      return false
    }
  }

  private _keyPair: { privateKey: string; publicKey: string } | null = null

  private _getSigningKey(): string {
    if (config.get('IDEIA_SIGNING_KEY')) return config.get('IDEIA_SIGNING_KEY')
    if (!this._keyPair) this._keyPair = this._generateEphemeralKeyPair()
    return this._keyPair.privateKey
  }

  private _getPublicKey(): string {
    if (config.get('IDEIA_SIGNING_PUBLIC_KEY')) return config.get('IDEIA_SIGNING_PUBLIC_KEY')
    if (!this._keyPair) this._keyPair = this._generateEphemeralKeyPair()
    return this._keyPair.publicKey
  }

  private _generateEphemeralKeyPair(): { privateKey: string; publicKey: string } {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
    return {
      privateKey: privateKey.export({ type: 'pkcs1', format: 'pem' }).toString(),
      publicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    }
  }

  private _generateCertPlaceholder(keyId: string, digest: string): string {
    return JSON.stringify({
      keyId,
      digest,
      issuer: 'IDEIA Sigstore Signer (ephemeral)',
      timestamp: new Date().toISOString(),
      algorithm: 'RSA-PSS-SHA256',
    }, null, 2)
  }
}
