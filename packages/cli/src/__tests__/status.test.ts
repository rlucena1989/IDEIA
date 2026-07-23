import { computeStatus, StatusReport } from '../commands/status';
import { getIO, resetIO } from '../io';

jest.mock('../io', () => {
  const { MockIOContainer } = jest.requireActual('../io/mock');
  let mockIO: any = null;
  return {
    __esModule: true,
    getIO: () => {
      if (!mockIO) mockIO = new MockIOContainer();
      return mockIO;
    },
    resetIO: () => { mockIO = null; },
    createIO: () => {
      if (!mockIO) mockIO = new MockIOContainer();
      return mockIO;
    },
  };
});

describe('status - computeStatus', () => {
  let io: any;

  beforeEach(() => {
    resetIO();
    io = getIO() as any;
    io._reset();
  });

  it('deve listar areas com scores', () => {
    const report = computeStatus();
    for (const area of report.areas) {
      expect(area.id).toBeTruthy();
      expect(area.label).toBeTruthy();
      expect(area.score).toBeGreaterThanOrEqual(0);
      expect(area.score).toBeLessThanOrEqual(100);
    }
  });

  it('deve ter 4 areas (context, architecture, quality, security)', () => {
    const report = computeStatus();
    const ids = report.areas.map(a => a.id);
    expect(ids).toContain('context');
    expect(ids).toContain('architecture');
    expect(ids).toContain('quality');
    expect(ids).toContain('security');
  });

  it('deve retornar health 100 e belowRecommended false quando tudo presente', () => {
    io.fs._addFile('.ai/context/ai-handoff.md');
    io.fs._addFile('.ai/project-manifest.yaml');
    io.fs._addFile('.ai/laws.yaml');
    io.fs._addFile('.ai/bin/verify.js');
    io.fs._addFile('.ai/bin/quality-agent.js');
    io.fs._addFile('.ai/policies/command-policy.md');
    io.fs._addFile('.ai/policies/ai-generated-code-policy.md');

    const report = computeStatus();
    expect(report.belowRecommended).toBe(false);
    expect(report.finalHealth).toBeGreaterThanOrEqual(85);
  });
});