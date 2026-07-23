import { injectable, inject } from '@theia/core/shared/inversify';
import { EventBus } from '@ideia/event-bus';
import { IDEIA_SUGGESTIONS_SERVICE, IDEIA_SuggestionsService, SuggestionItem } from '../common/ideia-protocol';
import * as fs from 'fs';
import * as path from 'path';

interface StudyMeta {
  score: number;
  missing: string[];
}

@injectable()
export class IDEIA_SuggestionsBackendService implements IDEIA_SuggestionsService {
  private dismissedIds = new Set<string>();

  constructor(
    @inject(EventBus) private eventBus: EventBus,
  ) {}

  async getSuggestions(): Promise<SuggestionItem[]> {
    const suggestions: SuggestionItem[] = [];
    const history = await this.eventBus.getHistory();
    const studiesDir = path.resolve(__dirname, '..', '..', '..', '..', 'docs', 'ESTUDOS');

    const securityEvents = history.filter(e => e.type.includes('security') || e.type.includes('policy'));
    const perfEvents = history.filter(e => e.type.includes('performance') || e.type.includes('benchmark'));
    const studyFiles = fs.existsSync(studiesDir)
      ? fs.readdirSync(studiesDir).filter(f => f.endsWith('.md') && !f.startsWith('TEMPLATE'))
      : [];

    if (securityEvents.length > 0) {
      suggestions.push({
        id: 'sg-security-1', category: 'Security', priority: 'High',
        title: `${securityEvents.length} security events detected — review policy`,
        effort: '2h',
      });
    }
    suggestions.push({
      id: 'sg-security-2', category: 'Security', priority: 'Medium',
      title: 'Run automated pentest to validate security posture',
      effort: '1h',
    });

    if (perfEvents.length > 0) {
      suggestions.push({
        id: 'sg-perf-1', category: 'Performance', priority: 'Medium',
        title: `${perfEvents.length} performance metrics collected — consider optimization`,
        effort: '4h',
      });
    }
    suggestions.push({
      id: 'sg-perf-2', category: 'Performance', priority: 'Low',
      title: 'Run k6 load tests to establish baseline benchmarks',
      effort: '2h',
    });

    const lowScoreStudies = this.scanStudyScores(studiesDir, studyFiles);
    if (lowScoreStudies.length > 0) {
      for (const s of lowScoreStudies.slice(0, 3)) {
        suggestions.push({
          id: `sg-feat-${s.name}`, category: 'Features', priority: 'Medium',
          title: `${s.name}: ${s.missing.length} sections need improvement (score ${s.score}/5)`,
          effort: '2h',
        });
      }
    }

    const historyEvents = history.length;
    if (historyEvents > 0) {
      suggestions.push({
        id: 'sg-quality-1', category: 'Quality', priority: 'Low',
        title: `Audit trail has ${historyEvents} events — review for anomalies`,
        effort: '1h',
      });
    }

    const coverageFile = path.resolve(__dirname, '..', '..', '..', '..', 'coverage', 'coverage-summary.json');
    if (fs.existsSync(coverageFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(coverageFile, 'utf-8'));
        const total = data.total?.lines?.pct;
        if (total !== undefined && total < 80) {
          suggestions.push({
            id: 'sg-quality-2', category: 'Quality', priority: 'High',
            title: `Code coverage at ${total}% — target is 80%, add tests for uncovered files`,
            effort: `${Math.round((80 - total) / 5)}h`,
          });
        }
      } catch { /* ignore */ }
    }

    return suggestions.filter(s => !this.dismissedIds.has(s.id));
  }

  async dismissSuggestion(id: string): Promise<void> {
    this.dismissedIds.add(id);
    this.eventBus.emit({ type: 'suggestion.dismissed', source: 'ideia-suggestions', payload: { id } })
      .catch(() => {});
  }

  async applySuggestion(id: string): Promise<void> {
    this.dismissedIds.add(id);
    this.eventBus.emit({ type: 'suggestion.applied', source: 'ideia-suggestions', payload: { id } })
      .catch(() => {});
  }

  private scanStudyScores(dir: string, files: string[]): StudyMeta[] {
    const result: StudyMeta[] = [];
    for (const file of files) {
      const filePath = path.join(dir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const sections = ['Riscos Detalhados', 'Métricas de Sucesso', 'Timeline', 'Plano de Testes', 'Conexões com Estudos'];
        const missing = sections.filter(s => !content.includes(s));
        const hasTasks = content.includes('TASK-') || content.includes('Task');
        if (!hasTasks) missing.push('Tasks');
        const score = Math.max(1, 5 - missing.length);
        if (score < 4) {
          result.push({ score, missing: missing.slice(0, 3), name: file.replace('.md', '') });
        }
      } catch { /* ignore */ }
    }
    return result;
  }
}
