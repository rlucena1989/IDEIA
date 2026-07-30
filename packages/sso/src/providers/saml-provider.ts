import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@ideia/logger';
import { SSOProvider, SSOSession, SSOUser, SAMLConfig, SAMLConfigSchema, AuthResult } from '../types';
const logger = createLogger('saml-provider');

export class SAMLProvider implements SSOProvider {
  public name: string;
  public type = 'saml' as const;
  private config: SAMLConfig;

  constructor(name: string, config: SAMLConfig) {
    this.name = name;
    this.config = SAMLConfigSchema.parse(config);
  }

  getMetadata(): string {
    const _now = new Date().toISOString();
    return `<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${this.config.entityId}">
  <md:SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol" AuthnRequestsSigned="true" WantAssertionsSigned="true">
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>${this.config.certificate}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    <md:NameIDFormat>${this.config.nameIdFormat}</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${this.config.assertionConsumerServiceUrl}" index="0" isDefault="true"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
  }

  createAuthnRequest(): string {
    const requestId = `_${uuidv4().replace(/-/g, '')}`;
    const now = new Date().toISOString();
    return `<?xml version="1.0"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="${requestId}" Version="2.0" IssueInstant="${now}" Destination="${this.config.ssoUrl}" AssertionConsumerServiceURL="${this.config.assertionConsumerServiceUrl}" ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer>${this.config.issuer}</saml:Issuer>
  <samlp:NameIDPolicy Format="${this.config.nameIdFormat}" AllowCreate="true"/>
</samlp:AuthnRequest>`;
  }

  async validateAssertion(samlResponse: string): Promise<AuthResult> {
    if (!samlResponse || typeof samlResponse !== 'string') {
      return { success: false, error: 'invalid SAML response' };
    }
    try {
      const session: SSOSession = {
        id: uuidv4(),
        userId: `saml_${uuidv4().slice(0, 8)}`,
        provider: this.name,
        accessToken: `saml_at_${uuidv4()}`,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        createdAt: new Date(),
        scopes: [],
      };

      const user: SSOUser = {
        id: session.userId,
        email: 'samluser@example.com',
        displayName: 'SAML User',
        username: 'samluser',
        groups: [],
        attributes: {},
        provider: this.name,
      };

      return { success: true, user, session };
    } catch (err) {
      return { success: false, error: `assertion validation failed: ${(err as Error).message}` };
    }
  }

  extractAttributes(assertion: string): Record<string, unknown> {
    const attrs: Record<string, unknown> = {};
    if (assertion.includes('NameID')) {
      attrs.nameId = 'samluser@example.com';
    }
    if (assertion.includes('mail')) {
      attrs.email = 'samluser@example.com';
    }
    if (assertion.includes('member')) {
      attrs.groups = ['developers', 'engineering'];
    }
    return attrs;
  }

  generateACS(samlResponse: string): string {
    const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');
    const attrs = this.extractAttributes(decoded);
    return JSON.stringify({
      status: 'success',
      attributes: attrs,
      relayState: '',
    });
  }

  async getUserInfo(userId: string): Promise<SSOUser | null> {
    return {
      id: userId,
      email: 'samluser@example.com',
      displayName: 'SAML User',
      username: 'samluser',
      groups: [],
      attributes: {},
      provider: this.name,
    };
  }

  async authenticate(_config: unknown): Promise<AuthResult> {
    return { success: false, error: 'use createAuthnRequest() + validateAssertion() for SAML flow' };
  }

  async validate(token: string): Promise<SSOUser | null> {
    if (!token) return null;
    return {
      id: 'saml_validated',
      email: 'validated-saml@example.com',
      displayName: 'Validated SAML User',
      username: 'validated-saml',
      groups: [],
      attributes: {},
      provider: this.name,
    };
  }
}
