import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import { queryOllama } from './ollama';
import { loadConfig } from './config';
import { getRouteFor } from './routing';

/** Interface que define a estrutura de violation info. */
export interface ViolationInfo {
  id: string;
  rule: string;
  file: string;
  severity: string;
  message: string;
}

function findViolationById(root: string, violationId: string): ViolationInfo | null {
  if (!root) return null;
  const reportsDir = path.join(root, '.ai/reports');
  if (!fs.existsSync(reportsDir)) return null;

  const files = (fs.readdirSync(reportsDir, { recursive: true }) as string[])
    .filter((f) => f.endsWith('.json') || f.endsWith('.jsonl'))
    .map((f) => path.join(reportsDir, f));

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n').filter(Boolean);
      for (const line of lines) {
        const data = JSON.parse(line);
        const findings = data.findings || data.results || (Array.isArray(data) ? data : [data]);
        for (const finding of Array.isArray(findings) ? findings : [findings]) {
          if (finding.id === violationId || finding.code === violationId) {
            return {
              id: finding.id || finding.code,
              rule: finding.rule || finding.message || '',
              file: finding.file || '',
              severity: finding.severity || 'medium',
              message: finding.message || finding.description || '',
            };
          }
        }
      }
    } catch { }
  }

  return null;
}

/**
 * Processa violation.
 * @param root - Valor root.
 * @param violationId - Valor id.
 * @returns Promessa resolvida com o resultado da operação.
 */
export async function explainViolation(
  root: string,
  violationId: string
): Promise<string> {
  if (!root) return '';
  const violation = findViolationById(root, violationId);
  const config = loadConfig(root);
  const route = getRouteFor('explain_violation', root);
  const routeConfig = route && 'model' in route ? route as { model: string; timeout_secs: number } : null;

  const context = violation
    ? `Violacao: "${violation.message}"
Regra: "${violation.rule}"
Arquivo: "${violation.file}"
Severidade: "${violation.severity}"`
    : `Violacao ID: ${violationId}`;

  const prompt = `Explique a violacao de governanca abaixo e sugira como corrigir.
Formato: O que violou | Por que violou | Como corrigir

${context}`;

  try {
    return await queryOllama(
      prompt,
      routeConfig?.model || config.default_model,
      root,
      'explain_violation',
      (routeConfig?.timeout_secs || config.timeout_secs) * 1000
    );
  } catch {
    return `Violacao ${violationId}: ${violation ? violation.message : 'Nao encontrada'}

[Sugestao offline] Revise a regra e o arquivo mencionado para entender a violacao.`;
  }
}

/**
 * Processa context.
 * @param root - Valor root.
 * @param contextFile - Valor file.
 * @returns Promessa resolvida com o resultado da operação.
 */
export async function suggestContext(
  root: string,
  contextFile: string
): Promise<string> {
  if (!root) return '';
  const config = loadConfig(root);
  const route = getRouteFor('suggest_context', root);
  const routeConfig = route && 'model' in route ? route as { model: string; timeout_secs: number } : null;

  const fullPath = path.resolve(contextFile);
  if (!fs.existsSync(fullPath)) {
    return `Arquivo ${contextFile} nao encontrado.`;
  }

  const content = fs.readFileSync(fullPath, 'utf8').slice(0, 3000);

  const prompt = `Com base no contexto abaixo, sugira quais arquivos ou documentos adicionais
seriam uteis para entender melhor este contexto. Liste apenas os nomes e uma breve justificativa.

${content}`;

  try {
    return await queryOllama(
      prompt,
      routeConfig?.model || config.default_model,
      root,
      'suggest_context',
      (routeConfig?.timeout_secs || config.timeout_secs) * 1000
    );
  } catch {
    return `Contexto: ${path.basename(contextFile)}

[Sugestao offline] Consulte os arquivos em .ai/ e CLAUDE.md para contexto adicional.`;
  }
}

/**
 * Processa violations.
 * @param root - Valor root.
 * @returns Promessa resolvida com o resultado da operação.
 */
export async function prioritizeViolations(root: string): Promise<string> {
  if (!root) return '';
  const reportsDir = path.join(root, '.ai/reports');
  const violations: ViolationInfo[] = [];

  if (fs.existsSync(reportsDir)) {
    const files = (fs.readdirSync(reportsDir, { recursive: true }) as string[])
      .filter((f) => f.endsWith('.json') || f.endsWith('.jsonl'))
      .map((f) => path.join(reportsDir, f));

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n').filter(Boolean);
        for (const line of lines) {
          const data = JSON.parse(line);
          const findings = data.findings || data.results || (Array.isArray(data) ? data : [data]);
          for (const f of Array.isArray(findings) ? findings : [findings]) {
            if (f.severity || f.message) {
              violations.push({
                id: f.id || f.code || 'unknown',
                rule: f.rule || f.message || '',
                file: f.file || '',
                severity: f.severity || 'medium',
                message: f.message || f.description || '',
              });
            }
          }
        }
      } catch { }
    }
  }

  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  violations.sort((a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99));

  const critical = violations.filter(v => v.severity === 'critical');
  const high = violations.filter(v => v.severity === 'high');
  const medium = violations.filter(v => v.severity === 'medium');

  let result = `Violacoes encontradas: ${violations.length}\n\n`;

  if (critical.length > 0) {
    result += `## Criticas (${critical.length})\n`;
    critical.forEach(v => { result += `- ${v.id}: ${v.message.slice(0, 100)} (${v.file})\n`; });
    result += '\n';
  }
  if (high.length > 0) {
    result += `## Altas (${high.length})\n`;
    high.forEach(v => { result += `- ${v.id}: ${v.message.slice(0, 100)} (${v.file})\n`; });
    result += '\n';
  }
  if (medium.length > 0) {
    result += `## Medias (${medium.length})\n`;
    medium.slice(0, 5).forEach(v => { result += `- ${v.id}: ${v.message.slice(0, 80)} (${v.file})\n`; });
    if (medium.length > 5) result += `  ... e mais ${medium.length - 5}\n`;
  }

  result += `\nRecomendacao: Resolva primeiro as violacoes criticas e altas.`;
  return result;
}
