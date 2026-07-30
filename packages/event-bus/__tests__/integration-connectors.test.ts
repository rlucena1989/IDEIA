import { IntegrationConnectors, registerDefaultConnectors, createMemoryWsConnector, createSessionObservabilityConnector, createLspMemoryConnector, createDapPersistenceConnector, createChatPatternConnector, createAutoFixAdrConnector, createScannerPanelConnector } from '../src/integration-connectors';
import { EventBus } from '../src/event-bus';

describe('IntegrationConnectors', () => {
  let bus: EventBus;
  let manager: IntegrationConnectors;

  beforeEach(() => {
    bus = new EventBus();
    manager = new IntegrationConnectors();
    manager.setEventBus(bus);
  });

  it('registers and starts a connector', () => {
    const connector = createMemoryWsConnector();
    manager.registerConnector(connector);
    expect(manager.getConnectors()).toHaveLength(1);
  });

  it('transforms memory:update to websocket payload', () => {
    const connector = createMemoryWsConnector();
    const transformed = connector.transform({ id: 'mem-1', action: 'update', data: { key: 'val' } });
    const result = transformed as Record<string, unknown>;
    expect(result.type).toBe('memory_update');
    expect(result.memoryId).toBe('mem-1');
  });

  it('transforms session:created to observability payload', () => {
    const connector = createSessionObservabilityConnector();
    const transformed = connector.transform({ id: 'sess-1', type: 'chat', metadata: { user: 'test' } });
    const result = transformed as Record<string, unknown>;
    expect(result.type).toBe('session_start');
    expect(result.sessionId).toBe('sess-1');
  });

  it('transforms lsp:diagnostics to memory payload', () => {
    const connector = createLspMemoryConnector();
    const transformed = connector.transform({ uri: 'file.ts', diagnostics: [{ message: 'err', severity: 1, range: { start: { line: 1 }, end: { line: 1 } } }] });
    const result = transformed as Record<string, unknown>;
    expect(result.type).toBe('lsp_diagnostics');
    expect((result.metadata as Record<string, unknown>).count).toBe(1);
  });

  it('transforms dap:breakpoint to persistence payload', () => {
    const connector = createDapPersistenceConnector();
    const transformed = connector.transform({ sessionId: 'debug-1', breakpoints: [{ line: 10, file: 'app.ts', enabled: true }], action: 'set' });
    const result = transformed as Record<string, unknown>;
    expect(result.type).toBe('dap_breakpoint');
  });

  it('transforms chat:decision to pattern payload', () => {
    const connector = createChatPatternConnector();
    const transformed = connector.transform({ decision: 'use-postgres', context: 'data-layer', outcome: 'accepted' });
    const result = transformed as Record<string, unknown>;
    expect(result.type).toBe('chat_decision');
  });

  it('transforms self:fix:applied to adr payload', () => {
    const connector = createAutoFixAdrConnector();
    const transformed = connector.transform({ fixId: 'fix-1', filePath: 'src/config.ts', description: 'Fix lint', changeType: 'refactor' });
    const result = transformed as Record<string, unknown>;
    expect(result.type).toBe('auto_fix');
  });

  it('transforms project:scan:completed to panel payload', () => {
    const connector = createScannerPanelConnector();
    const transformed = connector.transform({ findings: 15, critical: 2, recommendations: [{ action: 'update' }] });
    const result = transformed as Record<string, unknown>;
    expect(result.type).toBe('scan_result');
    expect(result.findings).toBe(15);
  });

  it('registerDefaultConnectors sets up all 7', () => {
    const result = registerDefaultConnectors(bus);
    expect(result.getConnectors()).toHaveLength(7);
  });
});
