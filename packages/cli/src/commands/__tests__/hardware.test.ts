import { hardwareCommand } from '../hardware';

describe('hardwareCommand', () => {
  const cmd = hardwareCommand();

  it('should be defined', () => {
    expect(cmd).toBeDefined();
  });

  it('should have name hardware', () => {
    expect(cmd.name()).toBe('hardware');
  });

  it('should have description', () => {
    expect(cmd.description().length).toBeGreaterThan(0);
  });

  it('should have detect subcommand', () => {
    const sub = cmd.commands.find(c => c.name() === 'detect');
    expect(sub).toBeDefined();
  });

  it('should have --json option', () => {
    const opt = cmd.options.find(o => o.long === '--json');
    expect(opt).toBeDefined();
  });
});
