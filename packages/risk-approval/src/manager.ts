import { RiskClassifier } from './risk-classifier';
import { ApprovalMatrix } from './approval-matrix';
import { RiskAssessment, ApprovalRequest, RiskLevel, ImpactLevel, ProbabilityLevel, ApprovalLevel } from './types';

export class RiskApprovalManager {
  readonly classifier: RiskClassifier;
  readonly approvalMatrix: ApprovalMatrix;

  constructor() {
    this.classifier = new RiskClassifier();
    this.approvalMatrix = new ApprovalMatrix();
  }

  assessAndRequest(action: string, impact: ImpactLevel, probability: ProbabilityLevel, requestedBy: string, factors?: string[], environment?: string, justification?: string): { assessment: RiskAssessment; request: ApprovalRequest } {
    const assessment = this.classifier.classify(impact, probability, factors, environment);
    const request = this.approvalMatrix.createRequest(action, assessment.level, requestedBy, justification);
    return { assessment, request };
  }

  canProceed(riskLevel: RiskLevel, tokenCount: number): boolean {
    return this.approvalMatrix.canAutoApprove(riskLevel, tokenCount);
  }
}

export function createRiskApprovalManager(): RiskApprovalManager {
  return new RiskApprovalManager();
}
