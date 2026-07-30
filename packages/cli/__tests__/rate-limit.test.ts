import { RateLimiter } from '../src/middleware/rate-limit';

describe('RateLimiter', () => {
  it('allows first request', () => {
    const rl = new RateLimiter();
    const result = rl.check('test-key');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(59);
  });

  it('blocks after exceeding limit', () => {
    const rl = new RateLimiter({ default: { windowMs: 60000, maxRequests: 3, blockDurationMs: 60000, trackBy: 'ip' } });
    rl.check('k1'); rl.check('k1'); rl.check('k1');
    const r4 = rl.check('k1');
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
  });

  it('resets window after expiry', () => {
    const rl = new RateLimiter({ default: { windowMs: 10, maxRequests: 2, blockDurationMs: 60000, trackBy: 'ip' } });
    rl.check('k'); rl.check('k');
    expect(rl.check('k').allowed).toBe(false);
  });

  it('checkByUserModel evaluates both user and model', () => {
    const rl = new RateLimiter();
    const r = rl.checkByUserModel('user-1', 'gpt-4');
    expect(r.allowed).toBe(true);
    expect(r.user.allowed).toBe(true);
    expect(r.model.allowed).toBe(true);
  });

  it('checkByUserModel blocks when one limit exceeded', () => {
    const rl = new RateLimiter({ llm: { windowMs: 60000, maxRequests: 2, blockDurationMs: 60000, trackBy: 'user' } });
    rl.checkByUserModel('u1', 'gpt-4');
    rl.checkByUserModel('u1', 'gpt-4');
    const r3 = rl.checkByUserModel('u1', 'gpt-4');
    expect(r3.allowed).toBe(false);
  });

  it('calls onBlocked callback', () => {
    let blocked = false;
    const rl = new RateLimiter(
      { default: { windowMs: 60000, maxRequests: 1, blockDurationMs: 60000, trackBy: 'ip' } },
      { onBlocked: () => { blocked = true; } },
    );
    rl.check('k'); rl.check('k');
    expect(blocked).toBe(true);
  });

  it('calls onPass callback', () => {
    let passed = false;
    const rl = new RateLimiter(undefined, { onPass: () => { passed = true; } });
    rl.check('k');
    expect(passed).toBe(true);
  });

  it('setConfig updates configuration', () => {
    const rl = new RateLimiter();
    rl.setConfig('llm', { windowMs: 1000, maxRequests: 50, blockDurationMs: 5000, trackBy: 'user' });
    const cfg = rl.getConfig('llm');
    expect(cfg!.maxRequests).toBe(50);
  });

  it('getStats returns key counts', () => {
    const rl = new RateLimiter();
    rl.check('a'); rl.check('b');
    const stats = rl.getStats();
    expect(stats.totalKeys).toBe(2);
  });

  it('clear removes all entries', () => {
    const rl = new RateLimiter();
    rl.check('a'); rl.check('b');
    rl.clear();
    expect(rl.getStats().totalKeys).toBe(0);
  });

  it('resetKey removes specific key', () => {
    const rl = new RateLimiter();
    rl.check('a'); rl.check('b');
    rl.resetKey('a');
    expect(rl.getStats().totalKeys).toBe(1);
  });
});
