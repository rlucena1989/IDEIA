
jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

import {
  SAMLAuthProvider,
  createSAMLAuthProvider,
  SAMLConfig,
} from '../saml-sso';


describe('SAMLConfig interface', () => {
  it('accepts valid config', () => {
    const cfg: SAMLConfig = {
      entryPoint: 'https://saml.example.com/sso',
      issuer: 'ideia',
      cert: 'MIID...',
      callbackUrl: 'https://app/callback',
      attributeMapping: { 'urn:oid:0.9.2342.19200300.100.1.3': 'email' },
    };
    expect(cfg.issuer).toBe('ideia');
  });
});

describe('SAMLAuthProvider', () => {
  let provider: SAMLAuthProvider;

  const minimalConfig = {
    entryPoint: 'https://saml.example.com/sso',
    issuer: 'ideia-test',
    cert: 'MIID...',
    callbackUrl: 'https://app.example.com/auth/saml/callback',
  };

  describe('constructor', () => {
    it('creates instance with defaults when no config given', () => {
      provider = new SAMLAuthProvider();
      expect(provider).toBeInstanceOf(SAMLAuthProvider);
    });

    it('merges provided config with defaults', () => {
      provider = new SAMLAuthProvider(minimalConfig);
      expect((provider as any).config.entryPoint).toBe('https://saml.example.com/sso');
      expect((provider as any).config.acceptedClockSkewMs).toBe(300000);
    });

    it('merges custom attributeMapping with defaults', () => {
      provider = new SAMLAuthProvider({
        ...minimalConfig,
        attributeMapping: { 'custom:attr': 'customField' },
      });
      const mapping = (provider as any).config.attributeMapping;
      expect(mapping['custom:attr']).toBe('customField');
      expect(mapping['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']).toBe('email');
    });
  });

  describe('isEnabled', () => {
    it('returns true when entryPoint and cert are set', () => {
      provider = new SAMLAuthProvider(minimalConfig);
      expect(provider.isEnabled()).toBe(true);
    });

    it('returns false when entryPoint is empty', () => {
      provider = new SAMLAuthProvider({ ...minimalConfig, entryPoint: '' });
      expect(provider.isEnabled()).toBe(false);
    });

    it('returns false when cert is empty', () => {
      provider = new SAMLAuthProvider({ ...minimalConfig, cert: '' });
      expect(provider.isEnabled()).toBe(false);
    });
  });

  describe('getType', () => {
    it('returns saml', () => {
      provider = new SAMLAuthProvider(minimalConfig);
      expect(provider.getType()).toBe('saml');
    });
  });

  describe('validateConfig', () => {
    it('returns valid=true when all required fields present', () => {
      provider = new SAMLAuthProvider(minimalConfig);
      const result = provider.validateConfig();
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns errors for missing required fields', () => {
      provider = new SAMLAuthProvider({});
      const result = provider.validateConfig();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('entryPoint is required');
      expect(result.errors).toContain('cert is required');
    });
  });

  describe('initialize', () => {
    it('sets initialized flag when enabled', async () => {
      provider = new SAMLAuthProvider(minimalConfig);
      await provider.initialize();
      expect((provider as any).initialized).toBe(true);
    });

    it('does not set initialized when disabled', async () => {
      provider = new SAMLAuthProvider({});
      await provider.initialize();
      expect((provider as any).initialized).toBe(false);
    });
  });

  describe('login', () => {
    it('initializes and returns a session', async () => {
      provider = new SAMLAuthProvider(minimalConfig);
      const session = await provider.login();
      expect(session.id).toMatch(/^saml_sess_/);
      expect(session.userId).toMatch(/^saml_/);
      expect(session.accessToken).toMatch(/^saml_token_/);
    });
  });

  describe('logout', () => {
    it('removes the session', async () => {
      provider = new SAMLAuthProvider(minimalConfig);
      const session = await provider.login();
      await provider.logout(session.id);
      expect(await provider.isAuthenticated(session.id)).toBe(false);
    });
  });

  describe('getUser', () => {
    it('returns user for valid session', async () => {
      provider = new SAMLAuthProvider(minimalConfig);
      const session = await provider.login();
      const user = await provider.getUser(session.id);
      expect(user.id).toBe(session.userId);
      expect(user.name).toBe('SAML User');
    });

    it('throws for expired session', async () => {
      provider = new SAMLAuthProvider(minimalConfig);
      const session = await provider.login();
      jest.spyOn(Date, 'now').mockReturnValueOnce(session.expiresAt + 1);
      await expect(provider.getUser(session.id)).rejects.toThrow('Session expired');
    });

    it('throws for unknown session', async () => {
      provider = new SAMLAuthProvider(minimalConfig);
      await expect(provider.getUser('unknown')).rejects.toThrow('Session not found');
    });
  });

  describe('isAuthenticated', () => {
    it('returns true for valid session', async () => {
      provider = new SAMLAuthProvider(minimalConfig);
      const session = await provider.login();
      await expect(provider.isAuthenticated(session.id)).resolves.toBe(true);
    });

    it('returns false for unknown session', async () => {
      provider = new SAMLAuthProvider(minimalConfig);
      await expect(provider.isAuthenticated('unknown')).resolves.toBe(false);
    });
  });

  describe('refreshSession', () => {
    it('returns new session and deletes old', async () => {
      provider = new SAMLAuthProvider(minimalConfig);
      const session = await provider.login();
      await new Promise(r => setImmediate(r));
      const refreshed = await provider.refreshSession(session.id);
      expect(refreshed.expiresAt).toBeGreaterThan(session.expiresAt);
      expect(refreshed.userId).toBe(session.userId);
      await expect(provider.isAuthenticated(session.id)).resolves.toBe(false);
    });

    it('throws for unknown session', async () => {
      provider = new SAMLAuthProvider(minimalConfig);
      await expect(provider.refreshSession('unknown')).rejects.toThrow('Session not found');
    });
  });

  describe('getLoginUrl', () => {
    it('builds a SAML login URL with AuthnRequest', () => {
      provider = new SAMLAuthProvider(minimalConfig);
      const url = provider.getLoginUrl();
      expect(url).toContain('https://saml.example.com/sso');
      expect(url).toContain('SAMLRequest=');
      expect(url).toContain('RelayState=');
    });

    it('includes AuthnRequest XML encoded in base64', () => {
      provider = new SAMLAuthProvider(minimalConfig);
      const url = provider.getLoginUrl();
      const samlRequestParam = new URL(url).searchParams.get('SAMLRequest');
      expect(samlRequestParam).toBeTruthy();
      const decoded = Buffer.from(samlRequestParam!, 'base64').toString('utf-8');
      expect(decoded).toContain('samlp:AuthnRequest');
      expect(decoded).toContain(minimalConfig.issuer);
    });
  });

  describe('handleCallback', () => {
    it('processes SAML response and returns a session', async () => {
      provider = new SAMLAuthProvider(minimalConfig);
      const samlResponse = Buffer.from(
        '<samlp:Response><saml:Assertion><saml:Subject><saml:NameID>user@saml.com</saml:NameID></saml:Subject></saml:Assertion></samlp:Response>'
      ).toString('base64');
      const session = await provider.handleCallback(samlResponse);
      expect(session.id).toMatch(/^saml_sess_/);
      expect(session.userId).toContain('user@saml.com');
    });

    it('extracts name and email from SAML attributes', async () => {
      provider = new SAMLAuthProvider(minimalConfig);
      const xml = `<samlp:Response>
        <saml:Assertion>
          <saml:Subject><saml:NameID>jdoe</saml:NameID></saml:Subject>
          <saml:AttributeStatement>
            <saml:Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress">
              <saml:AttributeValue>john@example.com</saml:AttributeValue>
            </saml:Attribute>
            <saml:Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name">
              <saml:AttributeValue>John Doe</saml:AttributeValue>
            </saml:Attribute>
            <saml:Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role">
              <saml:AttributeValue>admin, developer</saml:AttributeValue>
            </saml:Attribute>
          </saml:AttributeStatement>
        </saml:Assertion>
      </samlp:Response>`;
      const session = await provider.handleCallback(Buffer.from(xml).toString('base64'));
      const user = await provider.getUser(session.id);
      expect(user.email).toBe('john@example.com');
      expect(user.name).toBe('John Doe');
      expect(user.roles).toContain('admin');
    });

    it('initializes provider if not yet initialized', async () => {
      provider = new SAMLAuthProvider(minimalConfig);
      const samlResponse = Buffer.from('<xml></xml>').toString('base64');
      const session = await provider.handleCallback(samlResponse);
      expect(session).toBeDefined();
    });
  });

  describe('createSAMLAuthProvider', () => {
    it('creates a new SAMLAuthProvider via factory', () => {
      const p = createSAMLAuthProvider(minimalConfig);
      expect(p).toBeInstanceOf(SAMLAuthProvider);
    });

    it('implements AuthProvider interface', () => {
      const p = createSAMLAuthProvider(minimalConfig);
      expect(typeof p.login).toBe('function');
      expect(typeof p.logout).toBe('function');
      expect(typeof p.getUser).toBe('function');
      expect(typeof p.isAuthenticated).toBe('function');
      expect(typeof p.refreshSession).toBe('function');
    });

    it('creates with no config', () => {
      const p = createSAMLAuthProvider();
      expect(p).toBeInstanceOf(SAMLAuthProvider);
    });
  });
});
