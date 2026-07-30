import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockGetEnvConfig = jest.fn();
const mockCreateAuthProvider = jest.fn();
const mockStartOIDCServer = jest.fn<any>();
const mockPrintLine = jest.fn();
const mockPrintResult = jest.fn();
const mockFinish = jest.fn();
const mockCreateLogger = jest.fn();
const mockExecSync = jest.fn();
const mockLog = { warn: jest.fn(), error: jest.fn() };

class MockAuth0Provider {}
const mockAuth0Proto = MockAuth0Provider.prototype;

jest.mock('@ideia/config-engine', () => ({ getEnvConfig: (...args: unknown[]) => mockGetEnvConfig(...args) }));
jest.mock('../../auth/auth-provider', () => ({ createAuthProvider: (...args: unknown[]) => mockCreateAuthProvider(...args), Auth0AuthProvider: MockAuth0Provider, AuthConfig: {} }));
jest.mock('../../auth/oidc-server', () => ({ startOIDCServer: (...args: unknown[]) => mockStartOIDCServer(...args) }));
jest.mock('../../utils/output', () => ({ printLine: (...args: unknown[]) => mockPrintLine(...args), printResult: (...args: unknown[]) => mockPrintResult(...args), finish: (...args: unknown[]) => mockFinish(...args) }));
jest.mock('@ideia/logger', () => ({ createLogger: (...args: unknown[]) => mockCreateLogger(...args) }));
jest.mock('node:child_process', () => ({ execSync: (...args: unknown[]) => mockExecSync(...args) }));

const mockAuthProvider = Object.create(mockAuth0Proto) as { getAuthorizationUrl: jest.Mock<any>; login: jest.Mock<any>; getUser: jest.Mock<any> };
mockAuthProvider.getAuthorizationUrl = jest.fn();
mockAuthProvider.login = jest.fn();
mockAuthProvider.getUser = jest.fn();

function getCmd() {
  const { loginCommand } = require('../login');
  return loginCommand();
}

describe('loginCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateLogger.mockReturnValue(mockLog);
    mockGetEnvConfig.mockReturnValue({ authProvider: 'auth0', auth0ClientId: 'test-client-id', jwtSecret: 'test-secret', auth0Domain: 'https://test.auth0.com' });
    mockCreateAuthProvider.mockReturnValue(mockAuthProvider);
    mockAuthProvider.getAuthorizationUrl.mockReturnValue('https://auth0.com/authorize');
    mockAuthProvider.login.mockResolvedValue({ id: 'session-abc', expiresAt: Date.now() + 3600000 });
    mockAuthProvider.getUser.mockResolvedValue({ id: 'user-1', name: 'Test User', email: 'test@example.com', roles: ['admin'] });
    mockStartOIDCServer.mockResolvedValue({ code: 'auth-code', error: null, errorDescription: null });
  });

  it('returns command named login', () => { expect(getCmd().name()).toBe('login'); });

  it('description mentions authentication', () => { expect(getCmd().description()).toContain('Authenticate'); });

  it('performs Auth0 login flow with browser', async () => {
    const cmd = getCmd();
    cmd.setOptionValue('port', '3000');
    await cmd._actionHandler([]);
    expect(mockCreateAuthProvider).toHaveBeenCalledWith(expect.objectContaining({ provider: 'auth0', clientId: 'test-client-id' }));
    expect(mockAuthProvider.getAuthorizationUrl).toHaveBeenCalled();
    expect(mockStartOIDCServer).toHaveBeenCalledWith(3000);
    expect(mockAuthProvider.login).toHaveBeenCalledWith({ code: 'auth-code' });
    expect(mockAuthProvider.getUser).toHaveBeenCalledWith('session-abc');
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('test@example.com'));
    expect(mockFinish).toHaveBeenCalledWith(expect.objectContaining({ checkpoint: 'login', ok: true }));
  });

  it('does not open browser when --no-browser flag set', async () => {
    const cmd = getCmd();
    cmd.setOptionValue('browser', false);
    cmd.setOptionValue('port', '3000');
    await cmd._actionHandler([]);
    expect(mockExecSync).not.toHaveBeenCalled();
  });

  it('outputs JSON with --json flag', async () => {
    const cmd = getCmd();
    cmd.setOptionValue('json', true);
    cmd.setOptionValue('port', '3000');
    await cmd._actionHandler([]);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('session'));
  });

  it('handles OIDC callback error', async () => {
    mockStartOIDCServer.mockResolvedValue({ code: null, error: 'access_denied', errorDescription: 'User denied' });
    const cmd = getCmd();
    cmd.setOptionValue('port', '3000');
    await cmd._actionHandler([]);
    expect(mockLog.error).toHaveBeenCalled();
    expect(mockPrintResult).toHaveBeenCalledWith('Error', false, expect.stringContaining('access_denied'));
  });

  it('handles generic auth provider (non-Auth0)', async () => {
    const plainProvider = {
      login: jest.fn<any>().mockResolvedValue({ id: 'sess-1', expiresAt: Date.now() + 3600000 }),
      getUser: jest.fn<any>().mockResolvedValue({ id: 'u1', name: 'Generic', email: 'g@test.com', roles: ['user'] }),
    };
    mockCreateAuthProvider.mockReturnValue(plainProvider);
    const cmd = getCmd();
    cmd.setOptionValue('provider', 'oauth2');
    cmd.setOptionValue('port', '3000');
    await cmd._actionHandler([]);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('g@test.com'));
  });

  it('handles login failure gracefully', async () => {
    mockAuthProvider.login.mockRejectedValue(new Error('Invalid credentials'));
    const cmd = getCmd();
    cmd.setOptionValue('port', '3000');
    await cmd._actionHandler([]);
    expect(mockLog.error).toHaveBeenCalled();
    expect(mockFinish).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });

  it('gets provider from config when not specified', async () => {
    mockCreateAuthProvider.mockReturnValue(mockAuthProvider);
    const cmd = getCmd();
    cmd.setOptionValue('port', '3000');
    await cmd._actionHandler([]);
    expect(mockCreateAuthProvider).toHaveBeenCalledWith(expect.objectContaining({ provider: 'auth0' }));
  });

  it('logs a warning when browser cannot be opened', async () => {
    mockExecSync.mockImplementation(() => { throw new Error('no browser'); });
    const cmd = getCmd();
    cmd.setOptionValue('port', '3000');
    await cmd._actionHandler([]);
    expect(mockLog.warn).toHaveBeenCalledWith('Could not open browser automatically');
  });
});
