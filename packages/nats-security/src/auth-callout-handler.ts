import type { Logger } from '@ideia/logger';
import {
  type AuthCalloutRequest,
  type AuthCalloutResponse,
  type UserClaims,
  type SubjectPermission,
} from './types';
import { JWTIssuer } from './jwt-issuer';
import { type NKEYPair } from './types';

export interface AuthCalloutHandlerConfig {
  accountSigningKey: NKEYPair;
  accountKey: string;
  tokenTTL: number;
  maxSubscriptions: number;
  maxData: number;
  maxPayload: number;
}

export interface AuthCalloutUser {
  identity: string;
  nkey: string;
  userKey: NKEYPair;
  permissions: {
    publish: string[];
    publishDeny: string[];
    subscribe: string[];
    subscribeDeny: string[];
  };
  tags: string[];
}

export interface UserDatabase {
  findByNKey(nkey: string): Promise<AuthCalloutUser | null>;
}

export class AuthCalloutHandler {
  private _config: AuthCalloutHandlerConfig;
  private _database: UserDatabase;
  private _jwtIssuer: JWTIssuer;
  private _logger: Logger;
  private _requestCount: number = 0;
  private _successCount: number = 0;
  private _failureCount: number = 0;

  constructor(
    config: AuthCalloutHandlerConfig,
    database: UserDatabase,
    jwtIssuer: JWTIssuer,
    logger: Logger,
  ) {
    this._config = config;
    this._database = database;
    this._jwtIssuer = jwtIssuer;
    this._logger = logger;
  }

  async handleAuthCallout(request: AuthCalloutRequest): Promise<AuthCalloutResponse> {
    this._requestCount++;
    this._logger.info('Auth callout request received', {
      clientNkey: request.clientNkey,
      clientIp: request.clientIp,
    });
    try {
      const user = await this._database.findByNKey(request.clientNkey);
      if (!user) {
        this._failureCount++;
        this._logger.warn('Auth callout failed: user not found', {
          nkey: request.clientNkey,
        });
        return { ok: false, error: 'Authentication failed: unknown user' };
      }
      const pub: SubjectPermission = {
        allow: user.permissions.publish,
        deny: user.permissions.publishDeny,
      };
      const sub: SubjectPermission = {
        allow: user.permissions.subscribe,
        deny: user.permissions.subscribeDeny,
      };
      const jwt = this._jwtIssuer.issueUserJWT(
        this._config.accountSigningKey,
        user.userKey,
        this._config.accountKey,
        {
          name: user.identity,
          pub,
          sub,
          subs: this._config.maxSubscriptions,
          data: this._config.maxData,
          payload: this._config.maxPayload,
          tags: user.tags,
          issuedAt: Date.now(),
          expiresAt: Date.now() + this._config.tokenTTL,
        },
      );
      this._successCount++;
      this._logger.info('Auth callout succeeded', {
        identity: user.identity,
        nkey: user.nkey,
      });
      return {
        ok: true,
        jwt,
        userNkey: user.nkey,
        expiry: Math.floor((Date.now() + this._config.tokenTTL) / 1000),
      };
    } catch (error) {
      this._failureCount++;
      const message = error instanceof Error ? error.message : 'Unknown error';
      this._logger.error('Auth callout internal error', { error: message });
      return { ok: false, error: 'Internal authentication error' };
    }
  }

  getStats(): {
    requestCount: number;
    successCount: number;
    failureCount: number;
    successRate: number;
  } {
    const rate = this._requestCount > 0
      ? this._successCount / this._requestCount
      : 1;
    return {
      requestCount: this._requestCount,
      successCount: this._successCount,
      failureCount: this._failureCount,
      successRate: rate,
    };
  }

  resetStats(): void {
    this._requestCount = 0;
    this._successCount = 0;
    this._failureCount = 0;
  }
}
