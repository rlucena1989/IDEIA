jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn().mockReturnValue({ created: [], skipped: [], overwritten: [], errors: [] }) };
});

import { generateFiles } from '../engine';
import { dataScenario } from '../data-scenario';

describe('data-scenario generator', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates 1 yaml file', () => {
    dataScenario('users', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(1);
    expect(files[0].path).toContain('.yaml');
    expect(files[0].path).toContain('{{name_kebab}}');
  });

  it('passes vars correctly', () => {
    dataScenario('orders', { dryRun: true, force: false });
    const [, vars] = (generateFiles as jest.Mock).mock.calls[0];
    expect(vars.name).toBe('orders');
    expect(vars.Name).toBe('Orders');
  });
});
