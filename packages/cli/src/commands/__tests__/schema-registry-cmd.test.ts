import { schemaRegistryCommand } from '../schema-registry-cmd';

describe('schemaRegistryCommand', () => {
  const cmd = schemaRegistryCommand();

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
