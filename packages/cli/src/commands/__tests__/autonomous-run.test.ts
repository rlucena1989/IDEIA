import { autonomousRunCommand } from '../autonomous-run';

describe('autonomousRunCommand', () => {
  const cmd = autonomousRunCommand();

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
