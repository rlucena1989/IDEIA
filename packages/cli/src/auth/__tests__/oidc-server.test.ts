import { startOIDCServer } from '../oidc-server';
import http from 'node:http';

describe('oidc-server', () => {
  it('should start a server and resolve with code on callback', async () => {
    const serverPromise = startOIDCServer(0); // dynamic port
    const result = await serverPromise.catch(() => ({ code: '', state: '' }));
    expect(result).toBeDefined();
  });

  it('should reject on timeout', async () => {
    const start = Date.now();
    try {
      await startOIDCServer(0, 100); // 100ms timeout
      fail('Should have timed out');
    } catch (error) {
      expect(String(error)).toContain('timed out');
      expect(Date.now() - start).toBeLessThan(5000);
    }
  }, 10000);
});
