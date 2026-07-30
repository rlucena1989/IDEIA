import { optimizeRunCommand } from '../optimize-run';

describe('optimizeRunCommand', () => {
  const cmd = optimizeRunCommand();

  it('should be defined', () => {
    expect(cmd).toBeDefined();
  });

  it('should have name optimize-run', () => {
    expect(cmd.name()).toBe('optimize-run');
  });

  it('should have description', () => {
    expect(cmd.description().length).toBeGreaterThan(0);
  });

  it('should have --budget option', () => {
    const opt = cmd.options.find(o => o.long === '--budget');
    expect(opt).toBeDefined();
  });

  it('should have --strategy option', () => {
    const opt = cmd.options.find(o => o.long === '--strategy');
    expect(opt).toBeDefined();
  });

  it('should have --json option', () => {
    const opt = cmd.options.find(o => o.long === '--json');
    expect(opt).toBeDefined();
  });

  it('should have --verbose option', () => {
    const opt = cmd.options.find(o => o.long === '--verbose');
    expect(opt).toBeDefined();
  });
});
