import { AGENT_TEMPLATES, getAgentTemplate, renderAgentPrompt } from '../agent-templates';

describe('AGENT_TEMPLATES', () => {
  it('should have all 7 agent templates', () => {
    expect(Object.keys(AGENT_TEMPLATES)).toHaveLength(7);
  });

  it('should include analyst template', () => {
    expect(AGENT_TEMPLATES.analyst).toBeDefined();
    expect(AGENT_TEMPLATES.analyst.role).toBe('Analyst');
  });

  it('should include architect template', () => {
    expect(AGENT_TEMPLATES.architect).toBeDefined();
    expect(AGENT_TEMPLATES.architect.role).toBe('Architect');
  });

  it('should include programmer template', () => {
    expect(AGENT_TEMPLATES.programmer).toBeDefined();
    expect(AGENT_TEMPLATES.programmer.role).toBe('Programmer');
  });

  it('should include reviewer template', () => {
    expect(AGENT_TEMPLATES.reviewer).toBeDefined();
    expect(AGENT_TEMPLATES.reviewer.role).toBe('Reviewer');
  });

  it('should include tester template', () => {
    expect(AGENT_TEMPLATES.tester).toBeDefined();
    expect(AGENT_TEMPLATES.tester.role).toBe('Tester');
  });

  it('should include devops template', () => {
    expect(AGENT_TEMPLATES.devops).toBeDefined();
    expect(AGENT_TEMPLATES.devops.role).toBe('DevOps');
  });

  it('should include supervisor template', () => {
    expect(AGENT_TEMPLATES.supervisor).toBeDefined();
    expect(AGENT_TEMPLATES.supervisor.role).toBe('Supervisor');
  });

  it('each template should have systemPrompt', () => {
    for (const [_key, t] of Object.entries(AGENT_TEMPLATES)) {
      expect(t.systemPrompt.length).toBeGreaterThan(50);
    }
  });

  it('each template should have outputFormat', () => {
    for (const t of Object.values(AGENT_TEMPLATES)) {
      expect(t.outputFormat.length).toBeGreaterThan(10);
    }
  });
});

describe('getAgentTemplate', () => {
  it('should return template for valid role', () => {
    const t = getAgentTemplate('analyst');
    expect(t).toBeDefined();
    expect(t!.role).toBe('Analyst');
  });

  it('should return undefined for invalid role', () => {
    expect(getAgentTemplate('invalid')).toBeUndefined();
  });

  it('should be case insensitive', () => {
    expect(getAgentTemplate('ARCHITECT')).toBeDefined();
    expect(getAgentTemplate('Programmer')).toBeDefined();
  });
});

describe('renderAgentPrompt', () => {
  it('should render system prompt for valid role', () => {
    const prompt = renderAgentPrompt('analyst');
    expect(prompt).toContain('Analyst');
    expect(prompt).toContain('requirements');
  });

  it('should include context when provided', () => {
    const prompt = renderAgentPrompt('programmer', { task: 'Create user CRUD', language: 'TypeScript' });
    expect(prompt).toContain('Create user CRUD');
    expect(prompt).toContain('TypeScript');
  });

  it('should return error message for invalid role', () => {
    const prompt = renderAgentPrompt('nonexistent');
    expect(prompt).toContain('No template found');
  });
});
