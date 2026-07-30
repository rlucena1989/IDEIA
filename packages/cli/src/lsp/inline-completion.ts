import { createLogger } from '@ideia/logger';

const log = createLogger('inline-completion');

export interface InlineCompletionContext {
  textBeforeCursor: string;
  textAfterCursor: string;
  languageId: string;
  filePath: string;
  lineContent: string;
  indentation: string;
}

export interface InlineCompletionResult {
  items: InlineCompletionItem[];
}

export interface InlineCompletionItem {
  text: string;
  insertText: string;
  range?: { startLine: number; startColumn: number; endLine: number; endColumn: number };
  kind?: 'snippet' | 'word' | 'line';
  score: number;
}

const COMPLETION_PROMPT = `Complete the code at the cursor position marked by <CURSOR>.
Return ONLY the completion text, no explanations, no markdown.
Match the existing indentation and style.
Keep the completion concise (1-3 lines unless the completion is obvious).`;

export class InlineCompletionProvider {
  private baseUrl: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private timeoutMs: number;

  constructor(options?: { baseUrl?: string; model?: string; maxTokens?: number; temperature?: number; timeoutMs?: number }) {
    this.baseUrl = options?.baseUrl ?? 'http://127.0.0.1:11434';
    this.model = options?.model ?? 'phi-4-mini';
    this.maxTokens = options?.maxTokens ?? 64;
    this.temperature = options?.temperature ?? 0.2;
    this.timeoutMs = options?.timeoutMs ?? 2000;
  }

  async provideCompletionItems(context: InlineCompletionContext): Promise<InlineCompletionResult> {
    const prompt = this.buildPrompt(context);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          options: {
            temperature: this.temperature,
            num_predict: this.maxTokens,
            top_p: 0.9,
            stop: ['\n\n', '\n\n\n'],
          },
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        log.warn('Ollama returned non-OK status', { status: response.status });
        return { items: [] };
      }

      const data = (await response.json()) as { response?: string };
      const completion = data.response?.trim() ?? '';

      if (!completion || completion.length < 1) {
        return { items: [] };
      }

      const items = this.parseCompletion(completion, context);
      return { items };
    } catch (_error) {
      log.warn('Ollama inline completion failed', {
        error: _error instanceof Error ? _error.message : String(_error),
      });
      return { items: [] };
    }
  }

  private buildPrompt(context: InlineCompletionContext): string {
    const before = context.textBeforeCursor;
    const after = context.textAfterCursor;
    const lang = context.languageId;

    return `${COMPLETION_PROMPT}

Language: ${lang}
File: ${context.filePath}

Code:
\`\`\`${lang}
${before}<CURSOR>${after}
\`\`\`

Completion:
\`\`\`${lang}`;
  }

  private parseCompletion(completion: string, context: InlineCompletionContext): InlineCompletionItem[] {
    const cleaned = completion
      .replace(/^```[\w]*\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    if (!cleaned) return [];

    const ahead = context.textAfterCursor.trim();

    const items: InlineCompletionItem[] = [
      {
        text: cleaned,
        insertText: cleaned,
        kind: cleaned.includes('\n') ? 'snippet' : 'word',
        score: 1.0,
      },
    ];

    if (ahead && cleaned.endsWith(ahead) && cleaned.length > ahead.length) {
      items.push({
        text: cleaned.slice(0, -ahead.length),
        insertText: cleaned.slice(0, -ahead.length),
        kind: 'word',
        score: 0.9,
      });
    }

    return items;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(2000),
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async pullModel(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: this.model, stream: false }),
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  setModel(model: string): void {
    this.model = model;
  }

  getModel(): string {
    return this.model;
  }
}

export function createInlineCompletionProvider(options?: { baseUrl?: string; model?: string }): InlineCompletionProvider {
  return new InlineCompletionProvider(options);
}
