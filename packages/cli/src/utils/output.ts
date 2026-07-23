const isLLMMode = (): boolean => process.env.AI_LLM_MODE === '1';

type OutputOptions = {
  checkpoint: string;
  ok: boolean;
  status: string;
  context_summary: string;
  next_actions?: string[];
  data?: Record<string, unknown>;
  exit?: boolean;
};

function exitCode(ok: boolean): number {
  return ok ? 0 : 1;
}

/**
 * Imprime header.
 * @param title - Valor title.
 */
export function printHeader(title: string): void {
  if (isLLMMode()) return;
  console.log(`\n${title}\n`);
}

/**
 * Imprime line.
 * @param line - Valor line.
 */
export function printLine(line: string): void {
  if (isLLMMode()) return;
  console.log(line);
}

/**
 * Imprime result.
 * @param label - Valor label.
 * @param ok - Valor ok.
 * @param detail - Valor detail.
 */
export function printResult(label: string, ok: boolean, detail?: string): void {
  if (isLLMMode()) return;
  const icon = ok ? '✅' : '❌';
  const msg = detail ? `${icon} ${label}: ${detail}` : `${icon} ${label}`;
  console.log(msg);
}

/**
 * Imprime summary.
 * @param score - Valor score.
 * @param max - Valor max.
 * @param label - Valor label.
 */
export function printSummary(score: number, max: number, label: string): void {
  if (isLLMMode()) return;
  const icon = score >= 85 ? '✅' : score >= 65 ? '⚠️' : '❌';
  console.log(`${icon} ${label}: ${score}/${max}`);
}

/**
 * Processa finish.
 * @param opts - Valor opts.
 */
export function finish(opts: OutputOptions): void {
  if (isLLMMode()) {
    const json = JSON.stringify({
      ok: opts.ok,
      checkpoint: opts.checkpoint,
      status: opts.status,
      context_summary: opts.context_summary,
      next_actions: opts.next_actions || [],
      cost_usd: 0.00,
      ...(opts.data ? { data: opts.data } : {}),
    }, null, 2);
    console.log(json);
  }
  if (opts.exit !== false) process.exit(exitCode(opts.ok));
}

export const _printHeader = printHeader;
export const _printLine = printLine;
export const _printResult = printResult;
export const _finish = finish;
