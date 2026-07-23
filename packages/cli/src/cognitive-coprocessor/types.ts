/** Interface que define a estrutura de normalized output. */
export interface NormalizedOutput {
  normalized: unknown;
  anomalies: Anomaly[];
  features: Feature[];
  metadata: Metadata;
}

/** Interface que define a estrutura de anomaly. */
export interface Anomaly {
  field: string;
  type: 'null' | 'out_of_range' | 'type_mismatch' | 'inconsistent';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

/** Interface que define a estrutura de feature. */
export interface Feature {
  name: string;
  value: number | string;
  category: string;
}

/** Interface que define a estrutura de metadata. */
export interface Metadata {
  inputType: string;
  recordCount: number;
  schemaValid: boolean;
  processingTimeMs: number;
}

/** Interface que define a estrutura de metric result. */
export interface MetricResult {
  label: string;
  value: number;
  interpretation: string;
}

/** Interface que define a estrutura de metrics output. */
export interface MetricsOutput {
  metrics: MetricResult[];
  summary: string;
}

/** Interface que define a estrutura de metric config. */
export interface MetricConfig {
  percentiles?: boolean;
  distribution?: boolean;
  trend?: boolean;
  growth?: boolean;
}

/** Interface que define a estrutura de priority item. */
export interface PriorityItem {
  id: string;
  label: string;
  urgency: number;
  impact: number;
  risk: number;
  dependencies?: string[];
}

/** Interface que define a estrutura de priority weights. */
export interface PriorityWeights {
  urgency: number;
  impact: number;
  risk: number;
}

/** Interface que define a estrutura de ranked item. */
export interface RankedItem extends PriorityItem {
  score: number;
}

/** Interface que define a estrutura de rank output. */
export interface RankOutput {
  ranked: RankedItem[];
  reasoning: string;
}

/** Interface que define a estrutura de rule. */
export interface Rule {
  field: string;
  type: 'logical' | 'numerical' | 'policy';
  condition: string;
  expected: unknown;
}

/** Interface que define a estrutura de inconsistency. */
export interface Inconsistency {
  field: string;
  type: 'logical' | 'numerical' | 'policy';
  message: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
}

/** Interface que define a estrutura de inconsistency output. */
export interface InconsistencyOutput {
  inconsistencies: Inconsistency[];
  severity: 'none' | 'low' | 'medium' | 'high';
  confidence: number;
}

/** Interface que define a estrutura de scenario. */
export interface Scenario {
  name: string;
  variables: Record<string, number>;
  rules?: ScenarioRule[];
  iterations?: number;
}

/** Interface que define a estrutura de scenario rule. */
export interface ScenarioRule {
  condition: string;
  outcome: string;
  weight?: number;
}

/** Interface que define a estrutura de outcome. */
export interface Outcome {
  scenario: string;
  result: number;
  probability: number;
  variables: Record<string, number>;
}

/** Interface que define a estrutura de simulate output. */
export interface SimulateOutput {
  outcomes: Outcome[];
  confidence: number;
  recommendations: string[];
}

/** Interface que define a estrutura de sim config. */
export interface SimConfig {
  mode: 'deterministic' | 'heuristic' | 'monte-carlo';
  iterations?: number;
}

/** Interface que define a estrutura de issue. */
export interface Issue {
  layer: 'structural' | 'numerical' | 'logical';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

/** Interface que define a estrutura de validate output. */
export interface ValidateOutput {
  valid: boolean;
  score: number;
  issues: Issue[];
  suggestions: string;
}

/** Interface que define a estrutura de problem descriptor. */
export interface ProblemDescriptor {
  type: 'numerical' | 'textual' | 'mixed' | 'ambiguous';
  input: string;
  domain?: string;
}

/** Interface que define a estrutura de context info. */
export interface ContextInfo {
  projectName?: string;
  availableEngines?: string[];
  thresholds?: Record<string, number>;
}

/** Interface que define a estrutura de hint. */
export interface Hint {
  type: 'calculation' | 'validation' | 'context' | 'constraint';
  message: string;
  priority: number;
}

/** Interface que define a estrutura de hints output. */
export interface HintsOutput {
  hints: Hint[];
  priority: number;
  deterministicPaths: string[];
}

/** Interface que define a estrutura de context options. */
export interface ContextOptions {
  format?: 'markdown' | 'json';
  includeRaw?: boolean;
}

/** Interface que define a estrutura de cognitive context. */
export interface CognitiveContext {
  normalizedInput: NormalizedOutput | null;
  metrics: MetricsOutput | null;
  inconsistencies: InconsistencyOutput | null;
  priorities: RankOutput | null;
  simulations: SimulateOutput | null;
  hints: HintsOutput | null;
  validationRules: string[];
}

/** Interface que define a estrutura de coprocess options. */
export interface CoprocessOptions {
  format?: 'json' | 'markdown' | 'llm-ready';
  normalize?: boolean;
  metrics?: boolean;
  rank?: boolean;
  detect?: boolean;
  simulate?: boolean;
  validate?: boolean;
  hints?: boolean;
  context?: boolean;
}

/** Processa e f a u l t_ p r i o r i t y_ w e i g h t s. */
export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  urgency: 0.4,
  impact: 0.35,
  risk: 0.25,
};
