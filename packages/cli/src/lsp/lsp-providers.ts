import { createLogger } from '@ideia/logger';

const _log = createLogger('lsp-providers');

export interface CompletionItem {
  label: string;
  kind: 'keyword' | 'function' | 'variable' | 'class' | 'property' | 'snippet' | 'text';
  detail?: string;
  documentation?: string;
  insertText: string;
  score: number;
}

export interface HoverInfo {
  contents: string;
  range?: { startLine: number; startCol: number; endLine: number; endCol: number };
}

export interface DefinitionLocation {
  uri: string;
  line: number;
  column: number;
}

export interface ReferenceLocation {
  uri: string;
  line: number;
  column: number;
  context: string;
}

export interface SignatureHelp {
  signature: string;
  parameters: Array<{ label: string; documentation?: string }>;
  activeParameter: number;
}

export interface DocumentSymbol {
  name: string;
  kind: 'class' | 'function' | 'method' | 'variable' | 'interface' | 'module';
  range: { startLine: number; startCol: number; endLine: number; endCol: number };
  children?: DocumentSymbol[];
}

export interface CodeAction {
  title: string;
  kind: 'quickfix' | 'refactor' | 'organizeImports';
  edit?: TextEdit[];
}

export interface TextEdit {
  range: { startLine: number; startCol: number; endLine: number; endCol: number };
  newText: string;
}

export interface RenameLocation {
  uri: string;
  line: number;
  column: number;
}

const LANGUAGE_MAP: Record<string, string[]> = {
  typescript: ['ts', 'tsx', 'mts'],
  javascript: ['js', 'jsx', 'mjs'],
  python: ['py'],
  css: ['css', 'scss', 'less'],
  html: ['html', 'htm'],
};

export function getLanguageFromExtension(ext: string): string | undefined {
  for (const [lang, exts] of Object.entries(LANGUAGE_MAP)) {
    if (exts.includes(ext)) return lang;
  }
  return undefined;
}

export function buildCompletionContext(
  textBefore: string,
  textAfter: string,
  filePath: string,
): { wordPrefix: string; lineContent: string; languageId: string } {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const languageId = getLanguageFromExtension(ext) ?? 'plaintext';
  const lines = textBefore.split('\n');
  const lineContent = lines[lines.length - 1] ?? '';
  const words = lineContent.split(/[\s(,;=<>+*-/]/);
  const wordPrefix = words[words.length - 1] ?? '';

  return { wordPrefix, lineContent, languageId };
}

const KEYWORD_COMPLETIONS: Record<string, CompletionItem[]> = {
  typescript: [
    { label: 'console.log', kind: 'function', insertText: 'logger.info($1)', score: 0.7 },
    { label: 'if', kind: 'keyword', insertText: 'if ($1) {\n  $2\n}', score: 0.8 },
    { label: 'for', kind: 'keyword', insertText: 'for (let i = 0; i < $1; i++) {\n  $2\n}', score: 0.7 },
    { label: 'import', kind: 'keyword', insertText: 'import { $1 } from "$2"', score: 0.8 },
    { label: 'function', kind: 'keyword', insertText: 'function $1($2) {\n  $3\n}', score: 0.7 },
    { label: 'async function', kind: 'keyword', insertText: 'async function $1($2) {\n  $3\n}', score: 0.6 },
    { label: 'const', kind: 'keyword', insertText: 'const $1 = $2', score: 0.8 },
    { label: 'return', kind: 'keyword', insertText: 'return $1', score: 0.9 },
    { label: 'try', kind: 'keyword', insertText: 'try {\n  $1\n} catch (_error) {\n  $2\n}', score: 0.6 },
    { label: 'class', kind: 'keyword', insertText: 'class $1 {\n  constructor($2) {\n    $3\n  }\n}', score: 0.6 },
  ],
  javascript: [
    { label: 'console.log', kind: 'function', insertText: 'logger.info($1)', score: 0.7 },
    { label: 'function', kind: 'keyword', insertText: 'function $1($2) {\n  $3\n}', score: 0.7 },
    { label: 'const', kind: 'keyword', insertText: 'const $1 = $2', score: 0.8 },
    { label: 'import', kind: 'keyword', insertText: 'import { $1 } from "$2"', score: 0.8 },
  ],
  python: [
    { label: 'def', kind: 'keyword', insertText: 'def $1($2):\n  $3', score: 0.8 },
    { label: 'class', kind: 'keyword', insertText: 'class $1:\n  def __init__(self, $2):\n    $3', score: 0.6 },
    { label: 'import', kind: 'keyword', insertText: 'import $1', score: 0.8 },
    { label: 'print', kind: 'function', insertText: 'print($1)', score: 0.7 },
    { label: 'if', kind: 'keyword', insertText: 'if $1:\n  $2', score: 0.8 },
    { label: 'for', kind: 'keyword', insertText: 'for $1 in $2:\n  $3', score: 0.7 },
    { label: 'return', kind: 'keyword', insertText: 'return $1', score: 0.9 },
  ],
  css: [
    { label: 'display', kind: 'property', insertText: 'display: $1', score: 0.8 },
    { label: 'color', kind: 'property', insertText: 'color: $1', score: 0.8 },
    { label: 'margin', kind: 'property', insertText: 'margin: $1', score: 0.7 },
    { label: 'padding', kind: 'property', insertText: 'padding: $1', score: 0.7 },
    { label: 'flex', kind: 'property', insertText: 'display: flex;\njustify-content: $1;\nalign-items: $2;', score: 0.6 },
  ],
  html: [
    { label: 'div', kind: 'snippet', insertText: '<div>\n  $1\n</div>', score: 0.8 },
    { label: 'a', kind: 'snippet', insertText: '<a href="$1">$2</a>', score: 0.7 },
    { label: 'img', kind: 'snippet', insertText: '<img src="$1" alt="$2" />', score: 0.7 },
    { label: 'script', kind: 'snippet', insertText: '<script>\n  $1\n</script>', score: 0.6 },
  ],
};

export function getKeywordCompletions(languageId: string, prefix: string): CompletionItem[] {
  const items = KEYWORD_COMPLETIONS[languageId] ?? [];
  if (!prefix) return items.slice(0, 5);
  return items.filter(i => i.label.startsWith(prefix)).slice(0, 5);
}
