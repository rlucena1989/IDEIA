import { forecastCommand } from '../forecast';

describe('forecastCommand', () => {
  const cmd = forecastCommand();

  it('should be defined', () => {
    expect(cmd).toBeDefined();
  });

  it('should have name forecast', () => {
    expect(cmd.name()).toBe('forecast');
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
