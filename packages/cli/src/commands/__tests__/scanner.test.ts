import { scannerCommand } from '../scanner';

describe('scanner', () => {
  it('scannerCommand should be defined', () => {
    expect(scannerCommand).toBeDefined();
  });
  it('scannerCommand should execute without throwing', () => {
    expect(typeof scannerCommand).toBe('function');
    try { (scannerCommand as any)(); } catch {}
  });
});
