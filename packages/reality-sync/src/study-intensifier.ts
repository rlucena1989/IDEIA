import * as fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import * as path from 'node:path';
import { EventEmitter } from 'node:events';

const logger = createLogger('study-intensifier');

export interface StudyGap {
  study: string;
  filePath: string;
  missing: string[];
  currentScore: number;
  targetScore: number;
}

export interface IntensificationPlan {
  id: string;
  gaps: StudyGap[];
  totalGaps: number;
  autoFixable: StudyGap[];
  requiresHuman: StudyGap[];
  generatedAt: number;
}

export interface IntensificationReport {
  timestamp: number;
  scanned: number;
  plansGenerated: number;
  fixesApplied: number;
  fixesFailed: number;
  details: { study: string; action: string; status: string }[];
}

function findEstudosDir(root: string): string {
  const candidates = [
    path.join(root, 'docs', 'ESTUDOS'),
    path.join(root, '..', 'docs', 'ESTUDOS'),
    path.join(root.replace(/\/?ai-devkit-v2\/?$/, ''), 'docs', 'ESTUDOS'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return '';
}

function hasSection(content: string, sectionName: string): boolean {
  const regex = new RegExp(`##\\s*${sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
  return regex.test(content);
}

export class StudyIntensifier extends EventEmitter {
  private workspaceRoot: string;
  private estudosDir: string;
  private verbose: boolean;

  constructor(root: string, verbose = false) {
    super();
    this.workspaceRoot = root;
    this.estudosDir = findEstudosDir(root);
    this.verbose = verbose;
  }

  private log(msg: string): void {
    if (this.verbose) logger.info('[StudyIntensifier] ${msg}');
  }

  scanGaps(): StudyGap[] {
    const results: StudyGap[] = [];
    if (!this.estudosDir) {
      this.log('ESTUDOS directory not found');
      return results;
    }

    const files = fs.readdirSync(this.estudosDir).filter(f => {
      if (!f.endsWith('.md')) return false;
      if (f === 'TEMPLATE-ANALISE-PERMANENTE.md') return false;
      // Filter out non-standard files (sub-studies, summaries)
      if (!f.startsWith('ESTUDO-') && !f.startsWith('PLANO-') && !f.startsWith('MATRIZ-') && !f.startsWith('INTENT-') && !f.startsWith('MEMORIA-') && !f.startsWith('PIPELINE-') && !f.startsWith('SEGURANCA-') && !f.startsWith('TECNOLOGIAS-') && !f.startsWith('THEIA-') && !f.startsWith('ORQUESTRACAO-') && !f.startsWith('BARRAMENTO-') && !f.startsWith('VISAO-') && !f.startsWith('IDEIA-') && !f.startsWith('TEMPLATE-'))
        return false;
      return true;
    });
    this.log(`Scanning ${files.length} studies for gaps...`);

    for (const file of files) {
      const filePath = path.join(this.estudosDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const missing: string[] = [];

      if (!hasSection(content, 'Riscos') && !hasSection(content, 'Risco') && !/risco|risk|perigo|vulnerab|threat/i.test(content))
        missing.push('riscos');
      if (!/métric|metric|indicador|kpi|sla|slo|benchmark|desempenho/i.test(content))
        missing.push('métricas');
      if (!/timeline|cronograma|prazo|fase |phase |sprint|etapa|roadmap/i.test(content))
        missing.push('timeline');
      if (!/TASK-IDEIA|Tarefas? Geradas|Tasks? Geradas/i.test(content))
        missing.push('tasks');
      if (!/ADR-\d{3}|## Decision/i.test(content))
        missing.push('adr');
      if (!/teste|test|jest|playwright|verify|valida[cç]ão/i.test(content))
        missing.push('testes');

      if (missing.length > 0) {
        const currentScore = 5 - missing.length;
        results.push({
          study: file.replace('.md', ''),
          filePath,
          missing,
          currentScore: Math.max(1, currentScore),
          targetScore: 5,
        });
      }
    }

    results.sort((a, b) => a.currentScore - b.currentScore);
    return results;
  }

  generatePlan(gaps: StudyGap[]): IntensificationPlan {
    const autoFixable: StudyGap[] = [];
    const requiresHuman: StudyGap[] = [];

    for (const gap of gaps) {
      const onlyFormatting = gap.missing.every(m =>
        ['tasks', 'adr', 'testes'].includes(m)
      );
      if (onlyFormatting || gap.missing.length <= 2) {
        autoFixable.push(gap);
      } else {
        requiresHuman.push(gap);
      }
    }

    return {
      id: `intensify_${Date.now()}`,
      gaps,
      totalGaps: gaps.length,
      autoFixable,
      requiresHuman,
      generatedAt: Date.now(),
    };
  }

  private appendSection(filePath: string, sectionName: string, content: string): boolean {
    try {
      const original = fs.readFileSync(filePath, 'utf-8');
      if (original.includes(`## ${sectionName}`)) return false;

      const appendix = `\n\n## ${sectionName}\n\n${content}\n`;
      fs.writeFileSync(filePath, original + appendix, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  applyAutoFix(gap: StudyGap): boolean {
    const _studyName = gap.study.replace(/^ESTUDO-/, '').replace(/-/g, ' ');
    let sectionContent = '';

    if (gap.missing.includes('tasks')) {
      sectionContent += `### Tasks Geradas\n\n`;
      sectionContent += `| Task | Descrição | Esforço |\n`;
      sectionContent += `|------|-----------|---------|\n`;
      sectionContent += `| AUTO-${gap.study.substring(0, 10)}-01 | Implementar conceitos deste estudo | 2 sem |\n`;
      sectionContent += `| AUTO-${gap.study.substring(0, 10)}-02 | Validar resultados com testes | 1 sem |\n\n`;
    }

    if (gap.missing.includes('adr')) {
      sectionContent += `### ADRs Relacionados\n\n`;
      sectionContent += `- ADR-011 a ADR-016: Decisões arquiteturais relevantes\n`;
      sectionContent += `- Verificar aderência aos contratos C1-C18 (T1 - Topologia de Integração)\n\n`;
    }

    if (gap.missing.includes('testes')) {
      sectionContent += `### Plano de Testes\n\n`;
      sectionContent += `| Tipo | Escopo | Ferramenta |\n`;
      sectionContent += `|------|--------|-----------|\n`;
      sectionContent += `| Unitário | Funções core do estudo | Jest |\n`;
      sectionContent += `| Integração | Conexões com outros sistemas | Pact |\n`;
      sectionContent += `| E2E | Fluxo completo | Playwright |\n\n`;
    }

    if (gap.missing.includes('riscos')) {
      sectionContent += `### Riscos\n\n`;
      sectionContent += `| Risco | Probabilidade | Impacto | Mitigação |\n`;
      sectionContent += `|------|:------------:|:-------:|-----------|\n`;
      sectionContent += `| Risco técnico de implementação | Média | Alto | Prova de conceito antes de implementar |\n`;
      sectionContent += `| Risco de integração | Baixa | Médio | Testes de contrato entre módulos |\n\n`;
    }

    if (gap.missing.includes('métricas')) {
      sectionContent += `### Métricas de Sucesso\n\n`;
      sectionContent += `| Métrica | Alvo | Ferramenta |\n`;
      sectionContent += `|--------|------|-----------|\n`;
      sectionContent += `| Cobertura de requisitos | > 80% | Testes |\n`;
      sectionContent += `| Performance | P95 < 500ms | k6 |\n\n`;
    }

    if (gap.missing.includes('timeline')) {
      sectionContent += `### Timeline\n\n`;
      sectionContent += `| Fase | Duração | Entregas |\n`;
      sectionContent += `|------|---------|----------|\n`;
      sectionContent += `| Pesquisa | 1 sem | Prova de conceito |\n`;
      sectionContent += `| Implementação | 2-3 sem | Feature completa |\n`;
      sectionContent += `| Validação | 1 sem | Testes + documentação |\n\n`;
    }

    if (sectionContent) {
      return this.appendSection(gap.filePath, 'Intensificação Automática', sectionContent);
    }
    return false;
  }

  generateAIScript(plan: IntensificationPlan, outputPath: string): string {
    const script = `#!/usr/bin/env node
/**
 * Auto-generated by IDEIA StudyIntensifier
 * Generated: ${new Date().toISOString()}
 * Purpose: Guide AI agent to intensify studies with gaps
 */
const studies = ${JSON.stringify(plan.gaps.map(g => ({
    name: g.study,
    missing: g.missing,
    currentScore: g.currentScore,
    targetScore: g.targetScore,
    autoFixable: plan.autoFixable.some(a => a.study === g.study)
})), null, 2)};

logger.info('=== IDEIA Study Intensifier Helper ===');
logger.info('Total studies needing improvement: ' + studies.length);
logger.info('');

for (const s of studies) {
  logger.info('Study: ' + s.name);
  logger.info('  Score: ' + s.currentScore + '/5 → ' + s.targetScore + '/5');
  logger.info('  Missing: ' + s.missing.join(', '));
  logger.info('  Auto-fixable: ' + (s.autoFixable ? 'YES' : 'NO (requires human)'));
  if (s.autoFixable) {
    logger.info('  Command: ai-devkit reality-sync intensify');
  }
  logger.info('');
}

const fixable = studies.filter(s => s.autoFixable).length;
logger.info(fixable + ' studies can be auto-fixed via "ai-devkit reality-sync intensify"');
const human = studies.filter(s => !s.autoFixable).length;
logger.info(human + ' studies require human intervention');
`;
    try {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(outputPath, script, 'utf-8');
      return outputPath;
    } catch {
      return '';
    }
  }

  runCycle(): IntensificationReport {
    this.log('Starting auto-intensification cycle');
    const details: IntensificationReport['details'] = [];

    const gaps = this.scanGaps();
    this.log(`Found ${gaps.length} studies with gaps`);

    if (gaps.length === 0) {
      this.log('All studies are complete. No intensification needed.');
      return { timestamp: Date.now(), scanned: 0, plansGenerated: 0, fixesApplied: 0, fixesFailed: 0, details: [] };
    }

    const plan = this.generatePlan(gaps);
    this.log(`Plan: ${plan.autoFixable.length} auto-fixable, ${plan.requiresHuman.length} require human`);

    let fixesApplied = 0;
    let fixesFailed = 0;

    for (const gap of plan.autoFixable) {
      const success = this.applyAutoFix(gap);
      if (success) {
        fixesApplied++;
        details.push({ study: gap.study, action: `auto-fix: ${gap.missing.join(', ')}`, status: 'fixed' });
        this.log(`Auto-fixed ${gap.study}: ${gap.missing.join(', ')}`);
      } else {
        fixesFailed++;
        details.push({ study: gap.study, action: `auto-fix: ${gap.missing.join(', ')}`, status: 'failed' });
        this.log(`Failed to fix ${gap.study}`);
      }
    }

    for (const gap of plan.requiresHuman) {
      details.push({ study: gap.study, action: `requires human: ${gap.missing.join(', ')}`, status: 'skipped' });
    }

    this.emit('intensify:complete', { plan, details, timestamp: Date.now() });

    return {
      timestamp: Date.now(),
      scanned: gaps.length,
      plansGenerated: 1,
      fixesApplied,
      fixesFailed,
      details,
    };
  }

  private intensificationHistory: IntensificationReport[] = [];
  private autoIntensifyTimer: ReturnType<typeof setInterval> | null = null;

  startAutoIntensify(intervalMs: number = 60 * 60 * 1000): void {
    if (this.autoIntensifyTimer) {
      this.log('Auto-intensify already running');
      return;
    }

    this.log(`Starting auto-intensify every ${Math.round(intervalMs / 60000)}min`);

    const runCycle = () => {
      try {
        const report = this.runCycle();
        this.intensificationHistory.push(report);
        if (this.intensificationHistory.length > 50) this.intensificationHistory.shift();

        if (report.fixesApplied > 0) {
          this.log(`Auto-intensify: ${report.fixesApplied} fixes applied`);
          this.emit('intensify:auto', { report, timestamp: Date.now() });
        }
      } catch (_err) {
        this.log(`Auto-intensify error: ${_err instanceof Error ? _err.message : String(_err)}`);
      }
    };

    runCycle();
    this.autoIntensifyTimer = setInterval(runCycle, intervalMs);
  }

  stopAutoIntensify(): void {
    if (this.autoIntensifyTimer) {
      clearInterval(this.autoIntensifyTimer);
      this.autoIntensifyTimer = null;
      this.log('Auto-intensify stopped');
    }
  }

  getIntensificationHistory(): IntensificationReport[] {
    return [...this.intensificationHistory];
  }

  rollbackLastIntensification(): { rolledBack: boolean; restoredFiles: string[]; errors: string[] } {
    const lastReport = this.intensificationHistory[this.intensificationHistory.length - 1];
    if (!lastReport || lastReport.fixesApplied === 0) {
      return { rolledBack: false, restoredFiles: [], errors: ['No intensification history to rollback'] };
    }

    const restoredFiles: string[] = [];
    const errors: string[] = [];

    for (const detail of lastReport.details) {
      if (detail.status === 'fixed' && detail.action.startsWith('auto-fix:')) {
        try {
          const content = fs.readFileSync(detail.study, 'utf-8');
          const lines = content.split('\n');
          const sectionStart = lines.findIndex(l => l.includes('## Intensificação Automática'));
          if (sectionStart >= 0) {
            const newLines = lines.slice(0, sectionStart).filter(l => l.trim() !== '');
            fs.writeFileSync(detail.study, newLines.join('\n') + '\n', 'utf-8');
            restoredFiles.push(detail.study);
            this.log(`Rolled back auto-fix on ${detail.study}`);
          }
        } catch (_err) {
          errors.push(`Failed to rollback ${detail.study}: ${_err instanceof Error ? _err.message : String(_err)}`);
        }
      }
    }

    this.intensificationHistory.pop();

    this.emit('intensify:rollback', {
      rolledBackFiles: restoredFiles,
      errors,
      timestamp: Date.now(),
    });

    return { rolledBack: restoredFiles.length > 0, restoredFiles, errors };
  }

  isAutoIntensifying(): boolean {
    return this.autoIntensifyTimer !== null;
  }
}
