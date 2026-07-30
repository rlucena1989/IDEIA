import { OIDCProvider } from '../src/providers/oidc-provider';
import { SAMLProvider } from '../src/providers/saml-provider';
import { LDAPProvider } from '../src/providers/ldap-provider';
import { createSSOMiddleware } from '../src/middleware/express-middleware';
import {
  OIDCConfigSchema,
  SAMLConfigSchema,
  LDAPConfigSchema,
  SSOProvider,
} from '../src/types';

const oidcConfig = {
  issuer: 'https://accounts.example.com',
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  redirectUri: 'https://app.example.com/callback',
  scopes: ['openid', 'profile', 'email'],
};

const samlConfig = {
  entityId: 'https://app.example.com/saml',
  ssoUrl: 'https://saml.example.com/sso',
  certificate: 'MIIBpDCCAQ2gAwIBAgIU...',
  privateKey: 'MIIEpAIBAAKCAQEAu1...',
  assertionConsumerServiceUrl: 'https://app.example.com/saml/acs',
  issuer: 'https://app.example.com/saml',
  audience: 'https://app.example.com/saml',
  nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
};

const ldapConfig = {
  url: 'ldaps://ldap.example.com:636',
  baseDN: 'dc=example,dc=com',
  bindDN: 'cn=admin,dc=example,dc=com',
  bindCredentials: 'admin-password',
  searchBase: 'ou=users,dc=example,dc=com',
  searchFilter: '(objectClass=person)',
  userAttributes: ['dn', 'cn', 'mail', 'uid', 'memberOf'],
};

describe('OIDCProvider', () => {
  let provider: OIDCProvider;

  beforeEach(() => {
    provider = new OIDCProvider('test-oidc', oidcConfig);
  });

  it('should discover OIDC configuration', async () => {
    const discovery = await provider.discover();
    expect(discovery).toBeDefined();
    expect(discovery.issuer).toBe('https://accounts.example.com');
  });

  it('should build authorization URL with PKCE', () => {
    const url = provider.authorize('pkce_challenge', 'state_value');
    expect(url).toContain('authorize');
    expect(url).toContain('response_type=code');
    expect(url).toContain('client_id=test-client-id');
    expect(url).toContain('code_challenge=pkce_challenge');
    expect(url).toContain('code_challenge_method=S256');
    expect(url).toContain('state=state_value');
    expect(url).toContain('nonce=state_value');
  });

  it('should generate nonce', () => {
    const nonce1 = provider.generateNonce();
    const nonce2 = provider.generateNonce();
    expect(nonce1).toBeDefined();
    expect(nonce1).not.toBe(nonce2);
  });

  it('should verify nonce correctly', () => {
    const nonce = provider.generateNonce();
    expect(provider.verifyNonce(nonce, nonce)).toBe(true);
    expect(provider.verifyNonce(nonce, 'wrong')).toBe(false);
  });

  it('should generate PKCE challenge and code verifier', () => {
    const challenge = provider.generatePKCEChallenge();
    const verifier = provider.generateCodeVerifier();
    expect(challenge).toBeDefined();
    expect(verifier).toBeDefined();
    expect(challenge.length).toBeGreaterThan(0);
    expect(verifier.length).toBeGreaterThan(0);
  });

  it('should handle callback with valid parameters', async () => {
    const result = await provider.callback('auth_code', 'verifier', 'expected_state', 'expected_state');
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.session).toBeDefined();
    expect(result.session!.accessToken).toBeDefined();
  });

  it('should reject callback with state mismatch', async () => {
    const result = await provider.callback('auth_code', 'verifier', 'expected', 'actual_different');
    expect(result.success).toBe(false);
    expect(result.error).toContain('state mismatch');
  });

  it('should refresh token with rotation', async () => {
    const result = await provider.refreshToken('old_refresh_token');
    expect(result.success).toBe(true);
    expect(result.session).toBeDefined();
    expect(result.session!.accessToken).toBeDefined();
    expect(result.session!.refreshToken).toBeDefined();
  });

  it('should validate ID token structure', () => {
    expect(provider.validateIdToken('valid.token.here', 'nonce', 'audience', 'issuer')).toBe(true);
    expect(provider.validateIdToken('', 'nonce', 'audience', 'issuer')).toBe(false);
  });

  it('should get user info', async () => {
    const user = await provider.getUserInfo('test-user-id');
    expect(user).toBeDefined();
    expect(user!.id).toBe('test-user-id');
    expect(user!.provider).toBe('test-oidc');
  });

  it('should implement SSOProvider interface', () => {
    expect(provider.name).toBe('test-oidc');
    expect(provider.type).toBe('oidc');
  });
});

describe('SAMLProvider', () => {
  let provider: SAMLProvider;

  beforeEach(() => {
    provider = new SAMLProvider('test-saml', samlConfig);
  });

  it('should generate metadata XML with correct fields', () => {
    const metadata = provider.getMetadata();
    expect(metadata).toContain('EntityDescriptor');
    expect(metadata).toContain(samlConfig.entityId);
    expect(metadata).toContain(samlConfig.assertionConsumerServiceUrl);
    expect(metadata).toContain(samlConfig.certificate);
    expect(metadata).toContain(samlConfig.nameIdFormat);
  });

  it('should create authn request with correct structure', () => {
    const authnRequest = provider.createAuthnRequest();
    expect(authnRequest).toContain('AuthnRequest');
    expect(authnRequest).toContain(samlConfig.ssoUrl);
    expect(authnRequest).toContain(samlConfig.assertionConsumerServiceUrl);
    expect(authnRequest).toContain(samlConfig.issuer);
    expect(authnRequest).toContain(samlConfig.nameIdFormat);
  });

  it('should validate assertion and return auth result', async () => {
    const result = await provider.validateAssertion('<samlp:Response></samlp:Response>');
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.session).toBeDefined();
  });

  it('should reject empty assertion', async () => {
    const result = await provider.validateAssertion('');
    expect(result.success).toBe(false);
  });

  it('should extract attributes from assertion', () => {
    const attrs = provider.extractAttributes('<saml:Assertion><NameID>user@example.com</NameID></saml:Assertion>');
    expect(attrs).toBeDefined();
    expect(attrs.nameId).toBe('samluser@example.com');
  });

  it('should generate ACS response', () => {
    const response = provider.generateACS('c2FtbF9yZXNwb25zZQ==');
    const parsed = JSON.parse(response);
    expect(parsed.status).toBe('success');
    expect(parsed.attributes).toBeDefined();
  });
});

describe('LDAPProvider', () => {
  let provider: LDAPProvider;

  beforeEach(() => {
    provider = new LDAPProvider('test-ldap', ldapConfig);
  });

  it('should authenticate with valid credentials', async () => {
    const result = await provider.authenticate({ dn: 'cn=user1,ou=users,dc=example,dc=com', password: 'password123' });
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.session).toBeDefined();
  });

  it('should reject authentication without credentials', async () => {
    const result = await provider.authenticate({ dn: '', password: '' });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should search directory with filter', async () => {
    const results = await provider.search('(cn=user1)');
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.cn).toContain('user1');
  });

  it('should search with custom base', async () => {
    const results = await provider.search('(uid=user1)', 'ou=admins,dc=example,dc=com');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should map groups from memberOf to IDEIA roles', () => {
    const memberOf = [
      'CN=developers,OU=groups,DC=example,DC=com',
      'CN=admins,OU=groups,DC=example,DC=com',
    ];
    const groups = provider.mapGroups(memberOf);
    expect(groups).toHaveLength(2);
    expect(groups[0]!.name).toBe('developer');
    expect(groups[1]!.name).toBe('admin');
  });

  it('should handle empty memberOf', () => {
    const groups = provider.mapGroups([]);
    expect(groups).toHaveLength(0);
  });

  it('should find user by username', async () => {
    const user = await provider.findUser({ username: 'user1' });
    expect(user).toBeDefined();
    expect(user!.username).toBe('user1');
  });

  it('should find user by email', async () => {
    const user = await provider.findUser({ email: 'user1@example.com' });
    expect(user).toBeDefined();
    expect(user!.email).toBe('user1@example.com');
  });

  it('should return null for unknown user', async () => {
    const user = await provider.findUser({ username: 'nonexistent' });
    expect(user).toBeDefined();
  });
});

describe('Middleware', () => {
  it('should create factory with provider registration', () => {
    const providers = new Map<string, SSOProvider>();
    const middleware = createSSOMiddleware({ providers });
    expect(middleware).toBeDefined();
    expect(middleware.authGuard).toBeDefined();
    expect(middleware.callbackHandler).toBeDefined();
    expect(middleware.getProvider).toBeDefined();
    expect(middleware.registerProvider).toBeDefined();
    expect(middleware.authenticate).toBeDefined();
  });

  it('should register and retrieve providers', () => {
    const providers = new Map<string, SSOProvider>();
    const middleware = createSSOMiddleware({ providers });
    const oidcProvider = new OIDCProvider('test-oidc', oidcConfig);
    middleware.registerProvider('test-oidc', oidcProvider);
    const retrieved = middleware.getProvider('test-oidc');
    expect(retrieved).toBe(oidcProvider);
  });

  it('should return undefined for unregistered provider', () => {
    const providers = new Map<string, SSOProvider>();
    const middleware = createSSOMiddleware({ providers });
    expect(middleware.getProvider('unknown')).toBeUndefined();
  });

  it('should create auth guard function', () => {
    const providers = new Map<string, SSOProvider>();
    const middleware = createSSOMiddleware({ providers, defaultProvider: 'test-oidc' });
    const authGuard = middleware.authGuard();
    expect(typeof authGuard).toBe('function');
  });

  it('should create callback handler for a provider', () => {
    const providers = new Map<string, SSOProvider>();
    const oidcProvider = new OIDCProvider('test-oidc', oidcConfig);
    providers.set('test-oidc', oidcProvider);
    const middleware = createSSOMiddleware({ providers });
    const callbackHandler = middleware.callbackHandler('test-oidc');
    expect(typeof callbackHandler).toBe('function');
  });

  it('should authenticate through middleware', async () => {
    const providers = new Map<string, SSOProvider>();
    const oidcProvider = new OIDCProvider('test-oidc', oidcConfig);
    providers.set('test-oidc', oidcProvider);
    const middleware = createSSOMiddleware({ providers });
    const result = await middleware.authenticate('test-oidc', {});
    expect(result).toBeDefined();
  });
});

describe('Type validation', () => {
  it('should validate OIDC config', () => {
    const valid = OIDCConfigSchema.parse(oidcConfig);
    expect(valid.issuer).toBe(oidcConfig.issuer);
    expect(valid.scopes).toEqual(['openid', 'profile', 'email']);
  });

  it('should reject invalid OIDC config', () => {
    expect(() => OIDCConfigSchema.parse({ issuer: 'not-a-url', clientId: '' })).toThrow();
  });

  it('should validate SAML config', () => {
    const valid = SAMLConfigSchema.parse(samlConfig);
    expect(valid.entityId).toBe(samlConfig.entityId);
  });

  it('should reject invalid SAML config', () => {
    expect(() => SAMLConfigSchema.parse({})).toThrow();
  });

  it('should validate LDAP config', () => {
    const valid = LDAPConfigSchema.parse(ldapConfig);
    expect(valid.url).toBe(ldapConfig.url);
    expect(valid.searchFilter).toBe('(objectClass=person)');
  });

  it('should reject invalid LDAP config', () => {
    expect(() => LDAPConfigSchema.parse({ url: 'not-a-url' })).toThrow();
  });

  it('should apply default values in OIDC config', () => {
    const minimal = {
      issuer: 'https://accounts.example.com',
      clientId: 'test-client-id',
      clientSecret: 'test-secret',
      redirectUri: 'https://app.example.com/callback',
    };
    const config = OIDCConfigSchema.parse(minimal);
    expect(config.scopes).toEqual(['openid', 'profile', 'email']);
  });
});
