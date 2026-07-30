import { Command } from 'commander';

jest.mock('../../utils/output');
jest.mock('../../utils/version');
jest.mock('../../hardening/output-contract');
jest.mock('../../ecosystem/ecosystem-types');
jest.mock('../../ecosystem/trust-boundary');

let registryMock: { get: jest.Mock; upsert: jest.Mock; list: jest.Mock };
jest.mock('../../ecosystem/domain-registry', () => {
  registryMock = { get: jest.fn(), upsert: jest.fn(), list: jest.fn() };
  return { DomainRegistry: jest.fn(() => registryMock) };
});

import { trustCommand } from '../trust';
import { canCrossTrustBoundary } from '../../ecosystem/trust-boundary';
import { createDomain } from '../../ecosystem/ecosystem-types';
import { createEnvelope } from '../../hardening/output-contract';
import { getCliVersion } from '../../utils/version';

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);
  (getCliVersion as jest.Mock).mockReturnValue('1.0.0');
  (createEnvelope as jest.Mock).mockImplementation((data: unknown) => data);
  (createDomain as jest.Mock).mockImplementation((opts: unknown) => opts);
  (canCrossTrustBoundary as jest.Mock).mockReturnValue(true);
  registryMock.get.mockImplementation((id: string) => {
    if (id === 'internal') return { name: 'internal', type: 'organization', trustLevel: 'critical' };
    if (id === 'external') return { name: 'external', type: 'partner', trustLevel: 'low' };
    return null;
  });
});

describe('trustCommand', () => {
  it('returns a Commander Command with name trust', () => {
    const cmd = trustCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('trust');
  });

  it('has description', () => {
    const cmd = trustCommand();
    expect(cmd.description()).toBeTruthy();
  });

  it('has sub-commands check, boundary', () => {
    const cmd = trustCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toEqual(expect.arrayContaining(['check', 'boundary']));
  });
});
