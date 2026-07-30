import 'jest';
import { IDEIA_ConfigWidget } from '../ideia-config-widget';

const mockEl = { style: new Proxy({} as Record<string, string>, { get(t, p) { return p === 'cssText' ? '' : t[p as string]; }, set(t, p, v) { if (typeof p === 'string') t[p] = v; return true; } }), appendChild: () => {}, querySelector: () => null, remove: () => {} };
if (typeof document === 'undefined') (globalThis as Record<string, unknown>).document = { createElement: () => mockEl };

describe('IDEIA_ConfigWidget', () => {
  const mockConfigService = {
    getFullConfig: jest.fn().mockResolvedValue({
      general: { workspacePath: '/test', language: 'typescript', autoSave: true, autoSaveDelay: 2000 },
      agents: { maxConcurrent: 5, defaultModel: 'ollama', timeout: 120, autoRetry: true },
      security: { sandboxEnabled: true, approvalLevel: '1', auditEnabled: true, secretScan: true },
      performance: { maxMemory: 512, cacheEnabled: true, eventBatchSize: 100, workers: 4 },
      appearance: { theme: 'dark', accentColor: '#3b82f6', fontSize: 14, compactMode: false },
      extensions: { autoUpdate: true, allowUnsafe: false, registry: 'https://open-vsx.org' },
    }),
    setConfig: jest.fn().mockResolvedValue(undefined),
  };

  let widget: IDEIA_ConfigWidget;

  beforeEach(() => {
    jest.clearAllMocks();
    widget = new IDEIA_ConfigWidget(mockConfigService as never);
  });

  it('should have static ID and LABEL', () => {
    expect(IDEIA_ConfigWidget.ID).toBe('ideia:config');
    expect(IDEIA_ConfigWidget.LABEL).toBe('IDEIA Configuration');
  });

  it('should initialize with config data on init', async () => {
    const w = widget;
    await w.init();
    expect(mockConfigService.getFullConfig).toHaveBeenCalled();
  });

  it('should have correct id after construction', () => {
    expect(widget.id).toBe('ideia:config');
  });

  it('should be a Theia widget with correct id', () => {
    expect(widget.id).toBe('ideia:config');
  });
});
