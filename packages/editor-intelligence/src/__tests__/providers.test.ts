import { ProviderRouter } from '../providers';
import {
  CompletionProvider, Position, HoverProvider,
  DefinitionProvider, Location, DiagnosticProvider, CodeActionProvider,
} from '../types';

describe('ProviderRouter', () => {
  let router: ProviderRouter;
  const mockPosition: Position = { line: 0, character: 0 };

  beforeEach(() => {
    router = new ProviderRouter();
  });

  describe('completion providers', () => {
    it('should register and aggregate completions from multiple providers', async () => {
      const provider1: CompletionProvider = {
        provideCompletions: jest.fn().mockResolvedValue([
          { label: 'foo', kind: 0 },
        ]),
      };
      const provider2: CompletionProvider = {
        provideCompletions: jest.fn().mockResolvedValue([
          { label: 'bar', kind: 0 },
        ]),
      };
      router.registerCompletion(provider1);
      router.registerCompletion(provider2);
      const results = await router.getCompletions('file.ts', mockPosition);
      expect(results).toHaveLength(2);
      expect(results[0].label).toBe('foo');
      expect(results[1].label).toBe('bar');
    });

    it('should return empty array when no providers registered', async () => {
      const results = await router.getCompletions('file.ts', mockPosition);
      expect(results).toEqual([]);
    });

    it('should pass context to providers', async () => {
      const provider: CompletionProvider = {
        provideCompletions: jest.fn().mockResolvedValue([]),
      };
      router.registerCompletion(provider);
      const context = { triggerKind: 1 as const, triggerCharacter: '.' };
      await router.getCompletions('file.ts', mockPosition, context);
      expect(provider.provideCompletions).toHaveBeenCalledWith('file.ts', mockPosition, context);
    });
  });

  describe('hover providers', () => {
    it('should return first non-null hover result', async () => {
      const p1: HoverProvider = { provideHover: jest.fn().mockResolvedValue(null) };
      const p2: HoverProvider = { provideHover: jest.fn().mockResolvedValue({ contents: 'hover info' }) };
      const p3: HoverProvider = { provideHover: jest.fn().mockResolvedValue({ contents: 'should not reach' }) };
      router.registerHover(p1);
      router.registerHover(p2);
      router.registerHover(p3);
      const result = await router.getHover('file.ts', mockPosition);
      expect(result).toEqual({ contents: 'hover info' });
      expect(p3.provideHover).not.toHaveBeenCalled();
    });

    it('should return null when all hover providers return null', async () => {
      router.registerHover({ provideHover: jest.fn().mockResolvedValue(null) });
      const result = await router.getHover('file.ts', mockPosition);
      expect(result).toBeNull();
    });
  });

  describe('definition providers', () => {
    it('should aggregate definitions from multiple providers', async () => {
      const p1: DefinitionProvider = {
        provideDefinition: jest.fn().mockResolvedValue([
          { uri: 'file1.ts', range: { start: mockPosition, end: mockPosition } },
        ]),
      };
      const p2: DefinitionProvider = {
        provideDefinition: jest.fn().mockResolvedValue([
          { uri: 'file2.ts', range: { start: mockPosition, end: mockPosition } },
        ]),
      };
      router.registerDefinition(p1);
      router.registerDefinition(p2);
      const results = await router.getDefinition('file.ts', mockPosition);
      expect(results).toHaveLength(2);
    });
  });

  describe('references providers', () => {
    it('should aggregate references from multiple providers', async () => {
      const p1 = { provideReferences: jest.fn().mockResolvedValue([] as Location[]) };
      const p2 = { provideReferences: jest.fn().mockResolvedValue([] as Location[]) };
      router.registerReferences(p1);
      router.registerReferences(p2);
      const results = await router.getReferences('file.ts', mockPosition);
      expect(p1.provideReferences).toHaveBeenCalled();
      expect(p2.provideReferences).toHaveBeenCalled();
      expect(results).toEqual([]);
    });
  });

  describe('code action providers', () => {
    it('should aggregate code actions from multiple providers', async () => {
      const p1: CodeActionProvider = {
        provideCodeActions: jest.fn().mockResolvedValue([
          { title: 'Fix 1', diagnostics: [] },
        ]),
      };
      const p2: CodeActionProvider = {
        provideCodeActions: jest.fn().mockResolvedValue([
          { title: 'Fix 2', diagnostics: [] },
        ]),
      };
      router.registerCodeAction(p1);
      router.registerCodeAction(p2);
      const range = { start: mockPosition, end: { line: 1, character: 0 } };
      const context = { diagnostics: [] };
      const results = await router.getCodeActions('file.ts', range, context);
      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Fix 1');
    });
  });

  describe('diagnostic providers', () => {
    it('should register diagnostic provider', () => {
      const provider: DiagnosticProvider = {
        provideDiagnostics: jest.fn(),
        onDiagnosticsChanged: jest.fn() as never,
      };
      expect(() => router.registerDiagnostic(provider)).not.toThrow();
    });
  });

  describe('unregistered providers', () => {
    it('should return empty results when no providers registered for a type', async () => {
      const defs = await router.getDefinition('f.ts', mockPosition);
      expect(defs).toEqual([]);
      const refs = await router.getReferences('f.ts', mockPosition);
      expect(refs).toEqual([]);
      const actions = await router.getCodeActions('f.ts', { start: mockPosition, end: mockPosition }, { diagnostics: [] });
      expect(actions).toEqual([]);
    });
  });
});
