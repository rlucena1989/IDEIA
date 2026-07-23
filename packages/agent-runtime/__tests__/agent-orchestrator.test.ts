import { AgentOrchestrator, createAgentOrchestrator } from '../src/agent-orchestrator';
import { AgentRuntime } from '../src/agent-runtime';
import { AuditTrail } from '@ideia/audit-trail';
import { MemoryStore } from '@ideia/memory-store';
import path from 'path';
import os from 'os';

describe('AgentOrchestrator', () => {
  let orch: AgentOrchestrator;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `orch-test-${Date.now()}`);
    require('fs').mkdirSync(tmpDir, { recursive: true });
    const audit = new AuditTrail(path.join(tmpDir, 'audit.json'));
    const memory = new MemoryStore(path.join(tmpDir, 'memory.json'));
    const runtime = new AgentRuntime(audit, memory);
    orch = createAgentOrchestrator(runtime, tmpDir);
  });

  it('should create with all 7 agents', () => {
    const agents = orch.listAgents();
    expect(agents).toHaveLength(7);
    expect(agents.map(a => a.role)).toContain('analyst');
    expect(agents.map(a => a.role)).toContain('supervisor');
  });

  it('should have MCP with filesystem tools', () => {
    const tools = orch.getMCP().getTools();
    expect(tools.length).toBeGreaterThanOrEqual(5);
    expect(tools.map((t: { name: string }) => t.name)).toContain('read_file');
    expect(tools.map((t: { name: string }) => t.name)).toContain('write_file');
  });

  it('should run pipeline', async () => {
    const result = await orch.runPipeline('create a simple api');
    expect(result.state).toBeDefined();
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('should execute MCP tool', async () => {
    const result = await orch.executeTool('list_files', { path: '.' });
    expect(result).toBeDefined();
  });

  it('should discover agent capabilities', async () => {
    const card = await orch.discoverAgent('analyst');
    expect(card).not.toBeNull();
    expect(card!.capabilities).toContain('analysis');
  });

  it('should return null for unknown agent', async () => {
    const card = await orch.discoverAgent('unknown');
    expect(card).toBeNull();
  });

  it('should communicate via A2A', async () => {
    const result = await orch.getA2A().sendMessage({
      id: 'test-msg', from: 'orchestrator', to: 'agent-analyst',
      type: 'request', skill: 'analyst.status', payload: {},
      timestamp: new Date().toISOString(),
    });
    expect(result.type).toBe('response');
    expect(result.payload).toBeDefined();
  });
});
