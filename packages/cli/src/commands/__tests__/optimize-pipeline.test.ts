import { optimizePipelineCommand } from '../optimize-pipeline';

describe('optimizePipelineCommand', () => {
  const cmd = optimizePipelineCommand();

  it('should be defined', () => {
    expect(cmd).toBeDefined();
  });

  it('should have name optimize-pipeline', () => {
    expect(cmd.name()).toBe('optimize-pipeline');
  });

  it('should have description', () => {
    expect(cmd.description().length).toBeGreaterThan(0);
  });

  it('should have --input option', () => {
    const opt = cmd.options.find(o => o.long === '--input');
    expect(opt).toBeDefined();
  });

  it('should have --output option', () => {
    const opt = cmd.options.find(o => o.long === '--output');
    expect(opt).toBeDefined();
  });

  it('should have --budget option', () => {
    const opt = cmd.options.find(o => o.long === '--budget');
    expect(opt).toBeDefined();
  });

  it('should have --json option', () => {
    const opt = cmd.options.find(o => o.long === '--json');
    expect(opt).toBeDefined();
  });
});
