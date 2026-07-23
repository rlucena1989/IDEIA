import { describe, it, expect } from '@jest/globals';
import { SelfAwareness } from '../self-awareness';
import { ServiceCatalog } from '../service-catalog';

describe('self-awareness', () => {
  const awareness = new SelfAwareness();

  it('should describe the system', () => {
    const desc = awareness.describeSystem();
    expect(desc.name).toBe('IDEIA');
    expect(desc.totalPackages).toBeGreaterThan(0);
    expect(desc.totalCapabilities).toBeGreaterThan(0);
    expect(desc.architecture.layers.length).toBeGreaterThan(0);
    expect(desc.principles.length).toBeGreaterThan(0);
  });

  it('should return capabilities', () => {
    const caps = awareness.getCapabilities();
    expect(caps.length).toBeGreaterThan(0);
    caps.forEach(c => {
      expect(c.name).toBeDefined();
      expect(c.service).toBeDefined();
      expect(c.category).toBeDefined();
    });
  });

  it('should filter capabilities by category', () => {
    const caps = awareness.getCapabilities('security');
    caps.forEach(c => expect(c.category).toBe('security'));
  });

  it('should return architecture', () => {
    const arch = awareness.getArchitecture();
    expect(arch.layers.length).toBeGreaterThan(0);
    expect(arch.description).toBeDefined();
  });

  it('should return technology stack', () => {
    const stack = awareness.getStack();
    expect(stack.languages.includes('TypeScript')).toBe(true);
    expect(stack.frameworks.length).toBeGreaterThan(0);
    expect(stack.ai.length).toBeGreaterThan(0);
  });

  it('should return workflows', () => {
    const workflows = awareness.getWorkflows();
    expect(workflows.length).toBeGreaterThan(0);
    workflows.forEach(w => {
      expect(w.name).toBeDefined();
      expect(w.steps.length).toBeGreaterThan(0);
    });
  });

  it('should filter workflows by name', () => {
    const workflows = awareness.getWorkflows('Bug');
    expect(workflows.length).toBeGreaterThan(0);
    workflows.forEach(w => expect(w.name.toLowerCase()).toContain('bug'));
  });

  it('should return unknown capabilities if no workflow matches', () => {
    const workflows = awareness.getWorkflows('Nonexistent123');
    expect(workflows.length).toBe(0);
  });

  it('should format as markdown', () => {
    const md = awareness.formatAsMarkdown();
    expect(md).toContain('IDEIA');
    expect(md).toContain('## Architecture');
    expect(md).toContain('## Technology Stack');
    expect(md).toContain('## Available Workflows');
    expect(md).toContain('## Available Capabilities');
    expect(md).toContain('## All Packages');
  });

  it('should discover available capabilities', () => {
    const discovered = awareness.discoverAvailableCapabilities();
    expect(discovered.length).toBeGreaterThan(0);
    const available = discovered.filter(d => d.available);
    expect(available.length).toBeGreaterThan(0);
  });

  it('should work with custom catalog', () => {
    const catalog = new ServiceCatalog();
    const customAwareness = new SelfAwareness(catalog);
    expect(customAwareness.describeSystem().totalPackages).toBe(catalog.getServiceCount());
  });
});
