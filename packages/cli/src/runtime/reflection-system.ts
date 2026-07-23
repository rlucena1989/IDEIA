/**
 * reflection-system.ts — Reflection System (Item 36)
 *
 * Ciclo Reflexion: executar → refletir → reter → aplicar.
 * Agente reflete sobre erros e resultados para melhorar iterativamente.
 */

export interface Reflection {
  id: string;
  action: string;
  result: 'success' | 'failure' | 'partial';
  reflection: string;
  lesson: string;
  applied: boolean;
  createdAt: string;
}

export class ReflectionSystem {
  private reflections: Reflection[] = [];

  reflect(action: string, result: 'success' | 'failure' | 'partial', outcome: string): Reflection {
    const reflection: Reflection = {
      id: `ref-${Date.now()}`,
      action,
      result,
      reflection: this.analyze(result, outcome),
      lesson: this.extractLesson(result, outcome),
      applied: false,
      createdAt: new Date().toISOString(),
    };
    this.reflections.push(reflection);
    return reflection;
  }

  getLessons(): string[] {
    return this.reflections.filter(r => r.applied).map(r => r.lesson);
  }

  getPendingLessons(): Reflection[] {
    return this.reflections.filter(r => !r.applied);
  }

  markApplied(id: string): void {
    const ref = this.reflections.find(r => r.id === id);
    if (ref) ref.applied = true;
  }

  private analyze(result: string, outcome: string): string {
    if (result === 'success') return `Strategy worked: ${outcome.slice(0, 100)}`;
    if (result === 'failure') return `Failed: ${outcome.slice(0, 200)}. Root cause analysis needed.`;
    return `Partial: ${outcome.slice(0, 150)}. Improvement possible.`;
  }

  private extractLesson(result: string, outcome: string): string {
    if (result === 'success') return `Continue using this approach: ${outcome.slice(0, 80)}`;
    if (outcome.includes('timeout')) return 'Set longer timeouts for large operations';
    if (outcome.includes('error') || outcome.includes('fail')) return 'Add pre-validation before execution';
    if (outcome.includes('not found') || outcome.includes('missing')) return 'Verify prerequisites before starting';
    return 'Review approach before retrying';
  }
}
