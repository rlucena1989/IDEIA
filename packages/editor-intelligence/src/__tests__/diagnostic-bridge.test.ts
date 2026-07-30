import { ProblemDiagnosticBridge, offsetToPosition } from '../diagnostic-bridge';

describe('ProblemDiagnosticBridge', () => {
  let mockProblemManager: { getProblems: jest.Mock };
  let bridge: ProblemDiagnosticBridge;

  beforeEach(() => {
    mockProblemManager = { getProblems: jest.fn() };
    bridge = new ProblemDiagnosticBridge(mockProblemManager as never);
  });

  it('should return empty diagnostics when no problems exist', () => {
    mockProblemManager.getProblems.mockReturnValue([]);
    const result = bridge.provideDiagnosticsFromProblemManager('file.ts');
    expect(result).toEqual([]);
  });

  it('should map problem manager diagnostics to diagnostic items', () => {
    mockProblemManager.getProblems.mockReturnValue([
      {
        range: { startLine: 1, startColumn: 2, endLine: 1, endColumn: 10 },
        severity: 8,
        message: 'Unexpected var',
        source: 'eslint',
      },
    ]);
    const result = bridge.provideDiagnosticsFromProblemManager('file.ts');
    expect(result).toHaveLength(1);
    expect(result[0].message).toBe('Unexpected var');
    expect(result[0].source).toBe('eslint');
    expect(result[0].range.start.line).toBe(1);
    expect(result[0].range.start.character).toBe(2);
    expect(result[0].range.end.line).toBe(1);
    expect(result[0].range.end.character).toBe(10);
  });

  it('should map multiple diagnostics', () => {
    mockProblemManager.getProblems.mockReturnValue([
      {
        range: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 5 },
        severity: 4,
        message: 'Warning 1',
      },
      {
        range: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 3 },
        severity: 8,
        message: 'Error 1',
      },
    ]);
    const result = bridge.provideDiagnosticsFromProblemManager('file.ts');
    expect(result).toHaveLength(2);
    expect(result[0].message).toBe('Warning 1');
    expect(result[1].message).toBe('Error 1');
  });

  it('should filter diagnostics by URI when provided', () => {
    mockProblemManager.getProblems.mockImplementation((uri: string) => {
      if (uri === 'file-a.ts') {
        return [{ range: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 1 }, severity: 8, message: 'Error in A' }];
      }
      return [];
    });
    const result = bridge.provideDiagnosticsFromProblemManager('file-a.ts');
    expect(result).toHaveLength(1);
    expect(mockProblemManager.getProblems).toHaveBeenCalledWith('file-a.ts');
  });

  it('should include optional source field when present', () => {
    mockProblemManager.getProblems.mockReturnValue([
      {
        range: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 1 },
        severity: 8,
        message: 'Error',
        source: 'typescript',
      },
    ]);
    const result = bridge.provideDiagnosticsFromProblemManager('f.ts');
    expect(result[0].source).toBe('typescript');
  });

  it('should handle problems without source', () => {
    mockProblemManager.getProblems.mockReturnValue([
      {
        range: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 1 },
        severity: 2,
        message: 'Info',
      },
    ]);
    const result = bridge.provideDiagnosticsFromProblemManager('f.ts');
    expect(result[0].source).toBeUndefined();
    expect(result[0].message).toBe('Info');
  });
});

describe('offsetToPosition', () => {
  it('should return line 0 for offset in first line', () => {
    const pos = offsetToPosition(3, 'hello world');
    expect(pos.line).toBe(0);
    expect(pos.character).toBe(3);
  });

  it('should calculate position after newline', () => {
    const pos = offsetToPosition(6, 'hello\nworld');
    expect(pos.line).toBe(1);
    expect(pos.character).toBe(0);
  });

  it('should handle multiple lines', () => {
    const pos = offsetToPosition(12, 'line1\nline2\nline3');
    expect(pos.line).toBe(2);
    expect(pos.character).toBe(0);
  });

  it('should calculate character offset within a line', () => {
    const pos = offsetToPosition(8, 'line1\nline2');
    expect(pos.line).toBe(1);
    expect(pos.character).toBe(2);
  });

  it('should handle empty string', () => {
    const pos = offsetToPosition(0, '');
    expect(pos.line).toBe(0);
    expect(pos.character).toBe(0);
  });

  it('should handle offset at end of string', () => {
    const text = 'abc\ndef';
    const pos = offsetToPosition(text.length, text);
    expect(pos.line).toBe(1);
    expect(pos.character).toBe(3);
  });

  it('should handle string with only newline', () => {
    const pos = offsetToPosition(1, '\n');
    expect(pos.line).toBe(1);
    expect(pos.character).toBe(0);
  });

  it('should handle offset exactly at a newline character', () => {
    const pos = offsetToPosition(5, 'hello\nworld');
    expect(pos.line).toBe(0);
    expect(pos.character).toBe(5);
  });
});
