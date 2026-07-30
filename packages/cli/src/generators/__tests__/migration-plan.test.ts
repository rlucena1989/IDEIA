jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn().mockReturnValue({ created: [], skipped: [], overwritten: [], errors: [] }) };
});

import { generateFiles } from '../engine';
import { migrationPlan } from '../migration-plan';

describe('migration-plan generator', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates 3 files', () => {
    migrationPlan('add-users-table', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(3);
    expect(files[0].path).toContain('.up.sql');
    expect(files[1].path).toContain('.down.sql');
    expect(files[2].path).toContain('migration-plan.yaml');
  });

  it('passes vars correctly', () => {
    migrationPlan('create-orders', { dryRun: true, force: false });
    const [, vars] = (generateFiles as jest.Mock).mock.calls[0];
    expect(vars.name_kebab).toBe('create-orders');
    expect(vars.Name).toBe('CreateOrders');
  });
});
