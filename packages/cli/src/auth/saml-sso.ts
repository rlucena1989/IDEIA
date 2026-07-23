import { createLogger } from '@ideia/logger';
import type { AuthProvider, Session, User } from './auth-provider';

const log = createLogger('saml-sso');

export interface SAMLConfig {
  entryPoint: string;
  issuer: string;
  cert: string;
  callbackUrl: string;
  audience?: string;
  wantAuthnResponseSigned?: boolean;
  acceptedClockSkewMs?: number;
  identifierFormat?: string;
  attributeMapping: Record<string, string>;
}

const DEFAULT_ATTRIBUTE_MAPPING: Record<string, string> = {
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'email',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': 'name',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname': 'firstName',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname': 'lastName',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role': 'roles',
};

export class SAMLAuthProvider implements AuthProvider {
  private config: SAMLConfig;
  private sessions = new Map<string, Session>();
  private users = new Map<string, User>();
  private initialized = false;

  constructor(config: Partial<SAMLConfig> = {}) {
    this.config = {
      entryPoint: config.entryPoint ?? '',
      issuer: config.issuer ?? 'ideia',
      cert: config.cert ?? '',
      callbackUrl: config.callbackUrl ?? 'http://localhost:3000/auth/saml/callback',
      wantAuthnResponseSigned: config.wantAuthnResponseSigned ?? true,
      acceptedClockSkewMs: config.acceptedClockSkewMs ?? 300000,
      identifierFormat: config.identifierFormat ?? 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      attributeMapping: { ...DEFAULT_ATTRIBUTE_MAPPING, ...config.attributeMapping },
    };
  }

  async login(_credentials?: Record<string, string>): Promise<Session> {
    if (!this.initialized) {
      await this.initialize();
    }

    const userId = `saml_${Date.now()}`;
    const session: Session = {
      id: `saml_sess_${Date.now()}`,
      userId,
      accessToken: `saml_token_${Date.now()}`,
      refreshToken: `saml_refresh_${Date.now()}`,
      expiresAt: Date.now() + 86400000,
      createdAt: Date.now(),
    };
    const user: User = {
      id: userId,
      email: `${userId}@saml.user`,
      name: 'SAML User',
      roles: ['user'],
    };

    this.sessions.set(session.id, session);
    this.users.set(userId, user);
    log.info('SAML login successful', { userId });
    return session;
  }

  async logout(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    log.info('SAML logout', { sessionId });
  }

  async getUser(sessionId: string): Promise<User> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    if (Date.now() > session.expiresAt) {
      throw new Error('Session expired');
    }
    const user = this.users.get(session.userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async isAuthenticated(sessionId: string): Promise<boolean> {
    try {
      await this.getUser(sessionId);
      return true;
    } catch {
      return false;
    }
  }

  async refreshSession(sessionId: string): Promise<Session> {
    const oldSession = this.sessions.get(sessionId);
    if (!oldSession) {
      throw new Error('Session not found');
    }
    const newSession: Session = {
      ...oldSession,
      id: `saml_sess_${Date.now()}`,
      expiresAt: Date.now() + 86400000,
      createdAt: Date.now(),
    };
    this.sessions.delete(sessionId);
    this.sessions.set(newSession.id, newSession);
    return newSession;
  }

  getType(): string {
    return 'saml';
  }

  isEnabled(): boolean {
    return !!this.config.entryPoint && !!this.config.cert;
  }

  async initialize(): Promise<void> {
    if (!this.isEnabled()) {
      log.warn('SAML not configured');
      return;
    }
    this.initialized = true;
    log.info('SAML provider initialized', {
      issuer: this.config.issuer,
      entryPoint: this.config.entryPoint,
    });
  }

  getLoginUrl(): string {
    const samlRequest = this.buildAuthnRequest();
    const encoded = Buffer.from(samlRequest).toString('base64');
    const url = new URL(this.config.entryPoint);
    url.searchParams.set('SAMLRequest', encoded);
    url.searchParams.set('RelayState', Buffer.from(JSON.stringify({ ts: Date.now() })).toString('base64'));
    return url.toString();
  }

  async handleCallback(samlResponse: string, _relayState?: string): Promise<Session> {
    if (!this.initialized) {
      await this.initialize();
    }

    const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');
    const nameId = this.extractNameId(decoded);
    const email = this.extractAttribute(decoded, 'email') || `${nameId}@saml.user`;
    const name = this.extractAttribute(decoded, 'name') || nameId;
    const rolesStr = this.extractAttribute(decoded, 'roles');

    const userId = `saml_${nameId}`;
    const session: Session = {
      id: `saml_sess_${Date.now()}`,
      userId,
      accessToken: `saml_token_${Date.now()}`,
      refreshToken: `saml_refresh_${Date.now()}`,
      expiresAt: Date.now() + 86400000,
      createdAt: Date.now(),
    };
    const user: User = {
      id: userId,
      email,
      name,
      roles: rolesStr ? rolesStr.split(',').map(r => r.trim()) : ['user'],
    };

    this.sessions.set(session.id, session);
    this.users.set(userId, user);

    return session;
  }

  private buildAuthnRequest(): string {
    const now = new Date().toISOString();
    const id = `_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="${id}"
    Version="2.0"
    IssueInstant="${now}"
    Destination="${this.config.entryPoint}"
    AssertionConsumerServiceURL="${this.config.callbackUrl}"
    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer>${this.config.issuer}</saml:Issuer>
  <samlp:NameIDPolicy
      Format="${this.config.identifierFormat}"
      AllowCreate="true"/>
</samlp:AuthnRequest>`;
  }

  private extractNameId(xml: string): string {
    const match = xml.match(/<saml:NameID[^>]*>(.*?)<\/saml:NameID>/s)
      || xml.match(/<NameID[^>]*>(.*?)<\/NameID>/s);
    return match?.[1]?.trim() ?? `user_${Date.now()}`;
  }

  private extractAttribute(xml: string, key: string): string | undefined {
    const mappedAttr = Object.entries(this.config.attributeMapping)
      .find(([, v]) => v === key)?.[0];
    if (!mappedAttr) return undefined;

    const regex = new RegExp(
      `<saml:Attribute[^>]*Name="${this.escapeXml(mappedAttr)}"[^>]*>\\s*<saml:AttributeValue[^>]*>(.*?)</saml:AttributeValue>`, 's'
    );
    const match = xml.match(regex);
    return match?.[1]?.trim();
  }

  private escapeXml(str: string): string {
    return str.replace(/[<>&'"]/g, c => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!this.config.entryPoint) errors.push('entryPoint is required');
    if (!this.config.cert) errors.push('cert is required');
    if (!this.config.issuer) errors.push('issuer is required');
    return { valid: errors.length === 0, errors };
  }
}

export function createSAMLAuthProvider(config?: Partial<SAMLConfig>): SAMLAuthProvider {
  return new SAMLAuthProvider(config);
}
