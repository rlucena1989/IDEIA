import { z } from 'zod';
import { createLogger } from '@ideia/logger';
const logger = createLogger('types');

export const OIDCConfigSchema = z.object({
  issuer: z.string().url(),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  redirectUri: z.string().url(),
  scopes: z.array(z.string()).default(['openid', 'profile', 'email']),
  authorizationEndpoint: z.string().url().optional(),
  tokenEndpoint: z.string().url().optional(),
  userinfoEndpoint: z.string().url().optional(),
  jwksUri: z.string().url().optional(),
});

export const SAMLConfigSchema = z.object({
  entityId: z.string().min(1),
  ssoUrl: z.string().url(),
  certificate: z.string().min(1),
  privateKey: z.string().min(1),
  assertionConsumerServiceUrl: z.string().url(),
  issuer: z.string().min(1),
  audience: z.string().min(1),
  nameIdFormat: z.string().default('urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'),
});

export const LDAPConfigSchema = z.object({
  url: z.string().min(1),
  baseDN: z.string().min(1),
  bindDN: z.string().min(1),
  bindCredentials: z.string().min(1),
  searchBase: z.string().min(1),
  searchFilter: z.string().default('(objectClass=person)'),
  userAttributes: z.array(z.string()).default(['dn', 'cn', 'mail', 'uid', 'memberOf']),
  tlsOptions: z.object({
    rejectUnauthorized: z.boolean().default(true),
  }).optional(),
});

export type OIDCConfig = z.infer<typeof OIDCConfigSchema>;
export type SAMLConfig = z.infer<typeof SAMLConfigSchema>;
export type LDAPConfig = z.infer<typeof LDAPConfigSchema>;

export interface SSOUser {
  id: string;
  email: string;
  displayName: string;
  username: string;
  groups: SSOGroup[];
  attributes: Record<string, unknown>;
  provider: string;
}

export interface SSOGroup {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
}

export interface SSOSession {
  id: string;
  userId: string;
  provider: string;
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: Date;
  createdAt: Date;
  scopes: string[];
}

export interface AuthResult {
  success: boolean;
  user?: SSOUser;
  session?: SSOSession;
  error?: string;
}

export interface SSOProvider {
  name: string;
  type: 'oidc' | 'saml' | 'ldap';
  authenticate(config: unknown): Promise<AuthResult>;
  validate(token: string): Promise<SSOUser | null>;
  getUserInfo(userId: string): Promise<SSOUser | null>;
}
