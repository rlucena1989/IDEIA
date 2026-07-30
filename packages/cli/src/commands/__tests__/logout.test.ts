import { logoutCommand } from '../logout';

describe('logoutCommand', () => {
  const cmd = logoutCommand();

  it('should be defined', () => {
    expect(cmd).toBeDefined();
  });

  it('should have name logout', () => {
    expect(cmd.name()).toBe('logout');
  });

  it('should have description', () => {
    expect(cmd.description().length).toBeGreaterThan(0);
  });

  it('should have --all option', () => {
    const opt = cmd.options.find((o: any) => o.long === '--all');
    expect(opt).toBeDefined();
  });

  it('should have --json option', () => {
    const found = cmd.options.some((o: any) => o.long === '--json') ||
      cmd.commands.some((c: any) => c.options.some((o: any) => o.long === '--json'));
    expect(found).toBe(true);
  });
});
