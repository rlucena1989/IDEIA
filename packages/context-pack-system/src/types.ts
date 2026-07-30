export type SectionFormat = 'markdown' | 'code' | 'json' | 'yaml' | 'text' | 'table';
export type PackPriority = 'P0' | 'P1' | 'P2';
export type PackLevel = 'beginner' | 'intermediate' | 'advanced';
export type TemplateEngineType = 'ejs' | 'handlebars' | 'none';
export type SlicingStrategy = 'truncate' | 'summarize' | 'priority' | 'remove';
export type HookType = 'beforeInject' | 'afterInject' | 'beforeGenerate';
export type VariableType = 'string' | 'number' | 'boolean' | 'enum' | 'path' | 'language' | 'framework';
export type PackLifecycleState = 'draft' | 'validated' | 'canary' | 'released' | 'active' | 'deprecated' | 'replaced' | 'removed';
export type HierarchyLevel = 'project' | 'team' | 'personal' | 'task';
export type MergeStrategy = 'priority' | 'latest' | 'most_specific';
export type ABTestRecommendation = 'roll_out' | 'roll_back' | 'continue_testing' | 'inconclusive';

export interface VariableDefinition {
  name: string; type: VariableType; description: string;
  default?: unknown; required: boolean; enum?: string[]; example?: string;
}
export interface Section {
  id: string; title: string; format: SectionFormat; priority: PackPriority;
  content: string; contentShort?: string; contentMedium?: string;
  maxTokens?: number; variables?: string[]; tags?: string[];
}
export interface Dependency {
  pack: string; version: string; required: boolean; description?: string;
}
export interface SliceRule {
  maxTokens: number; strategy: SlicingStrategy;
  removeSections?: string[]; maxSections?: number;
}
export interface Hook {
  type: HookType; script: string; lang: 'js' | 'ts' | 'sh';
}
export interface PackExample {
  title: string; code: string; language?: string;
}
export interface ContextPack {
  name: string; version: string; displayName?: string;
  description: string; author?: string; created?: string; updated?: string;
  tags: string[]; categories: string[]; level: PackLevel;
  variables: VariableDefinition[]; sections: Section[];
  dependencies: Dependency[]; slicing: SliceRule[]; hooks: Hook[];
  examples: PackExample[];
  totalTokens?: number; totalTokensShort?: number;
  compatibleEngines?: string[];
  deprecated?: boolean; deprecationMessage?: string;
  replaces?: string; replacedBy?: string;
}
export interface RegistryIndexEntry {
  name: string; version: string; tags: string[]; totalTokens: number; path?: string;
}
export interface RegistryIndex {
  version: number; updated: string; packs: RegistryIndexEntry[];
}
export interface ResolvedPack {
  pack: ContextPack; dependencies: ContextPack[]; resolvedAt: string;
}
export interface DependencyGraph {
  nodes: string[]; edges: { from: string; to: string; required: boolean }[];
}
export interface DependencyStatus {
  pack: string; version: string; required: boolean;
  resolved: boolean; resolvedVersion?: string; error?: string;
}
export interface CacheStats {
  size: number; hits: number; misses: number; hitRate: number;
}
export interface RegistryValidation {
  valid: boolean; errors: string[]; warnings: string[];
  totalPacks: number; brokenDependencies: number;
}
export interface SearchOptions {
  limit?: number; offset?: number;
  sortBy?: 'name' | 'version' | 'totalTokens'; sortOrder?: 'asc' | 'desc';
}
export interface ListOptions {
  includeDeprecated?: boolean; category?: string; tag?: string; level?: PackLevel;
}
export interface InjectedContext {
  prompt: string; usedPacks: string[]; totalTokens: number; maxTokens: number;
  sections: RenderedSection[]; variables: Record<string, unknown>;
  warnings: string[]; sliced: boolean;
}
export interface RenderedSection {
  id: string; pack: string; title: string; content: string;
  tokens: number; priority: PackPriority; included: boolean;
}
export interface SlicedResult {
  included: RenderedSection[]; excluded: RenderedSection[];
  totalTokens: number; maxTokens: number; overflowPct: number;
}
export interface CombineOptions {
  showSummary: boolean; usedPacks: string[];
}
export interface ValidationResult {
  valid: boolean; errors: ValidationError[]; warnings: ValidationError[];
}
export interface ValidationError {
  code: string; message: string; severity: 'error' | 'warning'; field?: string;
}
export interface DependencyValidation {
  valid: boolean; dependencies: DependencyStatus[];
}
export interface VariableValidation {
  valid: boolean; undefinedVars: string[]; unusedVars: string[]; mismatchedTypes: string[];
}
export interface SlicingValidation {
  valid: boolean; warnings: string[];
}
export interface HookValidation {
  valid: boolean; errors: string[];
}
export interface FullValidation {
  schema: ValidationResult; dependencies: DependencyValidation;
  variables: VariableValidation; slicing: SlicingValidation;
  hooks: HookValidation; overall: boolean;
}
export interface CompatibilityResult {
  compatible: boolean; conflicts: string[];
}
export interface ConsistencyResult {
  consistent: boolean; issues: string[];
}
export interface GenerateOptions {
  outputPath?: string; autoRegister?: boolean;
  estimateTokens?: boolean; validateAfter?: boolean;
  versionStrategy?: 'patch' | 'minor' | 'major' | 'auto';
}
export interface RefreshOptions {
  estimateTokens?: boolean; validateAfter?: boolean;
  bumpVersion?: boolean; versionStrategy?: 'patch' | 'minor' | 'major';
}
export interface TaskInfo {
  type: string; complexity: 'simple' | 'moderate' | 'complex';
  domain?: string; language?: string; framework?: string; description: string;
}
export interface LLMConfig {
  maxTokens: number; reservedForOutput: number;
  reservedForHistory: number; model: string;
}
export interface HistoryInfo {
  tokens: number; messages: number;
}
export interface ContextBudget {
  totalAvailable: number; requiredReserve: number;
  effectiveBudget: number; minPerPack: number; maxPerPack: number;
}
export interface SelectedPacks {
  required: string[]; primary: string[]; secondary: string[]; estimatedTokens: number;
}
export interface AdaptiveMetrics {
  totalRequests: number; avgContextTokens: number; avgSatisfactionScore: number;
  topPacks: { name: string; usage: number }[];
  slicingEfficiency: number; cacheHitRate: number;
}
export interface FeedbackDetails {
  missingTopics?: string[]; excessiveTokens?: number; satisfactionScore?: number;
}

// --- Frontier Types ---
export interface ChunkMetadata {
  packName: string; sectionId: string; tags: string[];
  tokens: number; embedding?: number[]; semanticVersion: string;
}
export interface RetrievalQuery {
  taskType: string; taskDescription: string;
  language?: string; framework?: string; domain?: string;
  maxTokens: number; minRelevance: number;
}
export interface RetrievedChunk {
  chunk: ChunkMetadata; content: string;
  relevanceScore: number; confidence: number;
}
export interface AttentionScorerConfig {
  encoderDim: number; numHeads: number; dropout: number; temperature: number;
}
export interface CompilationConfig {
  compressionRatio: number; minQualityPreservation: number;
  tokenReductionTarget: number; maxIterations: number; preserveP0: boolean;
}
export interface CompilationMetadata {
  sourcePacks: string[]; originalTokens: number; compiledTokens: number;
  compressionRatio: number; qualityScore: number;
  distillationTimestamp: string; preservedSections: string[];
}
export interface CompiledPack extends ContextPack {
  compilationMetadata: CompilationMetadata;
}
export interface ABTestConfig {
  minSampleSize: number; confidenceLevel: number;
  runLengthDays: number; seasonalityPeriod: number;
}
export interface ABTestResult {
  packName: string; versionA: string; versionB: string; metricName: string;
  meanA: number; meanB: number; lift: number;
  posteriorProbability: number; credibleInterval: [number, number];
  causalImpact: number; significant: boolean;
  recommendation: ABTestRecommendation;
  samplesA: number; samplesB: number;
}
export interface PersonalizationConfig {
  alpha: number; beta: number; explorationRate: number;
  decayFactor: number; windowSize: number; minObservations: number;
}
export interface DeveloperProfile {
  developerId: string; team: string; role: string;
  preferredPacks: Map<string, number>; avoidedPacks: Set<string>;
  contextLengthPreference: 'concise' | 'balanced' | 'detailed';
  languagePreference: string[]; frameworkPreference: string[];
}
export interface HierarchicalPackNode {
  pack: ContextPack; level: HierarchyLevel;
  priority: number; inherited: boolean; parent?: HierarchicalPackNode;
}
export interface HierarchicalContextConfig {
  mergeStrategy: MergeStrategy; allowOverrideSections: boolean;
  allowOverrideVariables: boolean; maxDepth: number;
}
export interface MergedContextPack extends ContextPack {
  hierarchy: { name: string; version: string; level: string }[];
  mergeWarnings: string[];
}
export interface PackVariant {
  name: string; version: string; description: string;
  tags: string[]; sectionCount: number; totalTokens: number;
}
export interface ContextInjectorConfig {
  templateEngine: TemplateEngineType; packSeparator: string;
  includeSummary: boolean; tokenTolerance: number; cacheTemplates: boolean;
}

// Legacy types for existing pack-manager.ts compatibility
export type ContextSection = Section;
export type PackAssembly = { packId: string; sections: ContextSection[]; totalTokens: number; budget: number; trimmedSections: string[] };
export type ContextSelector = { select(packs: ContextPack[], budget: number): ContextSection[] };
export type PackPriorityLegacy = { sectionId: string; score: number; reason: string };
