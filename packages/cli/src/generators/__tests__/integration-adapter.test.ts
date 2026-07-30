jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn().mockReturnValue({ created: [], skipped: [], overwritten: [], errors: [] }) };
});

import { generateFiles } from '../engine';
import { integrationAdapter } from '../integration-adapter';

describe('integration-adapter generator', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates 3 files', () => {
    integrationAdapter('github', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(3);
    expect(files[0].path).toContain('{{Name}}Adapter.ts');
    expect(files[1].path).toContain('{{Name}}Adapter.test.ts');
    expect(files[2].path).toContain('index.ts');
  });

  it('passes vars correctly for kebab source name', () => {
    integrationAdapter('stripe-payment', { dryRun: true, force: false });
    const [, vars] = (generateFiles as jest.Mock).mock.calls[0];
    expect(vars.Name).toBe('StripePayment');
    expect(vars.name_kebab).toBe('stripe-payment');
  });
});
