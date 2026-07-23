import { Emitter, Disposable, DisposableCollection } from '@ideia/core-contributions';
import { EnablementRule, EnablementService } from './types';

export class DefaultEnablementService implements EnablementService {
  private rules: EnablementRule[] = [];
  private disposables = new DisposableCollection();
  private onChangedEmitter = new Emitter<void>();

  get onRulesChanged() { return this.onChangedEmitter.event; }

  registerRule(rule: EnablementRule): Disposable {
    this.rules.push(rule);
    this.onChangedEmitter.fire(void 0);
    const d = { dispose: () => this.unregisterRule(rule.id) };
    this.disposables.push(d);
    return d;
  }

  isEnabled(targetId: string, context: Record<string, unknown>): boolean {
    const applicableRules = this.rules.filter(r => r.targetIds.includes(targetId));
    if (applicableRules.length === 0) return true;

    for (const rule of applicableRules) {
      const contextValue = context[rule.condition];
      if (contextValue !== undefined) {
        return rule.enabled;
      }
    }
    return true;
  }

  getRules(): EnablementRule[] {
    return [...this.rules];
  }

  private unregisterRule(id: string): void {
    this.rules = this.rules.filter(r => r.id !== id);
    this.onChangedEmitter.fire(void 0);
  }
}
