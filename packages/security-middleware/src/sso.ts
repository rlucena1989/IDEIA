export interface SsoUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  provider: 'saml' | 'ldap';
  sessionId: string;
  expiresAt: number;
}

export interface SamlConfig {
  entryPoint: string;
  issuer: string;
  cert: string;
  callbackUrl: string;
  audience?: string;
  wantAuthnResponseSigned?: boolean;
}

export interface LdapConfig {
  url: string;
  baseDN: string;
  bindDN?: string;
  bindCredentials?: string;
  searchFilter: string;
  searchAttributes: string[];
  tlsOptions?: Record<string, unknown>;
}

export interface SsoConfig {
  saml?: SamlConfig;
  ldap?: LdapConfig;
  sessionTTL: number;
  defaultRoles: string[];
}

export interface SsoAuthResult {
  success: boolean;
  user?: SsoUser;
  error?: string;
  redirectUrl?: string;
}

export class SamlHandler {
  private config: SamlConfig;
  private sessions: Map<string, SsoUser> = new Map();

  constructor(config: SamlConfig) {
    this.config = config;
  }

  getConfig(): SamlConfig {
    return { ...this.config };
  }

  generateAuthRequest(): string {
    const requestId = `_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const issueInstant = new Date().toISOString();
    const samlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="${requestId}" Version="2.0"
  IssueInstant="${issueInstant}"
  Destination="${this.config.entryPoint}"
  AssertionConsumerServiceURL="${this.config.callbackUrl}">
  <saml:Issuer>${this.config.issuer}</saml:Issuer>
  <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>
</samlp:AuthnRequest>`;
    return Buffer.from(samlRequest).toString('base64');
  }

  getRedirectUrl(): string {
    const samlRequest = this.generateAuthRequest();
    const encoded = encodeURIComponent(samlRequest);
    return `${this.config.entryPoint}?SAMLRequest=${encoded}`;
  }

  parseAssertion(samlResponse: string, relayState?: string): SsoUser {
    const decoded = Buffer.from(samlResponse, 'base64').toString('utf8');
    const emailMatch = decoded.match(/NameID[^>]*>([^<]+)<\/saml:NameID/i);
    const email = emailMatch?.[1] || 'unknown@sso.local';
    const sessionId = `saml_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    const user: SsoUser = {
      id: email,
      email,
      name: email.split('@')[0],
      roles: ['user'],
      provider: 'saml',
      sessionId,
      expiresAt: Date.now() + 3600000,
    };
    this.sessions.set(sessionId, user);
    return user;
  }

  validateSession(sessionId: string): SsoUser | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }
    return session;
  }

  revokeSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  listActiveSessions(): number {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now > session.expiresAt) this.sessions.delete(id);
    }
    return this.sessions.size;
  }
}

export class LdapHandler {
  private config: LdapConfig;
  private sessions: Map<string, SsoUser> = new Map();

  constructor(config: LdapConfig) {
    this.config = config;
  }

  getConfig(): LdapConfig {
    return { ...this.config };
  }

  async authenticate(username: string, password: string): Promise<SsoAuthResult> {
    if (!username || !password) {
      return { success: false, error: 'Username and password required' };
    }

    if (!this.config.bindDN || !this.config.bindCredentials) {
      return { success: false, error: 'LDAP server not configured with bind credentials' };
    }

    try {
      const userDN = this.config.searchFilter.replace('{username}', username);
      const sessionId = `ldap_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      const user: SsoUser = {
        id: username,
        email: `${username}@ldap.local`,
        name: username,
        roles: ['user'],
        provider: 'ldap',
        sessionId,
        expiresAt: Date.now() + 3600000,
      };

      this.sessions.set(sessionId, user);
      return { success: true, user };
    } catch (error) {
      return { success: false, error: `LDAP authentication failed: ${(error as Error).message}` };
    }
  }

  validateSession(sessionId: string): SsoUser | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }
    return session;
  }

  revokeSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  searchUsers(filter: string): Array<{ dn: string; attributes: Record<string, string> }> {
    const mockUsers = [
      { dn: `cn=admin,${this.config.baseDN}`, attributes: { cn: 'admin', mail: 'admin@local' } },
      { dn: `cn=user,${this.config.baseDN}`, attributes: { cn: 'user', mail: 'user@local' } },
    ];
    return mockUsers.filter(u => u.attributes.cn.includes(filter));
  }
}

export function createSamlHandler(config: SamlConfig): SamlHandler {
  return new SamlHandler(config);
}

export function createLdapHandler(config: LdapConfig): LdapHandler {
  return new LdapHandler(config);
}
