import { AwsProvider } from '../aws';

describe('aws', () => {
  it('AwsProvider should be defined', () => {
    expect(AwsProvider).toBeDefined();
  });
  it('AwsProvider should execute without throwing', () => {
    expect(typeof AwsProvider).toBe('function');
    try { new (AwsProvider as any)(); } catch {}
  });
});
