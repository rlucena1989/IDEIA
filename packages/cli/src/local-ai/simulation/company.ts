import { CompanyProject, SimulationPhase, SimulationRole, COMPANY_ROLES, PHASE_ORDER, PHASE_ROLES } from './types';
import { generatePhaseArtifacts } from './artifacts';

function findRole(name: string): SimulationRole {
  return COMPANY_ROLES.find(r => r.name === name) || COMPANY_ROLES[0];
}

/**
 * Cria project.
 * @param name - Valor name.
 * @param description - Valor description.
 * @returns O resultado da operação.
 */
export function createProject(name: string, description: string): CompanyProject {
  return {
    name,
    description,
    createdAt: new Date().toISOString(),
    status: 'planning',
    roles: [...COMPANY_ROLES],
    artifacts: [],
    timeline: [],
  };
}

function addEvent(project: CompanyProject, role: string, action: string, description: string, artifactId?: string): void {
  project.timeline.push({
    timestamp: new Date().toISOString(),
    role,
    action,
    description,
    artifactId,
  });
}

/**
 * Executa simulation.
 * @param project - Valor project.
 * @param options - Valor options.
 * @returns O resultado da operação.
 */
export function runSimulation(project: CompanyProject, options?: { delay?: number; phases?: SimulationPhase[] }): CompanyProject {
  const phases = options?.phases || PHASE_ORDER;
  project.status = 'in_progress';

  addEvent(project, 'system', 'start', `Simulation started for "${project.name}"`);

  for (const phase of phases) {
    const roleNames = PHASE_ROLES[phase];
    addEvent(project, 'system', 'phase', `Starting phase: ${phase}`, undefined);

    for (const roleName of roleNames) {
      const role = findRole(roleName);
      if (!role) continue;

      addEvent(project, roleName, 'work', `${role.title} working on ${phase} phase`);

      const artifacts = generatePhaseArtifacts(project, phase, role);
      for (const artifact of artifacts) {
        project.artifacts.push(artifact);
        addEvent(project, roleName, 'produce', `Produced: ${artifact.title}`, artifact.id);
      }

      addEvent(project, roleName, 'complete', `${role.title} completed ${phase} deliverables`);
    }

    addEvent(project, 'system', 'phase_complete', `Phase "${phase}" completed: ${project.artifacts.length} total artifacts`);
  }

  project.status = 'completed';
  project.completedAt = new Date().toISOString();
  addEvent(project, 'system', 'complete', `Simulation completed: ${project.artifacts.length} artifacts across ${phases.length} phases`);

  return project;
}

/**
 * Formata simulation report.
 * @param project - Valor project.
 * @returns O resultado da operação.
 */
export function formatSimulationReport(project: CompanyProject): string {
  const lines: string[] = [];
  lines.push(`# Company Simulation: ${project.name}`);
  lines.push('');
  lines.push(`**Description:** ${project.description}`);
  lines.push(`**Status:** ${project.status}`);
  lines.push(`**Duration:** ${project.createdAt.substring(0, 19)} → ${project.completedAt?.substring(0, 19) || 'N/A'}`);
  lines.push(`**Total Artifacts:** ${project.artifacts.length}`);
  lines.push(`**Total Events:** ${project.timeline.length}`);
  lines.push('');

  lines.push('## Team');
  lines.push('');
  for (const role of project.roles) {
    lines.push(`- **${role.title}**`);
    for (const resp of role.responsibilities) {
      lines.push(`  - ${resp}`);
    }
  }
  lines.push('');

  lines.push('## Timeline');
  lines.push('');
  for (const event of project.timeline) {
    const icon = event.role === 'system' ? '⚙️' : '👤';
    lines.push(`${icon} [${event.timestamp.substring(11, 19)}] **${event.role}**: ${event.description}`);
  }
  lines.push('');

  lines.push('## Artifacts');
  lines.push('');
  for (const art of project.artifacts) {
    const formatIcon: Record<string, string> = { markdown: '📝', code: '💻', diagram: '📊', test: '🧪', config: '⚙️' };
    lines.push(`### ${formatIcon[art.format] || '📄'} ${art.title} (*${art.role}*, ${art.phase})`);
    lines.push('');
    lines.push('```' + (art.format === 'code' ? 'typescript' : ''));
    lines.push(art.content.substring(0, 500));
    if (art.content.length > 500) lines.push('...[truncated]');
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n');
}