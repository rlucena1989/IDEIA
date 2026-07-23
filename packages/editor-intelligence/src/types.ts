import { Disposable, Event } from '@ideia/core-contributions';

export interface LspClientManager {
  connect(serverId: string, options: LspConnectionOptions): Promise<LspClient>;
  disconnect(serverId: string): Promise<void>;
  getClient(serverId: string): LspClient | undefined;
  restart(serverId: string): Promise<void>;
}

export interface LspConnectionOptions {
  command: string;
  args: string[];
  languageIds: string[];
  workspaceUri: string;
  transport: 'stdio' | 'socket' | 'pipe';
}

export interface LspClient {
  readonly serverId: string;
  readonly connected: boolean;
  request<T>(method: string, params: unknown): Promise<T>;
  notify(method: string, params: unknown): void;
  onNotification: Event<{ method: string; params: unknown }>;
  dispose(): void;
}

export interface CompletionProvider {
  provideCompletions(uri: string, position: Position, context?: CompletionContext): Promise<CompletionItem[]>;
  resolveCompletion?(item: CompletionItem): Promise<CompletionItem>;
}

export interface CompletionItem {
  label: string;
  kind?: CompletionItemKind;
  detail?: string;
  documentation?: string;
  insertText?: string;
  sortText?: string;
  filterText?: string;
}

export enum CompletionItemKind {
  Text = 0, Method = 1, Function = 2, Constructor = 3, Field = 4, Variable = 5,
  Class = 6, Interface = 7, Module = 8, Property = 9, Unit = 10, Value = 11,
  Enum = 12, Keyword = 13, Snippet = 14, Color = 15, File = 16, Reference = 17,
  Folder = 18, EnumMember = 19, Constant = 20, Struct = 21, Event = 22,
  Operator = 23, TypeParameter = 24,
}

export interface CompletionContext {
  triggerKind: 0 | 1 | 2;
  triggerCharacter?: string;
}

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface HoverProvider {
  provideHover(uri: string, position: Position): Promise<Hover | null>;
}

export interface Hover {
  contents: string;
  range?: Range;
}

export interface DefinitionProvider {
  provideDefinition(uri: string, position: Position): Promise<Location[]>;
}

export interface Location {
  uri: string;
  range: Range;
}

export interface ReferencesProvider {
  provideReferences(uri: string, position: Position): Promise<Location[]>;
}

export interface SignatureHelpProvider {
  provideSignatureHelp(uri: string, position: Position): Promise<SignatureHelp | null>;
}

export interface SignatureHelp {
  signatures: SignatureInformation[];
  activeSignature: number;
  activeParameter: number;
}

export interface SignatureInformation {
  label: string;
  documentation?: string;
  parameters: ParameterInformation[];
}

export interface ParameterInformation {
  label: string;
  documentation?: string;
}

export interface DocumentSymbolProvider {
  provideDocumentSymbols(uri: string): Promise<SymbolInformation[]>;
}

export interface SymbolInformation {
  name: string;
  kind: SymbolKind;
  location: Location;
  containerName?: string;
}

export enum SymbolKind {
  File = 0, Module = 1, Namespace = 2, Package = 3, Class = 4, Method = 5,
  Property = 6, Field = 7, Constructor = 8, Enum = 9, Interface = 10,
  Function = 11, Variable = 12, Constant = 13, String = 14, Number = 15,
  Boolean = 16, Array = 17, Object = 18, Key = 19, Null = 20,
}

export interface DiagnosticProvider {
  provideDiagnostics(uri: string): Promise<DiagnosticItem[]>;
  onDiagnosticsChanged: Event<{ uri: string; diagnostics: DiagnosticItem[] }>;
}

export interface DiagnosticItem {
  range: Range;
  severity: DiagnosticSeverity;
  message: string;
  source?: string;
  code?: string;
}

export enum DiagnosticSeverity {
  Error = 1, Warning = 2, Information = 3, Hint = 4,
}

export interface CodeActionProvider {
  provideCodeActions(uri: string, range: Range, context: CodeActionContext): Promise<CodeAction[]>;
}

export interface CodeAction {
  title: string;
  kind?: string;
  diagnostics?: DiagnosticItem[];
  isPreferred?: boolean;
  edit?: WorkspaceEdit;
  command?: Command;
}

export interface CodeActionContext {
  diagnostics: DiagnosticItem[];
  only?: string[];
}

export interface WorkspaceEdit {
  changes: Record<string, TextEdit[]>;
}

export interface TextEdit {
  range: Range;
  newText: string;
}

export interface Command {
  id: string;
  title: string;
  arguments?: unknown[];
}

export interface SemanticTokensProvider {
  provideSemanticTokens(uri: string): Promise<SemanticTokens>;
}

export interface SemanticTokens {
  data: number[];
  resultId?: string;
}

export interface InlayHintProvider {
  provideInlayHints(uri: string, range: Range): Promise<InlayHint[]>;
}

export interface InlayHint {
  position: Position;
  label: string;
  kind?: InlayHintKind;
}

export enum InlayHintKind {
  Type = 1, Parameter = 2,
}

export interface InlineCompletionProvider {
  provideInlineCompletions(uri: string, position: Position, context?: InlineCompletionContext): Promise<InlineCompletion[]>;
}

export interface InlineCompletion {
  text: string;
  range?: Range;
  filterText?: string;
}

export interface InlineCompletionContext {
  triggerKind: 0 | 1;
  selectedCompletionInfo?: { text: string; range: Range };
}
