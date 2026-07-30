import {
  CompletionItemKind, SymbolKind, DiagnosticSeverity, InlayHintKind,
  DiagnosticItem, Position, Range, CompletionItem, SymbolInformation,
  Location, Hover, SignatureHelp, CodeAction, TextEdit, WorkspaceEdit,
  Command, SemanticTokens, InlayHint, InlineCompletion,
} from '../types';

describe('editor-intelligence types', () => {
  it('should export CompletionItemKind enum with expected values', () => {
    expect(CompletionItemKind.Text).toBe(0);
    expect(CompletionItemKind.Method).toBe(1);
    expect(CompletionItemKind.Function).toBe(2);
    expect(CompletionItemKind.Class).toBe(6);
    expect(CompletionItemKind.Module).toBe(8);
  });

  it('should export SymbolKind enum with expected values', () => {
    expect(SymbolKind.File).toBe(0);
    expect(SymbolKind.Module).toBe(1);
    expect(SymbolKind.Class).toBe(4);
    expect(SymbolKind.Method).toBe(5);
    expect(SymbolKind.Function).toBe(11);
  });

  it('should export DiagnosticSeverity enum with expected values', () => {
    expect(DiagnosticSeverity.Error).toBe(1);
    expect(DiagnosticSeverity.Warning).toBe(2);
    expect(DiagnosticSeverity.Information).toBe(3);
    expect(DiagnosticSeverity.Hint).toBe(4);
  });

  it('should export InlayHintKind enum with expected values', () => {
    expect(InlayHintKind.Type).toBe(1);
    expect(InlayHintKind.Parameter).toBe(2);
  });

  it('should support Position interface', () => {
    const pos: Position = { line: 10, character: 5 };
    expect(pos.line).toBe(10);
    expect(pos.character).toBe(5);
  });

  it('should support Range interface', () => {
    const range: Range = {
      start: { line: 1, character: 0 },
      end: { line: 1, character: 10 },
    };
    expect(range.start.line).toBe(1);
    expect(range.end.character).toBe(10);
  });

  it('should support DiagnosticItem interface', () => {
    const diag: DiagnosticItem = {
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
      severity: DiagnosticSeverity.Error,
      message: 'test error',
      source: 'ts',
      code: 'TS123',
    };
    expect(diag.message).toBe('test error');
    expect(diag.severity).toBe(DiagnosticSeverity.Error);
    expect(diag.code).toBe('TS123');
  });

  it('should support CompletionItem interface', () => {
    const item: CompletionItem = {
      label: 'console.log',
      kind: CompletionItemKind.Method,
      detail: 'logs to console',
    };
    expect(item.label).toBe('console.log');
    expect(item.insertText).toBeUndefined();
  });

  it('should support SymbolInformation interface', () => {
    const info: SymbolInformation = {
      name: 'myFunc',
      kind: SymbolKind.Function,
      location: {
        uri: 'file.ts',
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
      },
    };
    expect(info.name).toBe('myFunc');
    expect(info.location.uri).toBe('file.ts');
  });

  it('should support Hover interface', () => {
    const hover: Hover = { contents: 'hover info' };
    expect(hover.contents).toBe('hover info');
    expect(hover.range).toBeUndefined();
  });

  it('should support Location interface', () => {
    const loc: Location = {
      uri: 'file.ts',
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
    };
    expect(loc.uri).toBe('file.ts');
  });

  it('should support SignatureHelp interface', () => {
    const help: SignatureHelp = {
      signatures: [{ label: 'foo(a: string)', parameters: [{ label: 'a' }] }],
      activeSignature: 0,
      activeParameter: 0,
    };
    expect(help.signatures[0].label).toBe('foo(a: string)');
  });

  it('should support CodeAction interface', () => {
    const action: CodeAction = {
      title: 'Fix',
      kind: 'quickfix',
      diagnostics: [],
    };
    expect(action.title).toBe('Fix');
  });

  it('should support TextEdit and WorkspaceEdit', () => {
    const edit: TextEdit = {
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
      newText: 'fixed',
    };
    const workspaceEdit: WorkspaceEdit = {
      changes: { 'file.ts': [edit] },
    };
    expect(workspaceEdit.changes['file.ts'][0].newText).toBe('fixed');
  });

  it('should support Command interface', () => {
    const cmd: Command = { id: 'cmd.id', title: 'Command' };
    expect(cmd.id).toBe('cmd.id');
  });

  it('should support SemanticTokens interface', () => {
    const tokens: SemanticTokens = { data: [0, 0, 5, 0, 0] };
    expect(tokens.data).toHaveLength(5);
  });

  it('should support InlayHint interface', () => {
    const hint: InlayHint = {
      position: { line: 1, character: 5 },
      label: ': number',
      kind: InlayHintKind.Type,
    };
    expect(hint.label).toBe(': number');
  });

  it('should support InlineCompletion interface', () => {
    const comp: InlineCompletion = { text: 'completion text' };
    expect(comp.text).toBe('completion text');
  });
});
