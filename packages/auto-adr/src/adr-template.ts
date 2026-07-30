export type AdrTemplateType = 'feature' | 'architecture' | 'security' | 'dependency' | 'refactor';

export interface AdrTemplateData {
  id: string;
  title: string;
  status: string;
  date: string;
  context: string;
  decision: string;
  consequences: string[];
  compliance?: string;
  supersededBy?: string;
  templateType?: AdrTemplateType;
}

const TEMPLATE_SECTIONS: Record<AdrTemplateType, string[]> = {
  feature: [
    '## Requirements',
    '',
    '{requirements}',
    '',
    '## Implementation Plan',
    '',
    '{implementation}',
    '',
  ],
  architecture: [
    '## Architecture Context',
    '',
    '{architectureContext}',
    '',
    '## Options Considered',
    '',
    '{options}',
    '',
  ],
  security: [
    '## Threat Model',
    '',
    '{threatModel}',
    '',
    '## Security Controls',
    '',
    '{controls}',
    '',
  ],
  dependency: [
    '## Dependency Analysis',
    '',
    '{dependencyAnalysis}',
    '',
    '## Version Compatibility',
    '',
    '{versionCompatibility}',
    '',
  ],
  refactor: [
    '## Current State',
    '',
    '{currentState}',
    '',
    '## Target State',
    '',
    '{targetState}',
    '',
    '## Migration Plan',
    '',
    '{migrationPlan}',
    '',
  ],
};

export class AdrTemplate {
  render(data: AdrTemplateData): string {
    const lines: string[] = [];
    lines.push(`# ADR ${data.id}: ${data.title}`);
    lines.push('');
    lines.push(`**Status:** ${data.status}  `);
    lines.push(`**Date:** ${data.date}  `);
    if (data.templateType) {
      lines.push(`**Type:** ${data.templateType}  `);
    }
    lines.push('');
    lines.push('## Context');
    lines.push('');
    lines.push(data.context);
    lines.push('');
    lines.push('## Decision');
    lines.push('');
    lines.push(data.decision);
    lines.push('');
    lines.push('## Consequences');
    lines.push('');
    for (const c of data.consequences) {
      lines.push(`- ${c}`);
    }

    const extraSections = data.templateType ? TEMPLATE_SECTIONS[data.templateType] : [];
    if (extraSections.length > 0) {
      lines.push('');
      lines.push(...extraSections);
    }

    if (data.compliance) {
      lines.push('');
      lines.push('## Compliance');
      lines.push('');
      lines.push(data.compliance);
    }

    if (data.supersededBy) {
      lines.push('');
      lines.push(`> Superseded by ADR ${data.supersededBy}`);
    }

    lines.push('');
    return lines.join('\n');
  }

  getTemplate(type?: AdrTemplateType): string {
    const base = [
      '# ADR {id}: {title}',
      '',
      '**Status:** {status}  ',
      '**Date:** {date}  ',
      '',
      '## Context',
      '',
      '{context}',
      '',
      '## Decision',
      '',
      '{decision}',
      '',
      '## Consequences',
      '',
      '- {consequence}',
      '',
    ];
    const extraSections = type ? TEMPLATE_SECTIONS[type] : [];
    if (extraSections.length > 0) {
      base.push(...extraSections);
    }
    base.push('## Compliance');
    base.push('');
    base.push('{compliance}');
    base.push('');
    return base.join('\n');
  }

  getTypes(): AdrTemplateType[] {
    return Object.keys(TEMPLATE_SECTIONS) as AdrTemplateType[];
  }
}
