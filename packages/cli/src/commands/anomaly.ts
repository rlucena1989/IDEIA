import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import { printLine, printResult } from "../utils/output";
import { getIO } from '../io';

interface AnomalyResult {
  value: number;
  zScore: number;
  isAnomaly: boolean;
  severity: 'none' | 'low' | 'medium' | 'high';
}

function detectAnomalies(values: number[], threshold = 2.5): AnomalyResult[] {
  const m = values.reduce((a, b) => a + b, 0) / values.length;
  const s = Math.sqrt(values.reduce((sq, v) => sq + (v - m) ** 2, 0) / values.length);
  if (s === 0) return values.map(v => ({ value: v, zScore: 0, isAnomaly: false, severity: 'none' }));
  return values.map(v => {
    const z = Math.abs(v - m) / s;
    let severity: AnomalyResult['severity'] = 'none';
    if (z > threshold * 2) severity = 'high';
    else if (z > threshold * 1.5) severity = 'medium';
    else if (z > threshold) severity = 'low';
    return { value: v, zScore: Math.round(z * 100) / 100, isAnomaly: z > threshold, severity };
  });
}

function detectTrend(values: number[]): 'up' | 'down' | 'stable' {
  if (values.length < 3) return 'stable';
  const half = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, half).reduce((a, b) => a + b, 0) / half;
  const secondHalf = values.slice(half).reduce((a, b) => a + b, 0) / (values.length - half);
  const diff = secondHalf - firstHalf;
  const threshold = (values.reduce((a, b) => a + b, 0) / values.length) * 0.05;
  if (diff > threshold) return 'up';
  if (diff < -threshold) return 'down';
  return 'stable';
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function anomalyCommand(): Command {
  const cmd = new Command('anomaly')
    .description('Detecção de anomalias e tendências em séries numéricas');

  cmd
    .command('detect')
    .description('Detecta anomalias em uma lista de valores numéricos (Z-score)')
    .argument('<values...>', 'Valores numéricos (ex: 10 20 30 100 25)')
    .option('-t, --threshold <n>', 'Limiar Z-score (default: 2.5)', '2.5')
    .option('--json', 'Saída em JSON')
    .action((values: string[], options: { threshold: string; json?: boolean }) => {
      const nums = values.map(Number).filter(n => !isNaN(n));
      if (nums.length < 3) {
        printResult('Erro', false, 'Forneça ao menos 3 valores numéricos');
        return;
      }
      const results = detectAnomalies(nums, parseFloat(options.threshold));
      const anomalies = results.filter(r => r.isAnomaly);
      const t = detectTrend(nums);

      if (options.json) {
        printLine(JSON.stringify({ values: nums, results, trend: t, anomaliesCount: anomalies.length }, null, 2));
        return;
      }

      printLine(`Valores: [${nums.join(', ')}]`);
      printLine(`Tendência: ${t}`);
      printLine(`Anomalias encontradas: ${anomalies.length}/${nums.length}`);
      for (const r of results) {
        const icon = r.isAnomaly ? '⚠️' : '✓';
        printLine(`  ${icon} ${r.value} (z=${r.zScore}, severidade: ${r.severity})`);
      }
    });

  cmd
    .command('trend')
    .description('Detecta tendência em série temporal')
    .argument('<values...>', 'Valores ordenados por tempo')
    .option('--json', 'Saída em JSON')
    .action((values: string[], options: { json?: boolean }) => {
      const nums = values.map(Number).filter(n => !isNaN(n));
      if (nums.length < 2) {
        printResult('Erro', false, 'Forneça ao menos 2 valores');
        return;
      }
      const t = detectTrend(nums);
      if (options.json) {
        printLine(JSON.stringify({ values: nums, trend: t }));
        return;
      }
      printLine(`Tendência: ${t} (${nums.length} pontos)`);
    });

  cmd
    .command('scan')
    .description('Escaneia arquivo de métricas (JSONL) por anomalias')
    .argument('<file>', 'Caminho do arquivo .jsonl com campo "value" ou "metrics"')
    .option('-f, --field <field>', 'Campo numérico a analisar', 'value')
    .option('-t, --threshold <n>', 'Limiar Z-score', '2.5')
    .option('--json', 'Saída em JSON')
    .action((file: string, options: { field: string; threshold: string; json?: boolean }) => {
      const filePath = path.resolve(file);
      if (!getIO().fs.exists(filePath)) {
        printResult('Erro', false, `Arquivo não encontrado: ${filePath}`);
        return;
      }

      const lines = getIO().fs.read(filePath, 'utf8').split('\n').filter(Boolean);
      const values: number[] = [];
      const entries: Record<string, unknown>[] = [];

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          entries.push(entry);
          const val = entry[options.field] ?? entry.metrics?.[options.field] ?? null;
          if (typeof val === 'number') values.push(val);
        } catch { /* skip malformed lines */ }
      }

      if (values.length < 3) {
        printResult('Erro', false, `Apenas ${values.length} valores válidos encontrados no campo "${options.field}" (mínimo 3)`);
        return;
      }

      const results = detectAnomalies(values, parseFloat(options.threshold));
      const anomalies = results.filter(r => r.isAnomaly);
      const t = detectTrend(values);

      if (options.json) {
        printLine(JSON.stringify({ file: filePath, totalEntries: entries.length, validValues: values.length, results, trend: t, anomaliesCount: anomalies.length }, null, 2));
        return;
      }

      printLine(`Arquivo: ${filePath}`);
      printLine(`Entradas: ${entries.length}, Valores extraídos: ${values.length}`);
      printLine(`Tendência: ${t}`);
      printLine(`Anomalias: ${anomalies.length}/${values.length}`);
      for (const r of results) {
        if (r.isAnomaly) {
          printLine(`  ⚠️ ${r.value} (z=${r.zScore}, severidade: ${r.severity})`);
        }
      }
    });

  return cmd;
}