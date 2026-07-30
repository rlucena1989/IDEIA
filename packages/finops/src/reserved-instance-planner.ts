import { ReservedInstancePlan, ReservationTerm, PaymentOption, ResourceMetric } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('reserved-instance-planner');

export class ReservedInstancePlanner {
  private _plans: ReservedInstancePlan[] = [];

  async evaluateResource(resource: ResourceMetric): Promise<ReservedInstancePlan | null> {
    const monthlyCost = resource.costPerMonth;
    if (monthlyCost < 100) return null;
    const plans: ReservedInstancePlan[] = [
      this._createPlan(resource, '1-year', 'no-upfront', monthlyCost, 0.2),
      this._createPlan(resource, '1-year', 'partial-upfront', monthlyCost, 0.3),
      this._createPlan(resource, '1-year', 'all-upfront', monthlyCost, 0.4),
      this._createPlan(resource, '3-year', 'no-upfront', monthlyCost, 0.4),
      this._createPlan(resource, '3-year', 'partial-upfront', monthlyCost, 0.5),
      this._createPlan(resource, '3-year', 'all-upfront', monthlyCost, 0.6),
    ];
    const best = plans.reduce((a, b) => (a.estimatedSavings > b.estimatedSavings ? a : b));
    this._plans.push(best);
    return best;
  }

  evaluateMultiple(resources: ResourceMetric[]): ReservedInstancePlan[] {
    const plans: ReservedInstancePlan[] = [];
    for (const r of resources) {
      const plan = this._evaluateSync(r);
      if (plan) plans.push(plan);
    }
    return plans;
  }

  getTotalPotentialSavings(): number {
    return this._plans.reduce((s, p) => s + p.estimatedSavings, 0);
  }

  getRecommendedPlans(): ReservedInstancePlan[] {
    return this._plans.filter(p => p.recommended);
  }

  clear(): void {
    this._plans = [];
  }

  private _createPlan(
    resource: ResourceMetric,
    term: ReservationTerm,
    payment: PaymentOption,
    monthlyCost: number,
    discountRate: number,
  ): ReservedInstancePlan {
    const monthlySavings = monthlyCost * discountRate;
    const totalMonths = term === '1-year' ? 12 : 36;
    const totalSavings = monthlySavings * totalMonths;
    const upfrontRate = payment === 'no-upfront' ? 0 : payment === 'partial-upfront' ? 0.3 : 1;
    const upfrontCost = monthlyCost * totalMonths * discountRate * upfrontRate;
    const breakEvenMonths = upfrontCost > 0 ? Math.ceil(upfrontCost / monthlySavings) : 0;
    return {
      id: `ri-${resource.resourceId}-${term}-${payment}`,
      provider: resource.provider,
      service: resource.resourceType,
      term,
      payment,
      upfrontCost,
      monthlyCost: monthlyCost * (1 - discountRate),
      estimatedSavings: totalSavings,
      breakEvenMonths,
      confidence: term === '3-year' ? 0.7 : 0.85,
      recommended: discountRate >= 0.4 && monthlyCost > 200,
    };
  }

  private _evaluateSync(resource: ResourceMetric): ReservedInstancePlan | null {
    const monthlyCost = resource.costPerMonth;
    if (monthlyCost < 100) return null;
    const bestPlan = this._createPlan(resource, '1-year', 'partial-upfront', monthlyCost, 0.3);
    this._plans.push(bestPlan);
    return bestPlan;
  }
}
