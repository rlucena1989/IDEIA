import { Command } from 'commander';
import path from 'node:path';
import fs from 'node:fs';
import https from 'node:https';
import { printHeader, printLine, printResult, finish } from "../utils/output";
import { getIO } from '../io';

// ============================================================
// TASK-GAP-11: Observability & Tracing de Chamadas de IA
// ============================================================

interface TraceEntry {
  timestamp: string;
  model: string;
  provider: string;
  latency_ms: number;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  command: string;
  status: 'success' | 'error' | 'timeout';
  error?: string;
}

const TRACES_DIR = '.ai/reports/observability';
const TRACES_FILE = 'traces.jsonl';
const METRICS_FILE = 'metrics.json';

function getTracesPath(root: string): string {
  return path.join(root, TRACES_DIR, TRACES_FILE);
}

function getMetricsPath(root: string): string {
  return path.join(root, TRACES_DIR, METRICS_FILE);
}

function ensureDir(root: string): void {
  getIO().fs.mkDir(path.join(root, TRACES_DIR), true);
}

function readTraces(root: string): TraceEntry[] {
  const tracesPath = getTracesPath(root);
  if (!getIO().fs.exists(tracesPath)) return [];
  return getIO().fs.read(tracesPath, 'utf8')
    .split('\n')
    .filter(l => l.trim())
    .map(l => {
      try { return JSON.parse(l) as TraceEntry; }
      catch { return null; }
    })
    .filter((t): t is TraceEntry => t !== null);
}

function computeMetrics(traces: TraceEntry[]) {
  if (traces.length === 0) {
    return {
      total_calls: 0,
      avg_latency_ms: 0,
      p95_latency_ms: 0,
      total_tokens: 0,
      total_cost_usd: 0,
      success_rate: 0,
      by_model: {} as Record<string, { calls: number; avg_latency: number; cost: number }>,
      by_provider: {} as Record<string, { calls: number; avg_latency: number; cost: number }>,
    };
  }

  const latencies = traces.map(t => t.latency_ms).sort((a, b) => a - b);
  const p95Index = Math.ceil(latencies.length * 0.95) - 1;
  const successCount = traces.filter(t => t.status === 'success').length;

  const byModel: Record<string, { calls: number; totalLatency: number; totalCost: number }> = {};
  const byProvider: Record<string, { calls: number; totalLatency: number; totalCost: number }> = {};

  for (const t of traces) {
    if (!byModel[t.model]) byModel[t.model] = { calls: 0, totalLatency: 0, totalCost: 0 };
    const m = byModel[t.model]!;
    m.calls++;
    m.totalLatency += t.latency_ms;
    m.totalCost += t.cost_usd;

    if (!byProvider[t.provider]) byProvider[t.provider] = { calls: 0, totalLatency: 0, totalCost: 0 };
    const p = byProvider[t.provider]!;
    p.calls++;
    p.totalLatency += t.latency_ms;
    p.totalCost += t.cost_usd;
  }

  const byModelFormatted: Record<string, { calls: number; avg_latency: number; cost: number }> = {};
  for (const [model, data] of Object.entries(byModel)) {
    byModelFormatted[model] = {
      calls: data.calls,
      avg_latency: Math.round(data.totalLatency / data.calls),
      cost: Math.round(data.totalCost * 10000) / 10000,
    };
  }

  const byProviderFormatted: Record<string, { calls: number; avg_latency: number; cost: number }> = {};
  for (const [provider, data] of Object.entries(byProvider)) {
    byProviderFormatted[provider] = {
      calls: data.calls,
      avg_latency: Math.round(data.totalLatency / data.calls),
      cost: Math.round(data.totalCost * 10000) / 10000,
    };
  }

  return {
    total_calls: traces.length,
    avg_latency_ms: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
    p95_latency_ms: latencies[p95Index] || 0,
    total_tokens: traces.reduce((s, t) => s + t.tokens_in + t.tokens_out, 0),
    total_cost_usd: Math.round(traces.reduce((s, t) => s + t.cost_usd, 0) * 10000) / 10000,
    success_rate: Math.round((successCount / traces.length) * 100),
    by_model: byModelFormatted,
    by_provider: byProviderFormatted,
  };
}

// MET-01 + MET-07: Auto-traced entry (CLI commands, not AI calls)
interface AutoTraceEntry {
  timestamp: string;
  command: string;
  status: string;
  latency_ms: number;
  memory_rss_mb: number;
  memory_heap_used_mb: number;
  error?: string;
  source: 'auto';
}

/**
 * Processa auto trace.
 * @param command - Valor command.
 * @param status - Valor status.
 * @param latencyMs - Valor ms.
 * @param error - Valor error.
 */
export function recordAutoTrace(command: string, status: string, latencyMs: number, error?: string): void {
  try {
    const root = process.cwd();
    const tracesDir = path.join(root, TRACES_DIR);
    const tracesPath = getTracesPath(root);
    fs.mkdirSync(tracesDir, { recursive: true });
    const mem = process.memoryUsage();
    const entry: AutoTraceEntry = {
      timestamp: new Date().toISOString(),
      command,
      status,
      latency_ms: latencyMs,
      memory_rss_mb: Math.round(mem.rss / 1024 / 1024),
      memory_heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
      source: 'auto',
    };
    if (error) entry.error = error;
    fs.appendFileSync(tracesPath, JSON.stringify(entry) + '\n');

    // MET-05: Trigger webhook alert on errors (synchronous https request for exit-hook safety)
    if (status === 'error' || status === 'timeout') {
      try {
        const webhookUrl = process.env.SLACK_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
        if (webhookUrl) {
          const urlObj = new URL(webhookUrl);
          const payload = JSON.stringify({
            title: `CLI command failed: ${command}`,
            message: error || `Command "${command}" finished with status "${status}" after ${latencyMs}ms`,
            severity: status === 'timeout' ? 'warning' : 'error',
            command,
            timestamp: entry.timestamp,
            metadata: { latency_ms: latencyMs, memory_rss_mb: entry.memory_rss_mb },
          });
          const req = https.request({
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload).toString() },
          });
          req.write(payload);
          req.end();
        }
      } catch { /* Silently fail */ }
    }
  } catch {
    // Silently fail — auto-tracing should never break CLI
  }
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function observabilityCommand(): Command {
  const cmd = new Command('observability')
    .description('Observability & Tracing de chamadas de IA');

  cmd
    .command('trace')
    .description('Registra uma chamada de IA no trace log')
    .requiredOption('--model <model>', 'Modelo utilizado (ex: gpt-4, claude-3, qwen2)')
    .requiredOption('--provider <provider>', 'Provedor (ex: openai, anthropic, ollama)')
    .requiredOption('--latency <ms>', 'Latencia em milissegundos')
    .requiredOption('--tokens-in <n>', 'Tokens de entrada')
    .requiredOption('--tokens-out <n>', 'Tokens de saida')
    .option('--cost <usd>', 'Custo em USD', '0')
    .option('--command <cmd>', 'Comando que originou a chamada', 'unknown')
    .option('--status <status>', 'Status (success, error, timeout)', 'success')
    .option('--error <msg>', 'Mensagem de erro se status=error')
    .action((options) => {
      const root = process.cwd();
      ensureDir(root);

      const entry: TraceEntry = {
        timestamp: new Date().toISOString(),
        model: options.model,
        provider: options.provider,
        latency_ms: parseInt(options.latency, 10),
        tokens_in: parseInt(options.tokensIn, 10),
        tokens_out: parseInt(options.tokensOut, 10),
        cost_usd: parseFloat(options.cost),
        command: options.command,
        status: options.status,
        error: options.error,
      };

      getIO().fs.append(getTracesPath(root), JSON.stringify(entry) + '\n');

      printResult('trace', true, `${options.provider}/${options.model} (${options.latency}ms)`);
      finish({
        checkpoint: 'observability_trace',
        ok: true,
        status: 'passed',
        context_summary: `Trace registrado: ${options.provider}/${options.model}`,
        data: entry as Record<string, unknown>,
      });
    });

  cmd
    .command('metrics')
    .description('Calcula metricas agregadas dos traces')
    .option('--save', 'Salva metricas em arquivo JSON', false)
    .action((options) => {
      const root = process.cwd();
      const traces = readTraces(root);
      const metrics = computeMetrics(traces);

      printHeader('Observability Metrics');
      printLine(`Total calls: ${metrics.total_calls}`);
      printLine(`Avg latency: ${metrics.avg_latency_ms}ms`);
      printLine(`P95 latency: ${metrics.p95_latency_ms}ms`);
      printLine(`Total tokens: ${metrics.total_tokens}`);
      printLine(`Total cost: $${metrics.total_cost_usd}`);
      printLine(`Success rate: ${metrics.success_rate}%`);
      printLine('');
      printLine('By Model:');
      for (const [model, data] of Object.entries(metrics.by_model)) {
        printLine(`  ${model}: ${data.calls} calls, ${data.avg_latency}ms avg, $${data.cost}`);
      }
      printLine('');
      printLine('By Provider:');
      for (const [provider, data] of Object.entries(metrics.by_provider)) {
        printLine(`  ${provider}: ${data.calls} calls, ${data.avg_latency}ms avg, $${data.cost}`);
      }

      const isAutoTrace = (t: TraceEntry): t is TraceEntry & AutoTraceEntry =>
        'source' in t && (t as Record<string, unknown>).source === 'auto';
      const autoTraces = traces.filter(isAutoTrace);
      if (autoTraces.length > 0) {
        const memSamples = autoTraces.map((t) => (t.memory_rss_mb as number) || 0).filter((v) => v > 0);
        const heapSamples = autoTraces.map((t) => (t.memory_heap_used_mb as number) || 0).filter((v) => v > 0);
        const avgRss = memSamples.length ? Math.round(memSamples.reduce((a, b) => a + b, 0) / memSamples.length) : 0;
        const avgHeap = heapSamples.length ? Math.round(heapSamples.reduce((a, b) => a + b, 0) / heapSamples.length) : 0;
        printLine('');
        printLine('Memory (CLI commands):');
        printLine(`  Avg RSS: ${avgRss}MB, Avg Heap Used: ${avgHeap}MB (${autoTraces.length} commands)`);
      }

      if (options.save) {
        const metricsPath = getMetricsPath(root);
        getIO().fs.write(metricsPath, JSON.stringify(metrics, null, 2));
        printLine(`\nMetrics saved to ${metricsPath}`);
      }

      finish({
        checkpoint: 'observability_metrics',
        ok: true,
        status: 'passed',
        context_summary: `Metrics: ${metrics.total_calls} calls, $${metrics.total_cost_usd} total cost`,
        data: metrics as Record<string, unknown>,
      });
    });

  cmd
    .command('dashboard')
    .description('Gera dashboard JSON com metricas e ultimos traces')
    .action(() => {
      const root = process.cwd();
      ensureDir(root);
      const traces = readTraces(root);
      const metrics = computeMetrics(traces);
      const recentTraces = traces.slice(-20).reverse();

      const dashboard = {
        generated_at: new Date().toISOString(),
        metrics,
        recent_traces: recentTraces,
      };

      const dashboardPath = path.join(root, TRACES_DIR, 'dashboard.json');
      getIO().fs.write(dashboardPath, JSON.stringify(dashboard, null, 2));

      printHeader('Observability Dashboard');
      printLine(`Generated: ${dashboard.generated_at}`);
      printLine(`Total calls: ${metrics.total_calls}`);
      printLine(`Total cost: $${metrics.total_cost_usd}`);
      printLine(`Dashboard saved to: ${dashboardPath}`);

      finish({
        checkpoint: 'observability_dashboard',
        ok: true,
        status: 'passed',
        context_summary: `Dashboard generated with ${metrics.total_calls} traces`,
        data: { path: dashboardPath, metrics: metrics as Record<string, unknown> },
      });
    });

  cmd
    .command('list')
    .description('Lista os ultimos traces registrados')
    .option('--limit <n>', 'Numero de traces a exibir', '10')
    .action((options) => {
      const root = process.cwd();
      const traces = readTraces(root);
      const limit = parseInt(options.limit, 10);
      const recent = traces.slice(-limit).reverse();

      printHeader(`Recent Traces (last ${recent.length})`);
      for (const t of recent) {
        const icon = t.status === 'success' ? '✅' : t.status === 'error' ? '❌' : '⏱️';
        printLine(`${icon} [${t.timestamp}] ${t.provider}/${t.model} — ${t.latency_ms}ms — $${t.cost_usd}`);
      }
      printLine(`\nTotal traces: ${traces.length}`);

      finish({
        checkpoint: 'observability_list',
        ok: true,
        status: 'passed',
        context_summary: `Listed ${recent.length} traces`,
        data: { total: traces.length, shown: recent.length },
      });
    });

  cmd
    .command('alert')
    .description('Testa webhook alerts (Slack/Discord/Email)')
    .option('--severity <s>', 'Severity: info, warning, error, critical', 'info')
    .option('--message <m>', 'Message to send', 'Test alert from AI-Devkit')
    .action(async (options) => {
      const { sendWebhookAlert, isAlertConfigured } = await import('../utils/alert-webhook');

      if (!isAlertConfigured()) {
        printLine('⚠️  No webhooks configured. Set SLACK_WEBHOOK_URL, DISCORD_WEBHOOK_URL, or SMTP_* env vars.');
        finish({
          checkpoint: 'observability_alert_test',
          ok: false,
          status: 'failed',
          context_summary: 'No webhooks configured',
          data: {},
        });
        return;
      }

      printHeader('Sending test alert');
      const result = await sendWebhookAlert({
        title: 'AI-Devkit Test Alert',
        message: options.message,
        severity: options.severity,
        command: 'observability alert',
        timestamp: new Date().toISOString(),
      });

      printLine(`Slack: ${result.slack ? '✅' : '⏭️'}`);
      printLine(`Discord: ${result.discord ? '✅' : '⏭️'}`);
      printLine(`Email: ${result.email ? '✅' : '⏭️'}`);

      finish({
        checkpoint: 'observability_alert_test',
        ok: result.slack || result.discord || result.email,
        status: result.slack || result.discord || result.email ? 'passed' : 'failed',
        context_summary: `Alert sent: slack=${result.slack} discord=${result.discord} email=${result.email}`,
        data: result as Record<string, unknown>,
      });
    });

  return cmd;
}