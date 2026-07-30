import { verdictCommand } from '../verdict';

describe('verdictCommand', () => {
  const cmd = verdictCommand();

  it('should be defined', () => {
    expect(cmd).toBeDefined();
  });

  it('should have a name', () => {
    expect(typeof cmd.name()).toBe('string');
    expect(cmd.name().length).toBeGreaterThan(0);
  });

  it('should have description', () => {
    expect(cmd.description().length).toBeGreaterThan(0);
  });
});
