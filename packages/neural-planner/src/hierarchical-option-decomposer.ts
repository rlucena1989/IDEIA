import { Goal, PlannedStep, PlanningContext } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('hierarchical-option-decomposer');

interface Option {
  name: string;
  subSteps: PlannedStep[];
  terminationCondition: () => boolean;
  initiationSet: string[];
}

export class HierarchicalOptionDecomposer {
  private _options: Option[] = [];

  async decompose(goal: Goal, _context: PlanningContext): Promise<PlannedStep[]> {
    const baseSteps = this._createBaseSteps(goal);
    const options = this._createOptions(baseSteps);
    this._options.push(...options);
    const executionPlan = this._selectOptions(goal);
    return executionPlan;
  }

  private _createBaseSteps(goal: Goal): PlannedStep[] {
    const steps: PlannedStep[] = [];
    const count = Math.max(1, Math.ceil(goal.complexity * 4));
    for (let i = 0; i < count; i++) {
      steps.push({
        id: `base_${i + 1}`,
        description: `Base step ${i + 1} for ${goal.description}`,
        filesAffected: [],
        estimatedTokens: 500,
        dependencies: i > 0 ? [`base_${i}`] : [],
        acceptanceCriteria: [`Base criteria ${i + 1}`],
      });
    }
    return steps;
  }

  private _createOptions(baseSteps: PlannedStep[]): Option[] {
    const options: Option[] = [];
    const chunkSize = Math.max(1, Math.floor(baseSteps.length / 3));
    for (let i = 0; i < baseSteps.length; i += chunkSize) {
      const subSteps = baseSteps.slice(i, i + chunkSize);
      options.push({
        name: `option_${options.length + 1}`,
        subSteps,
        terminationCondition: () => true,
        initiationSet: i === 0 ? [] : [`base_${i}`],
      });
    }
    return options;
  }

  private _selectOptions(goal: Goal): PlannedStep[] {
    const selectedOptions = this._options.filter(() => Math.random() > 0.3);
    if (selectedOptions.length === 0 && this._options.length > 0) {
      return this._options[0].subSteps;
    }
    return selectedOptions.flatMap(o => o.subSteps);
  }

  getOptionCount(): number { return this._options.length; }

  getOptions(): Option[] { return [...this._options]; }
}
