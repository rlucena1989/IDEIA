export { QualityGateSystem, createQualityGateSystem } from './gates';
export { DefenseFeedbackBridge } from './defense-feedback-bridge';
export type { DefenseEvent } from './defense-feedback-bridge';
export { GateBarrier } from './gate-barrier';
export { ConfidenceScorer } from './confidence-scorer';
export { MultiLayerVerifier } from './multi-layer';
export { RegressionAnalyzer } from './regression-analyzer';
export { SpecGate } from './gates/spec-gate';
export type { SpecValidationInput, SpecValidationResult } from './gates/spec-gate';
export { TDDGate } from './gates/tdd-gate';
export type { TDDInput } from './gates/tdd-gate';
export { MakerVerifierGate } from './gates/maker-verifier-gate';
export type { MakerInput, MakerVerifierGateResult } from './gates/maker-verifier-gate';
export { DistillationGate } from './gates/distillation-gate';
export type { DistillationGateInput } from './gates/distillation-gate';

export type {
  GateDefinition,
  GateResult,
  GateSeverity,
  GateStatus,
  VerificationLayer,
  LayerResult,
  ConfidenceScore,
  RegressionResult,
  BarrierDecision,
} from './types';
