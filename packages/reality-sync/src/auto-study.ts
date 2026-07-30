import * as fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import * as path from 'node:path';

export interface AutoStudyInput {
  title: string;
  topic: string;
  technologies: string[];
}

export interface AutoStudyDraft {
  title: string;
  topic: string;
  technologies: string[];
  summary: string;
  sections: StudySection[];
  viabilityScore: number;
  generatedAt: string;
}

export interface StudySection {
  title: string;
  content: string;
}

export interface ViabilityScore {
  technology: string;
  overall: number;
  dimensions: {
    value: number;
    differentiation: number;
    synergy: number;
    costBenefit: number;
    maturity: number;
  };
  recommendation: 'FAZER' | 'AGENDAR' | 'INVESTIGAR' | 'NAO_FAZER';
}

export class AutoStudyGenerator {
  private workspaceRoot: string;
  private estudosDir: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.estudosDir = path.join(workspaceRoot, 'docs', 'ESTUDOS');
  }

  async generateStudy(title: string, topic: string, technologies: string[]): Promise<AutoStudyDraft> {
    const techResearch = await Promise.all(
      technologies.map(tech => this.researchTechnology(tech))
    );

    const summary = `Estudo de viabilidade sobre ${topic}, analisando ${technologies.join(', ')}. ` +
      `Gera recomendações baseadas em ${techResearch.length} fontes de pesquisa.`;

    const sections: StudySection[] = [
      {
        title: 'Resumo Executivo',
        content: `## Resumo Executivo\n\n` +
          `**Tema:** ${topic}\n` +
          `**Tecnologias Analisadas:** ${technologies.join(', ')}\n` +
          `**Status:** ${this.getOverallRecommendation(techResearch)}\n\n` +
          `Este estudo avalia a viabilidade de ${topic} no contexto da plataforma IDEIA. ` +
          `Foram analisados ${technologies.length} tecnologias em 5 dimensões ponderadas.\n`,
      },
      {
        title: 'Análise de Tecnologias',
        content: this.generateTechAnalysis(techResearch),
      },
      {
        title: 'Matriz de Viabilidade',
        content: this.generateViabilityMatrix(techResearch),
      },
      {
        title: 'Riscos e Limitações',
        content: this.generateRiskSection(topic, technologies),
      },
      {
        title: 'Recomendação',
        content: this.generateRecommendation(techResearch),
      },
    ];

    const scores = techResearch.filter((t): t is ViabilityScore => t !== null);
    const viabilityScore = scores.length > 0
      ? Math.round((scores.reduce((sum, s) => sum + s.overall, 0) / scores.length) * 10) / 10
      : 0;

    return {
      title,
      topic,
      technologies,
      summary,
      sections,
      viabilityScore,
      generatedAt: new Date().toISOString(),
    };
  }

  async researchTechnology(name: string): Promise<ViabilityScore | null> {
    const name_lower = name.toLowerCase();

    let valueScore = 3;
    let differentiationScore = 3;
    let synergyScore = 3;
    let costBenefitScore = 3;
    let maturityScore = 3;

    const highValue = ['react', 'typescript', 'python', 'rust', 'nats', 'postgresql', 'redis', 'duckdb'];
    if (highValue.some(t => name_lower.includes(t))) valueScore = 4;

    const highDiff = ['zig', 'mojo', 'roc', 'lua', 'gleam', 'unison'];
    if (highDiff.some(t => name_lower.includes(t))) differentiationScore = 4;

    const highSynergy = ['react', 'vue', 'typescript', 'node', 'nats', 'langchain'];
    if (highSynergy.some(t => name_lower.includes(t))) synergyScore = 4;

    const mature = ['react', 'vue', 'angular', 'typescript', 'python', 'rust', 'postgresql', 'redis'];
    if (mature.some(t => name_lower.includes(t))) maturityScore = 5;

    const inexpensive = ['sqlite', 'duckdb', 'rust', 'zig', 'typescript'];
    if (inexpensive.some(t => name_lower.includes(t))) costBenefitScore = 4;

    const dimensions = {
      value: valueScore,
      differentiation: differentiationScore,
      synergy: synergyScore,
      costBenefit: costBenefitScore,
      maturity: maturityScore,
    };

    const overall = Math.round((
      valueScore * 3 + differentiationScore * 2 + synergyScore * 2 + costBenefitScore * 2 + maturityScore * 1
    ) / 10 * 10) / 10;

    let recommendation: ViabilityScore['recommendation'] = 'INVESTIGAR';
    if (overall >= 3.5) recommendation = 'FAZER';
    else if (overall >= 2.5) recommendation = 'AGENDAR';
    else if (overall < 2) recommendation = 'NAO_FAZER';

    return { technology: name, overall, dimensions, recommendation };
  }

  async createStudyDocument(study: AutoStudyDraft): Promise<string> {
    if (!fs.existsSync(this.estudosDir)) {
      fs.mkdirSync(this.estudosDir, { recursive: true });
    }

    const fileName = `ESTUDO-AUTO-${study.title.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().slice(0, 40)}.md`;
    const filePath = path.join(this.estudosDir, fileName);

    const content = `# ${study.title}\n\n` +
      `> **Estudo gerado automaticamente pelo AutoStudyGenerator**\n` +
      `> Gerado em: ${study.generatedAt}\n` +
      `> Score de Viabilidade: ${study.viabilityScore}/5\n\n` +
      `---\n\n` +
      `## Resumo Executivo\n\n${study.summary}\n\n` +
      study.sections.map(s => s.content).join('\n\n---\n\n') +
      `\n\n---\n\n` +
      `## Tasks Geradas\n\n` +
      `| Task | Descrição | Esforço |\n` +
      `|------|-----------|---------|\n` +
      `| AUTO-${study.title.slice(0, 10).toUpperCase()}-01 | Implementar ${study.topic} | 3 sem |\n` +
      `| AUTO-${study.title.slice(0, 10).toUpperCase()}-02 | Validar integração | 1 sem |\n\n` +
      `---\n\n` +
      `## ADRs Relacionados\n\n` +
      `- Decisões arquiteturais documentadas em docs/adr/\n` +
      `- Verificar aderência aos contratos existentes\n`;

    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  estimateViability(technology: string): ViabilityScore {
    return this.researchTechnology(technology) as unknown as ViabilityScore;
  }

  private getOverallRecommendation(scores: Array<ViabilityScore | null>): string {
    const valid = scores.filter((s): s is ViabilityScore => s !== null);
    if (valid.length === 0) return 'EM ANÁLISE';
    const avg = valid.reduce((s, v) => s + v.overall, 0) / valid.length;
    if (avg >= 3.5) return '✅ RECOMENDADO';
    if (avg >= 2.5) return '⏳ AGENDAR';
    return '🔍 INVESTIGAR';
  }

  private generateTechAnalysis(scores: Array<ViabilityScore | null>): string {
    let content = '## Análise de Tecnologias\n\n';
    content += '| Tecnologia | Score | Valor | Diferenciação | Sinergia | Custo-Benefício | Maturidade |\n';
    content += '|------------|:----:|:----:|:-------------:|:--------:|:---------------:|:----------:|\n';

    for (const score of scores) {
      if (!score) continue;
      content += `| ${score.technology} | ${score.overall} | ${score.dimensions.value} | ${score.dimensions.differentiation} | ${score.dimensions.synergy} | ${score.dimensions.costBenefit} | ${score.dimensions.maturity} |\n`;
    }
    content += `\n**Metodologia:** 5 dimensões ponderadas (Valor 3×, Diferenciação 2×, Sinergia 2×, Custo-Benefício 2×, Maturidade 1×)\n`;
    return content;
  }

  private generateViabilityMatrix(scores: Array<ViabilityScore | null>): string {
    let content = '## Matriz de Viabilidade\n\n';
    content += '### Scores Individuais\n\n';

    for (const score of scores) {
      if (!score) continue;
      content += `**${score.technology}:** ${score.overall}/5 — ${score.recommendation === 'FAZER' ? '✅' : score.recommendation === 'AGENDAR' ? '⏳' : '🔍'}\n`;
      content += `- Valor: ${score.dimensions.value}/5 | Diferenciação: ${score.dimensions.differentiation}/5\n`;
      content += `- Sinergia: ${score.dimensions.synergy}/5 | Custo-Benefício: ${score.dimensions.costBenefit}/5 | Maturidade: ${score.dimensions.maturity}/5\n\n`;
    }

    return content;
  }

  private generateRiskSection(_topic: string, _technologies: string[]): string {
    return `## Riscos e Limitações\n\n` +
      `| Risco | Probabilidade | Impacto | Mitigação |\n` +
      `|------|:------------:|:-------:|-----------|\n` +
      `| Complexidade de implementação | Média | Alto | Prova de conceito antes de implementar |\n` +
      `| Integração com ecossistema existente | Baixa | Médio | Testes de contrato entre módulos |\n` +
      `| Curva de aprendizado da equipe | Média | Baixo | Treinamento e documentação |\n` +
      `| Dependência de tecnologias externas | Baixa | Alto | Fallback e estratégia de migração |\n`;
  }

  private generateRecommendation(scores: Array<ViabilityScore | null>): string {
    const valid = scores.filter((s): s is ViabilityScore => s !== null);
    const recommended = valid.filter(s => s.recommendation === 'FAZER');
    const toSchedule = valid.filter(s => s.recommendation === 'AGENDAR');
    const toInvestigate = valid.filter(s => s.recommendation === 'INVESTIGAR');

    let content = '## Recomendação\n\n';

    if (recommended.length > 0) {
      content += '### ✅ Recomendado para Implementação\n\n';
      for (const r of recommended) {
        content += `- **${r.technology}** (Score: ${r.overall}/5) — Implementar nos próximos 2 sprints\n`;
      }
      content += '\n';
    }

    if (toSchedule.length > 0) {
      content += '### ⏳ Agendar\n\n';
      for (const r of toSchedule) {
        content += `- **${r.technology}** (Score: ${r.overall}/5) — Reavaliar em 3 meses\n`;
      }
      content += '\n';
    }

    if (toInvestigate.length > 0) {
      content += '### 🔍 Investigar\n\n';
      for (const r of toInvestigate) {
        content += `- **${r.technology}** (Score: ${r.overall}/5) — Pesquisa adicional necessária\n`;
      }
      content += '\n';
    }

    return content;
  }
}

export function createAutoStudyGenerator(workspaceRoot: string): AutoStudyGenerator {
  return new AutoStudyGenerator(workspaceRoot);
}
