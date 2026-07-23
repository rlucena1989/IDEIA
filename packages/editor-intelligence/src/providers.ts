import { Emitter } from '@ideia/core-contributions';
import {
  CompletionProvider, CompletionItem, Position, CompletionContext,
  HoverProvider, Hover,
  DefinitionProvider, Location,
  ReferencesProvider,
  SignatureHelpProvider, SignatureHelp,
  DocumentSymbolProvider, SymbolInformation,
  DiagnosticProvider, DiagnosticItem,
  CodeActionProvider, CodeAction, Range, CodeActionContext,
  SemanticTokensProvider, SemanticTokens,
  InlayHintProvider, InlayHint,
  InlineCompletionProvider, InlineCompletion, InlineCompletionContext,
} from './types';

export class ProviderRouter {
  private completionProviders: CompletionProvider[] = [];
  private hoverProviders: HoverProvider[] = [];
  private definitionProviders: DefinitionProvider[] = [];
  private referencesProviders: ReferencesProvider[] = [];
  private signatureHelpProviders: SignatureHelpProvider[] = [];
  private documentSymbolProviders: DocumentSymbolProvider[] = [];
  private diagnosticProviders: DiagnosticProvider[] = [];
  private codeActionProviders: CodeActionProvider[] = [];
  private semanticTokensProviders: SemanticTokensProvider[] = [];
  private inlayHintProviders: InlayHintProvider[] = [];
  private inlineCompletionProviders: InlineCompletionProvider[] = [];

  registerCompletion(provider: CompletionProvider): void { this.completionProviders.push(provider); }
  registerHover(provider: HoverProvider): void { this.hoverProviders.push(provider); }
  registerDefinition(provider: DefinitionProvider): void { this.definitionProviders.push(provider); }
  registerReferences(provider: ReferencesProvider): void { this.referencesProviders.push(provider); }
  registerSignatureHelp(provider: SignatureHelpProvider): void { this.signatureHelpProviders.push(provider); }
  registerDocumentSymbol(provider: DocumentSymbolProvider): void { this.documentSymbolProviders.push(provider); }
  registerDiagnostic(provider: DiagnosticProvider): void { this.diagnosticProviders.push(provider); }
  registerCodeAction(provider: CodeActionProvider): void { this.codeActionProviders.push(provider); }
  registerSemanticTokens(provider: SemanticTokensProvider): void { this.semanticTokensProviders.push(provider); }
  registerInlayHints(provider: InlayHintProvider): void { this.inlayHintProviders.push(provider); }
  registerInlineCompletion(provider: InlineCompletionProvider): void { this.inlineCompletionProviders.push(provider); }

  async getCompletions(uri: string, position: Position, context?: CompletionContext): Promise<CompletionItem[]> {
    const results = await Promise.all(this.completionProviders.map(p => p.provideCompletions(uri, position, context)));
    return results.flat();
  }

  async getHover(uri: string, position: Position): Promise<Hover | null> {
    for (const p of this.hoverProviders) {
      const result = await p.provideHover(uri, position);
      if (result) return result;
    }
    return null;
  }

  async getDefinition(uri: string, position: Position): Promise<Location[]> {
    const results = await Promise.all(this.definitionProviders.map(p => p.provideDefinition(uri, position)));
    return results.flat();
  }

  async getReferences(uri: string, position: Position): Promise<Location[]> {
    const results = await Promise.all(this.referencesProviders.map(p => p.provideReferences(uri, position)));
    return results.flat();
  }

  async getCodeActions(uri: string, range: Range, context: CodeActionContext): Promise<CodeAction[]> {
    const results = await Promise.all(this.codeActionProviders.map(p => p.provideCodeActions(uri, range, context)));
    return results.flat();
  }
}
