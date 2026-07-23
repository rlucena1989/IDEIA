import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import os from 'os';
import { YamlAgentConfig, loadYamlAgent, buildAgentFromYaml, loadAndBuildAgent } from '../src/yaml-agents';

describe('YAML Agents', () => {
  let tmpDir: string;
  let yamlPath: string;

  beforeEach(() => {
    tmpDir = join(os.tmpdir(), `yaml-agent-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    yamlPath = join(tmpDir, 'agent.yaml');

    const yamlContent = `name: "Code Review Agent"
description: "Automated code review pipeline"
version: "1.0.0"
entryPoint: analyst
maxIterations: 5
nodeTimeout: 15000
maxRetries: 2

nodes:
  - role: analyst
    label: "Analyst"
    prompt: "Analyze the codebase and identify areas needing review"
    tools: [search, read]

  - role: reviewer
    label: "Reviewer"
    prompt: "Review code for bugs, security issues, and style"
    tools: [read, analyze]

  - role: supervisor
    label: "Supervisor"
    prompt: "Compile review results and generate report"
    tools: [report]

edges:
  - from: analyst
    to: reviewer
  - from: reviewer
    to: supervisor
`;
    writeFileSync(yamlPath, yamlContent, 'utf-8');
  });

  afterEach(() => {
    try { unlinkSync(yamlPath); } catch {}
    try { unlinkSync(join(tmpDir, 'non-existent.yaml')); } catch {}
  });

  describe('loadYamlAgent', () => {
    it('should load and parse YAML agent config', () => {
      const config = loadYamlAgent(yamlPath);
      expect(config.name).toBe('Code Review Agent');
      expect(config.description).toContain('code review');
      expect(config.version).toBe('1.0.0');
      expect(config.workflow.entryPoint).toBe('analyst');
      expect(config.workflow.nodes).toHaveLength(3);
      expect(config.workflow.edges).toHaveLength(2);
    });

    it('should throw for non-existent file', () => {
      expect(() => loadYamlAgent(join(tmpDir, 'non-existent.yaml'))).toThrow();
    });
  });

  describe('buildAgentFromYaml', () => {
    it('should build a LangGraph agent from YAML config', async () => {
      const config = loadYamlAgent(yamlPath);
      const agent = buildAgentFromYaml(config);
      expect(agent).toBeDefined();

      const result = await agent.invoke('Review the auth module');
      expect(result.finalState.input).toBe('Review the auth module');
      expect(result.summary.totalNodes).toBeGreaterThan(0);
    });

    it('should execute all nodes in the pipeline', async () => {
      const config = loadYamlAgent(yamlPath);
      const agent = buildAgentFromYaml(config);
      const result = await agent.invoke('Full pipeline test');
      expect(result.finalState.outputs.analyst).toBeDefined();
      expect(result.finalState.outputs.reviewer).toBeDefined();
      expect(result.finalState.outputs.supervisor).toBeDefined();
    });

    it('should handle conditional edges', async () => {
      const conditionalYaml = `name: "Conditional Agent"
description: "Test conditional routing"
version: "1.0.0"
entryPoint: analyst

nodes:
  - role: analyst
    label: "Analyst"
    prompt: "Analyze"
  - role: programmer
    label: "Programmer"
    prompt: "Fix errors"
  - role: reviewer
    label: "Reviewer"
    prompt: "Verify"

edges:
  - from: analyst
    to:
      condition: "error_check"
      routes:
        error: programmer
        next: reviewer
`;
      const conditionalPath = join(tmpDir, 'conditional.yaml');
      writeFileSync(conditionalPath, conditionalYaml, 'utf-8');

      const config = loadYamlAgent(conditionalPath);
      const agent = buildAgentFromYaml(config);
      const result = await agent.invoke('Test');
      expect(result.finalState).toBeDefined();
      try { unlinkSync(conditionalPath); } catch {}
    });
  });

  describe('loadAndBuildAgent', () => {
    it('should load and build in one call', async () => {
      const agent = loadAndBuildAgent(yamlPath);
      const result = await agent.invoke('Quick test');
      expect(result.finalState.input).toBe('Quick test');
    });
  });
});
