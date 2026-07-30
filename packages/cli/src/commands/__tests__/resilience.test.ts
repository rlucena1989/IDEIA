import { Command } from 'commander';
import { resilienceCommand } from '../resilience';

jest.mock('../../resilience/circuit-breaker', () => ({
  createCircuitBreaker: jest.fn().mockReturnValue({
    name: 'default',
    open: false,
    failureCount: 0,
    threshold: 3,
  }),
  updateCircuitBreaker: jest.fn().mockReturnValue({
    name: 'default',
    open: true,
    failureCount: 1,
    threshold: 3,
  }),
  resetCircuitBreaker: jest.fn().mockReturnValue({
    name: 'default',
    open: false,
    failureCount: 0,
    threshold: 3,
  }),
}));

jest.mock('../../hardening/output-contract', () => ({
  createEnvelope: jest.fn().mockReturnValue({ ok: true }),
}));

jest.mock('../../utils/output', () => ({
  printHeader: jest.fn(),
  printLine: jest.fn(),
  printResult: jest.fn(),
}));

jest.mock('../../utils/version', () => ({
  getCliVersion: jest.fn().mockReturnValue('1.0.0'),
}));

describe('resilienceCommand', () => {
  it('returns a Commander Command with name resilience', () => {
    const cmd = resilienceCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('resilience');
  });

  it('has description', () => {
    const cmd = resilienceCommand();
    expect(cmd.description()).toBeTruthy();
  });

  it('has sub-command status', () => {
    const cmd = resilienceCommand();
    const sub = cmd.commands.find(c => c.name() === 'status');
    expect(sub).toBeDefined();
    expect(sub!.description()).toBeTruthy();
  });

  it('has sub-command circuit', () => {
    const cmd = resilienceCommand();
    const sub = cmd.commands.find(c => c.name() === 'circuit');
    expect(sub).toBeDefined();
    expect(sub!.description()).toBeTruthy();
  });

  it('has sub-command policy', () => {
    const cmd = resilienceCommand();
    const sub = cmd.commands.find(c => c.name() === 'policy');
    expect(sub).toBeDefined();
    expect(sub!.description()).toBeTruthy();
  });
});
