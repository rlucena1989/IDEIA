import { createLogger } from '@ideia/logger';
import { SafetyLayerStatus, SafetyStatus, BreakerState } from './types';

export interface SafetyReport {
  generatedAt: string;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  layers: SafetyLayerStatus[];
  circuitBreakers: BreakerState[];
  safetyStatus: Partial<SafetyStatus>;
  summary: {
    totalLayers: number;
    healthyLayers: number;
    degradedLayers: number;
    failedLayers: number;
    activeBreakers: number;
    recommendations: string[];
  };
}

export class SafetyReportGenerator {
  private logger = createLogger('safety-report');

  generateReport(
    layerStatuses: SafetyLayerStatus[],
    breakerStates: BreakerState[],
    safetyStatus?: Partial<SafetyStatus>,
  ): SafetyReport {
    const healthy = layerStatuses.filter(s => s.status === 'healthy').length;
    const degraded = layerStatuses.filter(s => s.status === 'degraded').length;
    const failed = layerStatuses.filter(s => s.status === 'failed').length;
    const trippedBreakers = breakerStates.filter(s => s.tripped).length;

    const overallStatus = failed > 0 ? 'critical' : degraded > 0 ? 'degraded' : 'healthy';

    const recommendations = this.generateRecommendations(layerStatuses, breakerStates);

    return {
      generatedAt: new Date().toISOString(),
      overallStatus,
      layers: layerStatuses,
      circuitBreakers: breakerStates,
      safetyStatus: safetyStatus ?? {},
      summary: {
        totalLayers: layerStatuses.length,
        healthyLayers: healthy,
        degradedLayers: degraded,
        failedLayers: failed,
        activeBreakers: trippedBreakers,
        recommendations,
      },
    };
  }

  formatAsText(report: SafetyReport): string {
    const lines: string[] = [];

    lines.push('='.repeat(60));
    lines.push('SAFETY ARCHITECTURE REPORT');
    lines.push('='.repeat(60));
    lines.push(`Generated: ${report.generatedAt}`);
    lines.push(`Overall Status: ${report.overallStatus.toUpperCase()}`);
    lines.push('');

    lines.push('─'.repeat(60));
    lines.push('Layer Status');
    lines.push('─'.repeat(60));

    for (const layer of report.layers) {
      const icon = layer.status === 'healthy' ? '✓' : layer.status === 'degraded' ? '⚠' : '✗';
      lines.push(`  ${icon} ${layer.layer.padEnd(25)} ${layer.status.padEnd(10)} ${layer.enabled ? 'enabled' : 'disabled'}`);
    }

    lines.push('');
    lines.push('─'.repeat(60));
    lines.push('Circuit Breakers');
    lines.push('─'.repeat(60));

    for (const breaker of report.circuitBreakers) {
      const icon = breaker.tripped ? '⚠' : '✓';
      lines.push(`  ${icon} ${breaker.type.padEnd(20)} ${breaker.tripped ? 'TRIPPED' : 'OK'.padEnd(10)} value: ${breaker.currentValue}/${breaker.threshold}`);
    }

    lines.push('');
    lines.push('─'.repeat(60));
    lines.push('Summary');
    lines.push('─'.repeat(60));
    lines.push(`  Total Layers:     ${report.summary.totalLayers}`);
    lines.push(`  Healthy Layers:   ${report.summary.healthyLayers}`);
    lines.push(`  Degraded Layers:  ${report.summary.degradedLayers}`);
    lines.push(`  Failed Layers:    ${report.summary.failedLayers}`);
    lines.push(`  Active Breakers:  ${report.summary.activeBreakers}`);
    lines.push('');

    if (report.summary.recommendations.length > 0) {
      lines.push('─'.repeat(60));
      lines.push('Recommendations');
      lines.push('─'.repeat(60));
      for (const rec of report.summary.recommendations) {
        lines.push(`  → ${rec}`);
      }
    }

    lines.push('');
    lines.push('='.repeat(60));
    return lines.join('\n');
  }

  private generateRecommendations(
    layerStatuses: SafetyLayerStatus[],
    breakerStates: BreakerState[],
  ): string[] {
    const recommendations: string[] = [];

    for (const layer of layerStatuses) {
      if (layer.status === 'failed') {
        recommendations.push(`Investigate and fix ${layer.layer} layer — status: failed`);
      } else if (layer.status === 'degraded') {
        recommendations.push(`Review ${layer.layer} layer health — currently degraded`);
      }
    }

    for (const breaker of breakerStates) {
      if (breaker.tripped) {
        recommendations.push(`Circuit breaker ${breaker.type} is tripped — consider manual reset after investigation`);
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('All safety layers are healthy');
    }

    return recommendations;
  }
}
