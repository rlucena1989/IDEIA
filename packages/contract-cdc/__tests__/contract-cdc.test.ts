import { ContractCDC } from '../src/contract-cdc';
describe('ContractCDC', () => {
  const endpoint = (m: string, p: string, req: Record<string,unknown>, res: Record<string,unknown>) => ({ method: m, path: p, request: req, response: res });
  const baseContract = () => ({ consumer: 'agent', provider: 'file-bridge', version: '1.0.0', endpoints: [
    endpoint('GET', '/files', { path: 'string' }, { content: 'string' }),
    endpoint('POST', '/files', { path: 'string', data: 'string' }, { ok: 'boolean' }),
  ]});
  it('should register and retrieve contracts', () => {
    const cdc = new ContractCDC(); cdc.register(baseContract());
    expect(cdc.get('agent', 'file-bridge')).toBeDefined();
  });
  it('should detect breaking change', () => {
    const cdc = new ContractCDC(); const v1 = baseContract();
    const v2 = baseContract(); v2.endpoints = v2.endpoints.filter(e => e.method !== 'GET');
    const diff = cdc.diff(v1, v2);
    expect(diff.breaking).toBe(true); expect(diff.classification).toBe('major');
  });
  it('should suggest major version bump for breaking', () => {
    const cdc = new ContractCDC(); const v1 = baseContract();
    const v2 = baseContract(); v2.endpoints = v2.endpoints.filter(e => e.method !== 'GET');
    const diff = cdc.diff(v1, v2);
    const version = cdc.suggestVersion('1.0.0', diff);
    expect(version.suggested).toBe('2.0.0'); expect(version.bump).toBe('major');
  });
  it('should suggest minor for non-breaking additions', () => {
    const cdc = new ContractCDC(); const v1 = baseContract();
    const v2 = baseContract(); v2.endpoints.push({ method: 'DELETE', path: '/files', request: { id: 'string' }, response: { ok: 'boolean' } });
    const diff = cdc.diff(v1, v2);
    const version = cdc.suggestVersion('1.0.0', diff);
    expect(version.suggested).toBe('1.1.0');
  });
  it('should test contract compatibility', () => {
    const cdc = new ContractCDC(); const expected = baseContract(); cdc.register(expected);
    const actual = baseContract(); const result = cdc.testContract('agent', 'file-bridge', actual);
    expect(result.compatible).toBe(true);
  });
  it('should list all contracts', () => {
    const cdc = new ContractCDC(); cdc.register(baseContract());
    expect(cdc.list()).toHaveLength(1);
  });
});
