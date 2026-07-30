import { DefaultRbacService, DefaultAbacService, DefaultJwtService, DefaultApiKeyService } from './authz';

describe('DefaultRbacService', () => {
  const rbac = new DefaultRbacService();

  it('should manage roles', () => {
    rbac.addRole('user1', 'admin');
    expect(rbac.hasRole('user1', 'admin')).toBe(true);
    rbac.removeRole('user1', 'admin');
    expect(rbac.hasRole('user1', 'admin')).toBe(false);
  });

  it('should return empty roles for unknown user', () => {
    expect(rbac.getRoles('unknown')).toEqual([]);
  });

  it('should check access based on roles', () => {
    rbac.addRole('user2', 'admin');
    expect(rbac.checkAccess('user2', 'any-resource', 'any-action')).toBe(true);
  });
});

describe('DefaultAbacService', () => {
  const abac = new DefaultAbacService();

  it('should evaluate policies', async () => {
    abac.registerPolicy({
      id: 'p1', name: 'allow-admin-read', effect: 'allow',
      subjects: ['admin'], resources: ['document'], actions: ['read'],
    });
    const result = await abac.evaluate(
      { id: 's1', roles: ['admin'], attributes: {} },
      { type: 'document', id: 'doc1', attributes: {} },
      'read', {}
    );
    expect(result).toBe(true);
  });

  it('should deny when no policy matches', async () => {
    const result = await abac.evaluate(
      { id: 's2', roles: ['user'], attributes: {} },
      { type: 'document', id: 'doc2', attributes: {} },
      'delete', {}
    );
    expect(result).toBe(false);
  });
});

describe('DefaultJwtService', () => {
  const jwt = new DefaultJwtService();

  it('should sign and verify tokens', () => {
    const token = jwt.sign({ sub: 'u1', roles: ['admin'] }, 'secret-key', '1h');
    expect(token).toContain('.');
    const decoded = jwt.verify(token, 'secret-key');
    expect(decoded?.sub).toBe('u1');
  });

  it('should decode token payload', () => {
    const token = jwt.sign({ sub: 'u2' }, 'secret', '1h');
    const decoded = jwt.decode(token);
    expect(decoded?.sub).toBe('u2');
  });
});

describe('DefaultApiKeyService', () => {
  const svc = new DefaultApiKeyService();

  it('should create and validate keys', async () => {
    const key = await svc.createKey('user1', 'dev-key', ['read']);
    expect(key.key.startsWith('ideia_')).toBe(true);
    const validation = await svc.validateKey(key.key);
    expect(validation.valid).toBe(true);
  });

  it('should revoke keys by id', async () => {
    const key = await svc.createKey('user1', 'test-key', ['read']);
    await svc.revokeKey(key.id);
    const validation = await svc.validateKey(key.key);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('revoked');
  });
});
