import { OIDCProvider } from './oidc-provider';
import { createLogger } from '@ideia/logger';
import type { SSOUser, AuthResult, SSOSession } from '../types';
const logger = createLogger('keycloak-provider');

export interface KeycloakConfig {
  baseUrl: string;
  realm: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class KeycloakProvider {
  public name: string;
  public type = 'keycloak' as const;
  private oidcProvider: OIDCProvider;

  constructor(config: KeycloakConfig) {
    this.name = `keycloak:${config.realm}`;
    this.oidcProvider = new OIDCProvider(`keycloak-${config.realm}`, {
      issuer: `${config.baseUrl}/realms/${config.realm}`,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      scopes: ['openid', 'profile', 'email', 'roles'],
    });
  }

  async authenticate(_config: unknown): Promise<AuthResult> {
    return this.oidcProvider.authenticate(_config);
  }

  async validate(token: string): Promise<SSOUser | null> {
    const user = await this.oidcProvider.validate(token);
    if (user) {
      user.provider = `keycloak:${this.name}`;
    }
    return user;
  }

  async getUserInfo(userId: string): Promise<SSOUser | null> {
    return this.oidcProvider.getUserInfo(userId);
  }

  getAuthorizationUrl(): string {
    return `${this.oidcProvider['config'].issuer}/protocol/openid-connect/auth`;
  }

  getLogoutUrl(redirectUri: string): string {
    return `${this.oidcProvider['config'].issuer}/protocol/openid-connect/logout?redirect_uri=${encodeURIComponent(redirectUri)}`;
  }
}
