import * as crypto from 'crypto'
import { createLogger } from '@ideia/logger'

const log = createLogger('jwt-auth-provider')

export interface JWTClaims {
  sub: string
  scopes: string[]
  exp: number
  iat: number
  iss?: string
  [key: string]: unknown
}

export class JWTAuthProvider {
  private _secret: string
  private _issuer: string
  private _accessTokenTTL: number
  private _refreshTokenTTL: number

  constructor(config: { secret?: string; issuer?: string; accessTokenTTL?: number; refreshTokenTTL?: number } = {}) {
    this._secret = config.secret || crypto.randomBytes(32).toString('hex')
    this._issuer = config.issuer || 'ideia'
    this._accessTokenTTL = config.accessTokenTTL || 3600
    this._refreshTokenTTL = config.refreshTokenTTL || 604800
  }

  generateAccessToken(sub: string, scopes: string[]): string {
    const claims: JWTClaims = {
      sub,
      scopes,
      exp: Math.floor(Date.now() / 1000) + this._accessTokenTTL,
      iat: Math.floor(Date.now() / 1000),
      iss: this._issuer,
      type: 'access',
    }
    return this._encodeJWT(claims)
  }

  generateRefreshToken(sub: string): string {
    const claims: JWTClaims = {
      sub,
      scopes: ['refresh'],
      exp: Math.floor(Date.now() / 1000) + this._refreshTokenTTL,
      iat: Math.floor(Date.now() / 1000),
      iss: this._issuer,
      type: 'refresh',
    }
    return this._encodeJWT(claims)
  }

  validateToken(token: string): { valid: boolean; claims?: JWTClaims; error?: string } {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) return { valid: false, error: 'Invalid token format' }
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')) as JWTClaims
      const expectedSig = this._signPayload(`${parts[0]}.${parts[1]}`)
      if (parts[2] !== expectedSig) return { valid: false, error: 'Invalid signature' }
      if (payload.exp < Math.floor(Date.now() / 1000)) return { valid: false, error: 'Token expired' }
      return { valid: true, claims: payload }
    } catch (error: any) {
      return { valid: false, error: error.message }
    }
  }

  refreshAccessToken(refreshToken: string): { accessToken?: string; error?: string } {
    const validation = this.validateToken(refreshToken)
    if (!validation.valid) return { error: validation.error }
    if (validation.claims?.type !== 'refresh') return { error: 'Not a refresh token' }
    const newToken = this.generateAccessToken(validation.claims.sub, validation.claims.scopes.filter(s => s !== 'refresh'))
    return { accessToken: newToken }
  }

  private _encodeJWT(claims: JWTClaims): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
    const signature = this._signPayload(`${header}.${payload}`)
    return `${header}.${payload}.${signature}`
  }

  private _signPayload(data: string): string {
    return crypto.createHmac('sha256', this._secret).update(data).digest('base64url')
  }
}
