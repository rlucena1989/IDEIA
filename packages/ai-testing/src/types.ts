export enum TestType { Unit = 'unit', Integration = 'integration', E2E = 'e2e' }

export enum TestGenerationMode { LLM = 'llm', Pattern = 'pattern', Hybrid = 'hybrid' }

export interface AnalysisContext {
  sourceFile: string;
  sourceCode: string;
  exports: ExportInfo[];
  dependencies: string[];
  types: TypeDefinition[];
  existingTests: string[];
  coverageData?: CoverageReport;
}

export interface ExportInfo {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'const' | 'variable';
  signature: string;
}

export interface TypeDefinition {
  name: string;
  kind: 'interface' | 'type' | 'enum';
  properties?: { name: string; type: string }[];
}

export interface CoverageReport {
  lines: number;
  branches: number;
  functions: number;
  statements: number;
}

export interface TestPlan {
  filePath: string;
  testType: TestType;
  testCases: TestCase[];
  estimatedEffort: number;
  priority: number;
}

export interface TestCase {
  name: string;
  description: string;
  type: 'happy-path' | 'edge-case' | 'error-case' | 'boundary' | 'performance';
  input?: unknown;
  expectedOutput?: unknown;
  setup?: string[];
  mocks?: string[];
}

export interface GeneratedTest {
  filePath: string;
  content: string;
  plan: TestPlan;
  validation: ValidationResult;
}

export interface ValidationResult {
  compiles: boolean;
  compileErrors?: string[];
  testsPass: boolean;
  failedTests?: string[];
  coverage: CoverageReport;
  score: number;
}

export interface RepairResult {
  test: string;
  fix: string;
  status: 'repaired' | 'failed' | 'skipped';
  confidence: number;
}

export interface MutationResult {
  mutationScore: number;
  survivors: MutationSurvivor[];
  killed: number;
  total: number;
}

export interface MutationSurvivor {
  mutantId: string;
  location: { file: string; line: number; column: number };
  originalCode: string;
  mutatedCode: string;
  reason: string;
}

export interface ClassificationResult {
  testType: TestType;
  confidence: number;
  features: string[];
  details: string;
}

export interface ClassificationMetrics {
  accuracy: number;
  totalClassified: number;
  correctClassifications: number;
  lastNCorrect: number;
  meetsThreshold: boolean;
}

export interface ClassificationFeedback {
  actualType: TestType;
  predictedType: TestType;
  features: string[];
  correct: boolean;
  confidence?: number;
}

export interface TestPlannerConfig {
  enableConfidenceTracking: boolean;
  accuracyThreshold: number;
  feedbackCollection: boolean;
}
