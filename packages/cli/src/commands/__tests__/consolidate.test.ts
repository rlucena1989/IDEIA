import { consolidateCommand } from '../consolidate';

describe('consolidateCommand', () => {
  const cmd = consolidateCommand();

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
