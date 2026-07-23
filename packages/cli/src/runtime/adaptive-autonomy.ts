/**
 * adaptive-autonomy.ts — Adaptive Autonomy via Bayesian Confidence (Item 20)
 *
 * Sistema ganha mais autonomia conforme demonstra confiabilidade.
 * Usa Bayesian confidence scoring baseado em taxa de sucesso histórica.
 */

export interface AutonomyRecord {
  taskId: string;
  action: string;
  success: boolean;
  autoApproved: boolean;
  timestamp: string;
}

export interface AutonomyLevel {
  level: number;
  label: string;
  description: string;
  maxActionsBeforeReview: number;
}

const LEVELS: AutonomyLevel[] = [
  { level: 0, label: 'N0 — Assistido', description: 'Toda ação requer aprovação', maxActionsBeforeReview: 0 },
  { level: 1, label: 'N1 — Supervisionado', description: 'Ações simples automáticas, complexas requerem review', maxActionsBeforeReview: 3 },
  { level: 2, label: 'N2 — Semi-autônomo', description: 'Maioria das ações automáticas, review por amostragem', maxActionsBeforeReview: 10 },
  { level: 3, label: 'N3 — Autônomo', description: 'Ações automáticas, notificação pós-ação', maxActionsBeforeReview: 50 },
  { level: 4, label: 'N4 — Total', description: 'Confiança total, auditoria apenas', maxActionsBeforeReview: Infinity },
];

export class AdaptiveAutonomy {
  private history: AutonomyRecord[] = [];
  private currentLevel = 1;
  private successRate = 0.5;
  private totalActions = 0;

  recordAction(action: string, success: boolean, autoApproved: boolean): AutonomyRecord {
    const record: AutonomyRecord = {
      taskId: `auto-${Date.now()}`,
      action,
      success,
      autoApproved,
      timestamp: new Date().toISOString(),
    };
    this.history.push(record);
    this.totalActions++;
    this.updateConfidence();
    return record;
  }

  shouldAutoApprove(action: string): { approve: boolean; reason: string } {
    const level = this.getCurrentLevel();

    if (level.level === 0) return { approve: false, reason: 'N0 — All actions require approval' };

    const recentBatch = this.history.slice(-level.maxActionsBeforeReview);
    const allRecentApproved = recentBatch.length === 0 || recentBatch.every(r => r.autoApproved && r.success);
    const isSimple = action.split(' ').length < 10 && !action.includes('rm ') && !action.includes('sudo');

    if (level.level >= 3 && allRecentApproved) return { approve: true, reason: `N3/N4 — Full trust, auto-approved` };
    if (level.level >= 2 && isSimple && this.successRate > 0.8) return { approve: true, reason: `N2 — Simple action with high confidence (${Math.round(this.successRate * 100)}%)` };
    if (level.level >= 1 && isSimple && this.history.length < 5) return { approve: true, reason: `N1 — Early trust for simple actions` };

    return { approve: false, reason: `Level ${level.level} — Requires review for this action type` };
  }

  getCurrentLevel(): AutonomyLevel {
    return LEVELS[this.currentLevel] || LEVELS[1];
  }

  private updateConfidence(): void {
    const recent = this.history.slice(-50);
    const successes = recent.filter(r => r.success).length;
    this.successRate = recent.length > 0 ? successes / recent.length : 0.5;

    if (this.successRate > 0.95 && this.totalActions > 100) this.currentLevel = Math.min(4, this.currentLevel + 1);
    else if (this.successRate > 0.85 && this.totalActions > 30) this.currentLevel = Math.min(3, this.currentLevel + 1);
    else if (this.successRate > 0.75 && this.totalActions > 10) this.currentLevel = Math.min(2, this.currentLevel + 1);
    else if (this.totalActions > 5) this.currentLevel = Math.max(0, Math.min(1, this.currentLevel));
  }

  getStats(): { level: AutonomyLevel; successRate: number; totalActions: number } {
    return { level: this.getCurrentLevel(), successRate: this.successRate, totalActions: this.totalActions };
  }
}
