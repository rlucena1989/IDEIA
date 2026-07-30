import { autonomyCommand } from '../autonomy';

describe('autonomyCommand', () => {
  const cmd = autonomyCommand();

  it('should be defined', () => {
    expect(cmd).toBeDefined();
  });

  it('should have name autonomy', () => {
    expect(cmd.name()).toBe('autonomy');
  });

  it('should have description', () => {
    expect(cmd.description().length).toBeGreaterThan(0);
  });

  it('should have description', () => {
    expect(cmd.description().length).toBeGreaterThan(0);
  });

  it('should have --json option', () => {
    const found = cmd.options.some((o: any) => o.long === '--json') ||
      cmd.commands.some((c: any) => c.options.some((o: any) => o.long === '--json'));
    expect(found).toBe(true);
  });
});
