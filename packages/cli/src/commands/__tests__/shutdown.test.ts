import { shutdownCommand } from '../shutdown';

describe('shutdownCommand', () => {
  const cmd = shutdownCommand();

  it('should be defined', () => {
    expect(cmd).toBeDefined();
  });

  it('should have name shutdown', () => {
    expect(cmd.name()).toBe('shutdown');
  });

  it('should have description', () => {
    expect(cmd.description().length).toBeGreaterThan(0);
  });

  it('should have description', () => {
    expect(cmd.description().length).toBeGreaterThan(0);
  });
});
