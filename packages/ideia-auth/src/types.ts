import { Disposable, Event } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
const logger = createLogger('types');

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  roles: string[];
  organizations: string[];
  mfaEnabled: boolean;
  createdAt: Date;
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  scopes: string[];
}

export interface AuthProvider {
  readonly id: string;
  readonly name: string;
  login(credentials?: Record<string, string>): Promise<AuthSession>;
  logout(sessionId: string): Promise<void>;
  refreshToken(refreshToken: string): Promise<AuthSession>;
  getUser(session: AuthSession): Promise<AuthUser>;
}

export interface OAuth2Provider extends AuthProvider {
  getAuthorizationUrl(state: string, redirectUri: string): string;
  handleCallback(code: string, state: string, redirectUri: string): Promise<AuthSession>;
}

export interface SamlProvider extends AuthProvider {
  getSamlRedirectUrl(): string;
  handleAcsResponse(samlResponse: string): Promise<AuthSession>;
}

export interface JwtService {
  sign(payload: JwtPayload, secret: string, expiresIn: string): string;
  verify(token: string, secret: string): JwtPayload;
  decode(token: string): JwtPayload;
}

export interface JwtPayload {
  sub: string;
  iss?: string;
  aud?: string;
  exp?: number;
  iat?: number;
  scopes?: string[];
  roles?: string[];
}

export interface RbacService {
  hasRole(userId: string, role: string): boolean;
  addRole(userId: string, role: string): void;
  removeRole(userId: string, role: string): void;
  getRoles(userId: string): string[];
  checkAccess(userId: string, resource: string, action: string): boolean;
  onRolesChanged: Event<{ userId: string; roles: string[] }>;
}

export interface AbacService {
  evaluate(subject: AbacSubject, resource: AbacResource, action: string, context: Record<string, unknown>): Promise<boolean>;
  registerPolicy(policy: AbacPolicy): Disposable;
}

export interface AbacSubject {
  id: string;
  roles: string[];
  attributes: Record<string, unknown>;
}

export interface AbacResource {
  type: string;
  id: string;
  attributes: Record<string, unknown>;
  owner?: string;
}

export interface AbacPolicy {
  id: string;
  name: string;
  effect: 'allow' | 'deny';
  subjects: string[];
  resources: string[];
  actions: string[];
  conditions?: AbacCondition[];
}

export interface AbacCondition {
  attribute: string;
  operator: 'eq' | 'neq' | 'in' | 'contains' | 'gt' | 'lt';
  value: unknown;
}

export interface ApiKeyService {
  createKey(userId: string, name: string, scopes: string[], expiresIn?: string): Promise<ApiKey>;
  revokeKey(keyId: string): Promise<void>;
  validateKey(key: string): Promise<ApiKeyValidation>;
  listKeys(userId: string): Promise<ApiKey[]>;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  scopes: string[];
  userId: string;
  createdAt: Date;
  expiresAt?: Date;
  revoked: boolean;
}

export interface ApiKeyValidation {
  valid: boolean;
  key?: ApiKey;
  error?: string;
}

export interface WebAuthnService {
  register(userId: string): Promise<CredentialCreationOptions>;
  authenticate(userId: string): Promise<CredentialRequestOptions>;
  verifyRegistration(userId: string, credential: unknown): Promise<boolean>;
  verifyAuthentication(userId: string, credential: unknown): Promise<boolean>;
}

export interface MfaService {
  generateTotpSecret(userId: string): Promise<string>;
  verifyTotp(userId: string, code: string): Promise<boolean>;
  enableMfa(userId: string): Promise<void>;
  disableMfa(userId: string): Promise<void>;
}
