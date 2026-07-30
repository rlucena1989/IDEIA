import { safetyStatusCommand } from '../safety-status';

describe('safetyStatusCommand', () => {
  const cmd = safetyStatusCommand();

  it('should be defined', () => {
    expect(cmd).toBeDefined();
  });

  it('should have name safety-status', () => {
    expect(cmd.name()).toBe('safety-status');
  });

  it('should have description', () => {
    expect(cmd.description().length).toBeGreaterThan(0);
  });

  it('should have --json option', () => {
    const opt = cmd.options.find(o => o.long === '--json');
    expect(opt).toBeDefined();
  });

  it('should have --ci option', () => {
    const opt = cmd.options.find(o => o.long === '--ci');
    expect(opt).toBeDefined();
  });

  it('should have --output option', () => {
    const opt = cmd.options.find(o => o.long === '--output');
    expect(opt).toBeDefined();
  });
});
