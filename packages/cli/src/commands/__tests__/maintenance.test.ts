import { maintenanceCommand } from '../maintenance';

describe('maintenanceCommand', () => {
  const cmd = maintenanceCommand();

  it('should be defined', () => {
    expect(cmd).toBeDefined();
  });

  it('should have name maintenance', () => {
    expect(cmd.name()).toBe('maintenance');
  });

  it('should have description', () => {
    expect(cmd.description().length).toBeGreaterThan(0);
  });

  it('should have run subcommand', () => {
    const sub = cmd.commands.find(c => c.name() === 'run');
    expect(sub).toBeDefined();
  });

  it('should have description', () => {
    expect(cmd.description().length).toBeGreaterThan(0);
  });
});
