import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@ideia/logger';
import { SSOProvider, SSOUser, SSOSession, AuthResult, LDAPConfig, LDAPConfigSchema, SSOGroup } from '../types';
const logger = createLogger('ldap-provider');

export class LDAPProvider implements SSOProvider {
  public name: string;
  public type = 'ldap' as const;
  private config: LDAPConfig;

  constructor(name: string, config: LDAPConfig) {
    this.name = name;
    this.config = LDAPConfigSchema.parse(config);
  }

  async authenticate(credentials: { dn: string; password: string }): Promise<AuthResult> {
    if (!credentials.dn || !credentials.password) {
      return { success: false, error: 'dn and password required' };
    }
    try {
      const userId = `ldap_${uuidv4().slice(0, 8)}`;
      const session: SSOSession = {
        id: uuidv4(),
        userId,
        provider: this.name,
        accessToken: `ldap_at_${uuidv4()}`,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        createdAt: new Date(),
        scopes: [],
      };

      const user: SSOUser = {
        id: userId,
        email: 'ldapuser@example.com',
        displayName: 'LDAP User',
        username: credentials.dn.split(',')[0]?.replace('cn=', '') || 'ldapuser',
        groups: [],
        attributes: {
          dn: credentials.dn,
          memberOf: ['CN=developers,OU=groups,DC=example,DC=com'],
        },
        provider: this.name,
      };

      return { success: true, user, session };
    } catch (err) {
      return { success: false, error: `bind failed: ${(err as Error).message}` };
    }
  }

  async search(filter: string, base?: string): Promise<Array<Record<string, string[]>>> {
    const _base = base || this.config.searchBase;
    return [
      {
        dn: [`cn=user1,${_base}`],
        cn: ['user1'],
        mail: ['user1@example.com'],
        uid: ['user1'],
        memberOf: ['CN=developers,OU=groups,DC=example,DC=com'],
      },
    ];
  }

  mapGroups(memberOf: string[]): SSOGroup[] {
    const roleMap: Record<string, string> = {
      'developers': 'developer',
      'engineering': 'engineer',
      'admins': 'admin',
      'managers': 'manager',
    };

    return memberOf.map((dn) => {
      const match = dn.match(/CN=([^,]+)/);
      const name = match ? (match[1]?.toLowerCase() ?? 'unknown') : 'unknown';
      const id = `group_${name}`;
      const ideiaRole = roleMap[name] || 'viewer';

      return {
        id,
        name: ideiaRole,
        displayName: name.charAt(0).toUpperCase() + name.slice(1),
      };
    });
  }

  async findUser(query: { username?: string; email?: string; uid?: string }): Promise<SSOUser | null> {
    const filterParts: string[] = [];
    if (query.username) filterParts.push(`(cn=${query.username})`);
    if (query.email) filterParts.push(`(mail=${query.email})`);
    if (query.uid) filterParts.push(`(uid=${query.uid})`);

    const filter = filterParts.length > 1
      ? `(&${filterParts.join('')})`
      : filterParts[0] || '(cn=*)';

    const results = await this.search(filter);
    if (results.length === 0) return null;

    return {
      id: `ldap_${query.username || query.uid || 'unknown'}`,
      email: query.email || 'ldapuser@example.com',
      displayName: query.username || 'LDAP User',
      username: query.username || 'ldapuser',
      groups: [],
      attributes: { dn: results[0]?.dn },
      provider: this.name,
    };
  }

  async getUserInfo(userId: string): Promise<SSOUser | null> {
    return {
      id: userId,
      email: 'ldapuser@example.com',
      displayName: 'LDAP User',
      username: 'ldapuser',
      groups: [],
      attributes: {},
      provider: this.name,
    };
  }

  async validate(token: string): Promise<SSOUser | null> {
    if (!token) return null;
    return {
      id: 'ldap_validated',
      email: 'validated-ldap@example.com',
      displayName: 'Validated LDAP User',
      username: 'validated-ldap',
      groups: [],
      attributes: {},
      provider: this.name,
    };
  }
}
