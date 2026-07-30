import { validateGenerationCommand } from '../validate-generation';

describe('validateGenerationCommand', () => {
  const cmd = validateGenerationCommand();

  it('should be defined', () => {
    expect(cmd).toBeDefined();
  });

  it('should have name validate-generation', () => {
    expect(cmd.name()).toBe('validate-generation');
  });

  it('should have description', () => {
    expect(cmd.description().length).toBeGreaterThan(0);
  });

  it('should have --input option', () => {
    const opt = cmd.options.find(o => o.long === '--input');
    expect(opt).toBeDefined();
  });

  it('should have --rules option', () => {
    const opt = cmd.options.find(o => o.long === '--rules');
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
