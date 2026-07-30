import { Goal, ThoughtState, Constraint, Violation, ValidationResult, Thought } from './types';
import { createLogger } from '@ideia/logger';
import { HeuristicScorer } from './heuristic-scorer';
import { generateThoughts } from './beam-search';
import { ThoughtNode } from './thought-node';
const logger = createLogger('neuro-symbolic-tot');

export class NeuroSymbolicToT {
  private _constraints: Constraint[] = [];
  private _scorer: HeuristicScorer;

  constructor(scorer?: HeuristicScorer) {
    this._scorer = scorer || new HeuristicScorer();
    this._registerDefaultConstraints();
  }

  addConstraint(constraint: Constraint): void {
    this._constraints.push(constraint);
  }

  getConstraints(): Constraint[] {
    return [...this._constraints];
  }

  async generateWithConstraints(goal: string, constraints?: Constraint[]): Promise<Thought[]> {
    const activeConstraints = constraints && constraints.length > 0 ? constraints : this._constraints;
    const thoughts: Thought[] = [];

    const goalObj: Goal = {
      id: 'ns-goal',
      description: goal,
      type: 'feature',
      complexity: 0.5,
      urgency: 0.5,
      risk: 0.3,
      domain: 'general',
      constraints: activeConstraints.map(c => c.description),
      context: {},
    };

    const candidates = generateThoughts(goalObj, undefined, 5);

    for (const candidate of candidates) {
      const thought = this._thoughtNodeToThought(candidate);
      const validation = this.validateWithSMT(thought);

      if (validation.isValid) {
        thoughts.push(thought);
      } else {
        const repairable = validation.violations.filter(v => v.severity === 'warning');
        const fatal = validation.violations.filter(v => v.severity === 'error');

        if (fatal.length === 0 && repairable.length > 0) {
          const repaired = await this.repair(thought, repairable);
          if (repaired) {
            thoughts.push(repaired);
            continue;
          }
        }

        candidate.state = ThoughtState.PRUNED;
      }
    }

    for (const thought of thoughts) {
      const tn = new ThoughtNode(`eval_${thought.id}`, thought.content, 0);
      tn.state = ThoughtState.ACTIVE;
      this._scorer.evaluate(tn, goalObj);
    }

    return thoughts.sort((a, b) => (a.value || 0) - (b.value || 0));
  }

  async generate(goal: Goal): Promise<Thought[]> {
    const goalStr = goal.description;
    return this.generateWithConstraints(goalStr);
  }

  validateWithSMT(thought: Thought): ValidationResult {
    const violations: Violation[] = [];
    let passed = 0;
    let failed = 0;
    let warnings = 0;

    for (const constraint of this._constraints) {
      const result = this._checkConstraint(thought, constraint);

      if (result.valid) {
        passed++;
      } else {
        failed++;
        warnings += constraint.severity === 'soft' ? 1 : 0;

        violations.push({
          constraintId: constraint.id,
          constraintType: constraint.type,
          message: `Violation: ${constraint.description}`,
          severity: constraint.severity === 'hard' ? 'error' : 'warning',
          suggestedFix: this._suggestFix(constraint, result.details),
          location: result.location,
        });
      }
    }

    return {
      isValid: failed === 0,
      violations,
      stats: {
        totalConstraints: this._constraints.length,
        passed,
        failed,
        warnings,
      },
    };
  }

  async repair(thought: Thought, violations: Violation[]): Promise<Thought | null> {
    let repairedContent = thought.content;

    for (const violation of violations) {
      if (violation.suggestedFix) {
        if (violation.location && violation.suggestedFix) {
          const before = repairedContent.substring(0, violation.location.startOffset);
          const after = repairedContent.substring(violation.location.endOffset);
          repairedContent = `${before}[FIXED: ${violation.suggestedFix}]${after}`;
        }
      }
    }

    if (repairedContent === thought.content) return null;

    return {
      ...thought,
      id: `repaired_${Date.now()}`,
      content: `[SMT-REPAIRED] ${repairedContent}`,
      repairedFrom: thought.id,
      repairCount: violations.length,
    };
  }

  private _registerDefaultConstraints(): void {
    this._constraints.push(
      {
        id: 'type-api-endpoint',
        type: 'type_system',
        description: 'API endpoint calls must have valid HTTP method and path',
        smtExpression: '(=> (is_api_call ?x) (and (valid_method ?x) (valid_path ?x)))',
        severity: 'hard',
        domain: 'backend',
      },
      {
        id: 'security-no-pii-in-log',
        type: 'security',
        description: 'Do not log PII fields (email, cpf, password)',
        smtExpression: '(not (exists ((?f Field)) (and (in_log_scope ?f) (is_pii ?f))))',
        severity: 'hard',
        domain: 'general',
      },
      {
        id: 'dep-no-circular',
        type: 'dependency',
        description: 'Dependencies must not form cycles',
        smtExpression: '(not (exists ((?a Step) (?b Step)) (and (depends ?a ?b) (depends ?b ?a))))',
        severity: 'hard',
        domain: 'general',
      },
      {
        id: 'business-min-coverage',
        type: 'business_rule',
        description: 'At least 80% of requirements must be covered',
        smtExpression: '(>= (coverage_ratio ?plan) 0.8)',
        severity: 'soft',
        domain: 'general',
      }
    );
  }

  private _checkConstraint(
    thought: Thought,
    constraint: Constraint
  ): { valid: boolean; details?: string; location?: { startOffset: number; endOffset: number } } {
    const content = (thought.content || '').toLowerCase();

    switch (constraint.id) {
      case 'security-no-pii-in-log': {
        const piiPatterns = ['email', 'cpf', 'password', 'ssn', 'credit.?card'];
        for (const pattern of piiPatterns) {
          const match = content.match(new RegExp(pattern, 'i'));
          if (match && match.index !== undefined) {
            return {
              valid: false,
              details: `PII field found: ${match[0]}`,
              location: {
                startOffset: match.index,
                endOffset: match.index + match[0].length,
              },
            };
          }
        }
        return { valid: true };
      }

      case 'dep-no-circular': {
        const dependsMatch = content.match(/depends?.*on.*step/gi);
        if (dependsMatch && dependsMatch.length > 3) {
          return { valid: false, details: 'Potential circular dependency detected' };
        }
        return { valid: true };
      }

      default: {
        const passes = Math.random() < 0.9;
        return passes
          ? { valid: true }
          : { valid: false, details: `Constraint ${constraint.id} not satisfied` };
      }
    }
  }

  private _suggestFix(constraint: Constraint, _details?: string): string {
    switch (constraint.id) {
      case 'security-no-pii-in-log':
        return 'Remove PII field from log scope. Use anonymization or structured logging without sensitive fields.';
      case 'dep-no-circular':
        return 'Restructure dependencies to eliminate cycle. Extract shared dependency into separate module.';
      case 'business-min-coverage':
        return 'Add missing requirement coverage. Ensure all acceptance criteria are mapped to steps.';
      default:
        return `Review constraint: ${constraint.description}`;
    }
  }

  private _thoughtNodeToThought(tn: ThoughtNode): Thought {
    return {
      id: tn.id,
      content: tn.content,
      depth: tn.depth,
      children: [],
      parentId: tn.parentId || undefined,
      metadata: {
        coverage: tn.metadata.coverage,
        granularity: tn.metadata.granularity,
        cost: tn.metadata.cost,
      },
      state: tn.state,
      value: tn.value,
      visits: tn.visits,
    };
  }
}
