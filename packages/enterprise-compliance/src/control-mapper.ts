import { randomUUID } from 'crypto';
import { createLogger, Logger } from '@ideia/logger';
import {
  ComplianceFramework,
  Control,
  FrameworkRequirement,
  ControlMap,
  MappedControl,
} from './types';

export interface CoverageAnalysis {
  mapped: number;
  unmapped: number;
  total: number;
  coveragePercent: number;
  byFramework: Partial<Record<ComplianceFramework, { mapped: number; total: number; coveragePercent: number }>>;
}

export class ControlMapper {
  private _maps: Map<string, ControlMap> = new Map();
  private _logger: Logger;

  constructor() {
    this._logger = createLogger('control-mapper');
  }

  createMap(
    framework: ComplianceFramework,
    sourceControls: Control[],
    targetRequirements: FrameworkRequirement[],
    customMappings?: Array<{ sourceControlId: string; targetRequirementId: string; coverage: MappedControl['coverage']; notes?: string }>,
  ): ControlMap {
    const mappings: MappedControl[] = [];

    if (customMappings != null) {
      for (const cm of customMappings) {
        const sourceControl = sourceControls.find((c) => c.controlId === cm.sourceControlId);
        const targetReq = targetRequirements.find((r) => r.requirementId === cm.targetRequirementId);
        if (sourceControl == null || targetReq == null) continue;

        mappings.push({
          id: randomUUID(),
          sourceControlId: cm.sourceControlId,
          sourceFramework: framework,
          targetRequirementId: cm.targetRequirementId,
          targetFramework: targetReq.framework,
          coverage: cm.coverage,
          notes: cm.notes ?? null,
          lastReviewed: new Date().toISOString(),
        });
      }
    } else {
      for (const ctrl of sourceControls) {
        for (const req of targetRequirements) {
          if (this._isRelated(ctrl, req)) {
            mappings.push({
              id: randomUUID(),
              sourceControlId: ctrl.controlId,
              sourceFramework: ctrl.framework,
              targetRequirementId: req.requirementId,
              targetFramework: req.framework,
              coverage: this._determineCoverage(ctrl, req),
              notes: ctrl.remediationNotes,
              lastReviewed: new Date().toISOString(),
            });
          }
        }
      }
    }

    const map: ControlMap = {
      id: randomUUID(),
      framework,
      version: '1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mappings,
    };

    this._maps.set(map.id, map);
    this._logger.info('Control map created', { mapId: map.id, framework, mappings: mappings.length });
    return map;
  }

  getMap(id: string): ControlMap | undefined {
    return this._maps.get(id);
  }

  getAllMaps(): ControlMap[] {
    return Array.from(this._maps.values());
  }

  getMapsByFramework(framework: ComplianceFramework): ControlMap[] {
    return Array.from(this._maps.values()).filter((m) => m.framework === framework);
  }

  findCrossFrameworkMappings(sourceFramework: ComplianceFramework, targetFramework: ComplianceFramework): MappedControl[] {
    const allMappings: MappedControl[] = [];
    for (const map of this._maps.values()) {
      for (const m of map.mappings) {
        if (m.sourceFramework === sourceFramework && m.targetFramework === targetFramework) {
          allMappings.push(m);
        }
      }
    }
    return allMappings;
  }

  analyzeCoverage(controls: Control[], requirements: FrameworkRequirement[]): CoverageAnalysis {
    const mappedControlIds = new Set<string>();
    const byFramework: Partial<Record<ComplianceFramework, { mapped: number; total: number; coveragePercent: number }>> = {};

    for (const map of this._maps.values()) {
      for (const mapping of map.mappings) {
        mappedControlIds.add(`${mapping.sourceFramework}:${mapping.sourceControlId}`);
      }
    }

    const frameworks: ComplianceFramework[] = ['soc2', 'iso27001', 'gdpr', 'lgpd', 'hipaa', 'pci-dss'];

    for (const fw of frameworks) {
      const fwControls = controls.filter((c) => c.framework === fw);
      const fwMapped = fwControls.filter((c) => mappedControlIds.has(`${c.framework}:${c.controlId}`));
      const total = fwControls.length;
      byFramework[fw] = {
        mapped: fwMapped.length,
        total,
        coveragePercent: total > 0 ? Math.round((fwMapped.length / total) * 100) : 0,
      };
    }

    const total = controls.length;
    const mapped = controls.filter((c) => mappedControlIds.has(`${c.framework}:${c.controlId}`)).length;

    return {
      mapped,
      unmapped: total - mapped,
      total,
      coveragePercent: total > 0 ? Math.round((mapped / total) * 100) : 0,
      byFramework,
    };
  }

  generateMappingReport(map: ControlMap): string {
    const lines: string[] = [
      `=== CONTROL MAPPING REPORT ===`,
      `Map ID: ${map.id}`,
      `Framework: ${map.framework}`,
      `Version: ${map.version}`,
      `Created: ${map.createdAt}`,
      `Updated: ${map.updatedAt}`,
      `Total Mappings: ${map.mappings.length}`,
      ``,
      `Mappings:`,
    ];

    for (const m of map.mappings) {
      lines.push(
        `  ${m.sourceFramework}:${m.sourceControlId} -> ${m.targetFramework}:${m.targetRequirementId} [${m.coverage}]`,
      );
    }

    return lines.join('\n');
  }

  private _isRelated(control: Control, requirement: FrameworkRequirement): boolean {
    const controlText = `${control.controlId} ${control.title} ${control.description} ${control.category}`.toLowerCase();
    const reqText = `${requirement.requirementId} ${requirement.title} ${requirement.description} ${requirement.category}`.toLowerCase();
    const keywords = ['access', 'encrypt', 'audit', 'incident', 'privacy', 'risk', 'change', 'backup', 'vendor', 'policy'];
    return keywords.some((kw) => controlText.includes(kw) && reqText.includes(kw));
  }

  private _determineCoverage(control: Control, _requirement: FrameworkRequirement): MappedControl['coverage'] {
    if (control.status === 'implemented') return 'full';
    if (control.status === 'partial') return 'partial';
    return 'related';
  }
}
