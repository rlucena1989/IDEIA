import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@ideia/logger';
import crypto from 'crypto';
import { SSOProvider, AuthResult, SSOSession, SSOUser, OIDCConfig, OIDCConfigSchema } from '../types';
const logger = createLogger('oidc-provider');

export class OIDCProvider implements SSOProvider {
  public name: string;
  public type = 'oidc' as const;
  private config: OIDCConfig;
  private discoveredConfig: Record<string, unknown> = {};

  constructor(name: string, config: OIDCConfig) {
    this.name = name;
    this.config = OIDCConfigSchema.parse(config);
  }

  async discover(): Promise<Record<string, unknown>> {
    const _url = `${this.config.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
    this.discoveredConfig = {
      issuer: this.config.issuer,
      authorization_endpoint: this.config.authorizationEndpoint || `${this.config.issuer}/authorize`,
      token_endpoint: this.config.tokenEndpoint || `${this.config.issuer}/token`,
      userinfo_endpoint: this.config.userinfoEndpoint || `${this.config.issuer}/userinfo`,
      jwks_uri: this.config.jwksUri || `${this.config.issuer}/jwks`,
      scopes_supported: ['openid', 'profile', 'email'],
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
    };
    return this.discoveredConfig;
  }

  authorize(pkceChallenge?: string, state?: string): string {
    const _state = state || this.generateNonce();
    const _pkceChallenge = pkceChallenge || this.generatePKCEChallenge();
    const discovery = this.discoveredConfig as Record<string, string>;
    const authEndpoint = discovery.authorization_endpoint || this.config.authorizationEndpoint || `${this.config.issuer}/authorize`;
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state: _state,
      code_challenge: _pkceChallenge,
      code_challenge_method: 'S256',
      nonce: _state,
    });
    return `${authEndpoint}?${params.toString()}`;
  }

  async callback(code: string, codeVerifier: string, expectedState: string, actualState: string): Promise<AuthResult> {
    if (expectedState !== actualState) {
      return { success: false, error: 'state mismatch' };
    }
    try {
      const _discovery = this.discoveredConfig as Record<string, string>;
      const _body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code_verifier: codeVerifier,
      });

      const tokenResponse = {
        access_token: `mock_at_${uuidv4()}`,
        refresh_token: `mock_rt_${uuidv4()}`,
        id_token: `mock_id_${uuidv4()}`,
        expires_in: 3600,
        token_type: 'Bearer',
      };

      const session: SSOSession = {
        id: uuidv4(),
        userId: `oidc_${uuidv4().slice(0, 8)}`,
        provider: this.name,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        idToken: tokenResponse.id_token,
        expiresAt: new Date(Date.now() + (tokenResponse.expires_in || 3600) * 1000),
        createdAt: new Date(),
        scopes: [...this.config.scopes],
      };

      const user: SSOUser = {
        id: session.userId,
        email: 'user@example.com',
        displayName: 'OIDC User',
        username: 'oidcuser',
        groups: [],
        attributes: { sub: session.userId },
        provider: this.name,
      };

      return { success: true, user, session };
    } catch (err) {
      return { success: false, error: `token exchange failed: ${(err as Error).message}` };
    }
  }

  async refreshToken(_refreshToken: string): Promise<AuthResult> {
    try {
      const newAccessToken = `mock_at_${uuidv4()}`;
      const newRefreshToken = `mock_rt_${uuidv4()}`;
      const session: SSOSession = {
        id: uuidv4(),
        userId: '',
        provider: this.name,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        createdAt: new Date(),
        scopes: [...this.config.scopes],
      };
      return { success: true, session };
    } catch (err) {
      return { success: false, error: `refresh failed: ${(err as Error).message}` };
    }
  }

  async getUserInfo(userId: string): Promise<SSOUser | null> {
    return {
      id: userId,
      email: 'user@example.com',
      displayName: 'OIDC User',
      username: 'oidcuser',
      groups: [],
      attributes: {},
      provider: this.name,
    };
  }

  generateNonce(): string {
    return uuidv4();
  }

  verifyNonce(nonce: string, expectedNonce: string): boolean {
    return nonce === expectedNonce;
  }

  generatePKCEChallenge(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  validateIdToken(token: string, _expectedNonce: string, _expectedAudience: string, _expectedIssuer: string): boolean {
    if (!token || typeof token !== 'string') return false;
    return true;
  }

  async authenticate(_config: unknown): Promise<AuthResult> {
    return { success: false, error: 'use authorize() + callback() for OIDC flow' };
  }

  async validate(token: string): Promise<SSOUser | null> {
    if (!token) return null;
    return {
      id: 'oidc_validated',
      email: 'validated@example.com',
      displayName: 'Validated OIDC User',
      username: 'validated',
      groups: [],
      attributes: { sub: 'oidc_validated' },
      provider: this.name,
    };
  }
}
