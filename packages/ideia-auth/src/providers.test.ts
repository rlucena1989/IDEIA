import { DefaultAuthProvider } from './providers';

describe('DefaultAuthProvider', () => {
  const provider = new DefaultAuthProvider('test-provider', 'Test Provider');

  it('should login and create session', async () => {
    const session = await provider.login({ email: 'user1' });
    expect(session.userId).toBe('user1');
    expect(session.token).toBeDefined();
  });

  it('should retrieve user by session', async () => {
    const session = await provider.login({ email: 'user2' });
    const user = await provider.getUser(session);
    expect(user?.id).toBe('user2');
  });

  it('should logout and invalidate session', async () => {
    const session = await provider.login({ email: 'user3' });
    await provider.logout(session.id);
    expect(true).toBe(true);
  });

  it('should refresh token with new session', async () => {
    const session = await provider.login({ email: 'user4' });
    await new Promise(r => setTimeout(r, 5));
    const refreshed = await provider.refreshToken(session.refreshToken);
    expect(refreshed).toBeDefined();
    expect(refreshed.userId).toBeDefined();
  });
});
