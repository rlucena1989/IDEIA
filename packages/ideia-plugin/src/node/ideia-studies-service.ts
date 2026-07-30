import { injectable, inject } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
import { EventBus } from '@ideia/event-bus';
import { IDEIA_STUDIES_SERVICE, IDEIA_StudiesService, StudyItem } from '../common/ideia-protocol';
import * as fs from 'fs';
import * as path from 'path';

@injectable()
export class IDEIA_StudiesBackendService implements IDEIA_StudiesService {
  constructor(
    @inject(EventBus) private eventBus: EventBus,
  ) {}

  async getStudies(): Promise<StudyItem[]> {
    const studies: StudyItem[] = [];
    const studiesDir = path.resolve(__dirname, '..', '..', '..', '..', 'docs', 'ESTUDOS');
    if (fs.existsSync(studiesDir)) {
      const files = fs.readdirSync(studiesDir).filter(f => f.endsWith('.md') && !f.startsWith('TEMPLATE'));
      for (const file of files) {
        const filePath = path.join(studiesDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const name = content.split('\n')[0]?.replace(/^#\s*/, '').trim() || file.replace('.md', '');
        const lines = content.split('\n');
        const hasRiscos = content.includes('Riscos Detalhados');
        const hasMetricas = content.includes('Métricas de Sucesso');
        const hasTimeline = content.includes('Timeline');
        const hasTestes = content.includes('Plano de Testes');
        const score = hasRiscos && hasMetricas && hasTimeline && hasTestes ? 5
          : hasRiscos && hasMetricas ? 4
          : content.includes('##') ? 3 : 2;
        studies.push({
          id: file.replace('.md', ''),
          name,
          status: score >= 4 ? 'completed' : 'active',
          description: lines[2]?.trim() || `Score ${score}/5 — ${file}`,
        });
      }
    }

    const history = await this.eventBus.getHistory();
    const activeStudies = history.filter((e: any) => e.type.startsWith('study.'));
    for (const event of activeStudies) {
      const p = event.payload as Record<string, string> | undefined;
      if (p?.studyId && !studies.find(s => s.id === p.studyId)) {
        studies.push({
          id: p.studyId,
          name: p.name || p.studyId,
          status: 'active',
          description: p.description || '',
        });
      }
    }

    studies.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return studies;
  }
}
