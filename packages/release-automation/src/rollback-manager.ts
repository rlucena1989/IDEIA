export interface RollbackStep {
  type: 'revert-version' | 'restore-artifact' | 'notify-channel' | 'cleanup-deploy';
  description: string;
  executed: boolean;
  success: boolean | null;
}

export interface RollbackPlan {
  releaseVersion: string;
  targetVersion: string;
  reason: string;
  steps: RollbackStep[];
  createdAt: string;
}

export interface RollbackResult {
  plan: RollbackPlan;
  success: boolean;
  completedSteps: number;
  totalSteps: number;
  error: string | null;
  completedAt: string;
}

export class RollbackManager {
  private _rollbackHistory: RollbackResult[] = [];

  createPlan(releaseVersion: string, targetVersion: string, reason: string): RollbackPlan {
    const steps: RollbackStep[] = [
      {
        type: 'revert-version',
        description: `Revert version from ${releaseVersion} to ${targetVersion}`,
        executed: false,
        success: null,
      },
      {
        type: 'restore-artifact',
        description: `Restore artifacts for version ${targetVersion}`,
        executed: false,
        success: null,
      },
      {
        type: 'notify-channel',
        description: `Notify release channel about rollback from ${releaseVersion} to ${targetVersion}`,
        executed: false,
        success: null,
      },
      {
        type: 'cleanup-deploy',
        description: `Clean up failed deployment of ${releaseVersion}`,
        executed: false,
        success: null,
      },
    ];

    return {
      releaseVersion,
      targetVersion,
      reason,
      steps,
      createdAt: new Date().toISOString(),
    };
  }

  async executePlan(plan: RollbackPlan): Promise<RollbackResult> {
    let completedSteps = 0;
    let lastError: string | null = null;

    for (const step of plan.steps) {
      const success = await this._executeStep(step);
      step.executed = true;
      step.success = success;
      if (success) {
        completedSteps++;
      } else {
        lastError = `Step '${step.type}' failed`;
        break;
      }
    }

    const result: RollbackResult = {
      plan,
      success: completedSteps === plan.steps.length,
      completedSteps,
      totalSteps: plan.steps.length,
      error: lastError,
      completedAt: new Date().toISOString(),
    };

    this._rollbackHistory.push(result);
    return result;
  }

  getHistory(): RollbackResult[] {
    return [...this._rollbackHistory];
  }

  getLastRollback(): RollbackResult | null {
    if (this._rollbackHistory.length === 0) {
      return null;
    }
    return this._rollbackHistory[this._rollbackHistory.length - 1] as RollbackResult;
  }

  private async _executeStep(_step: RollbackStep): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 30));
    return true;
  }
}
