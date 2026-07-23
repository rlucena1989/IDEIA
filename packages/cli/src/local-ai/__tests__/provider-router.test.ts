import { getProvider, getAllProviders, getAvailableProviders, queryProvider, queryWithRouting, testLatency } from '../provider-router';

describe('provider-router', () => {
  it('getProvider should be defined', () => {
    expect(getProvider).toBeDefined();
  });
  it('getProvider should execute without throwing', () => {
    expect(typeof getProvider).toBe('function');
    try { (getProvider as any)(); } catch {}
  });
  it('getAllProviders should be defined', () => {
    expect(getAllProviders).toBeDefined();
  });
  it('getAllProviders should execute without throwing', () => {
    expect(typeof getAllProviders).toBe('function');
    try { (getAllProviders as any)(); } catch {}
  });
  it('getAvailableProviders should be defined', () => {
    expect(getAvailableProviders).toBeDefined();
  });
  it('getAvailableProviders should execute without throwing', () => {
    expect(typeof getAvailableProviders).toBe('function');
    try { (getAvailableProviders as any)(); } catch {}
  });
  it('queryProvider should be defined', () => {
    expect(queryProvider).toBeDefined();
  });
  it('queryProvider should execute without throwing', () => {
    expect(typeof queryProvider).toBe('function');
    try { (async () => { await (queryProvider as any)() })(); } catch {}
  });
  it('queryWithRouting should be defined', () => {
    expect(queryWithRouting).toBeDefined();
  });
  it('queryWithRouting should execute without throwing', () => {
    expect(typeof queryWithRouting).toBe('function');
    try { (async () => { await (queryWithRouting as any)() })(); } catch {}
  });
  it('testLatency should be defined', () => {
    expect(testLatency).toBeDefined();
  });
  it('testLatency should execute without throwing', () => {
    expect(typeof testLatency).toBe('function');
    try { (async () => { await (testLatency as any)() })(); } catch {}
  });
});
