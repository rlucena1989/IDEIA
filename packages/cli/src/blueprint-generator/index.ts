export { Scaffolder } from './scaffolder';
export { TemplateEngine, defaultHelpers, buildTemplateContext } from './template-engine';
export type { TemplateHelpers } from './template-engine';
export { DependencyResolver } from './dependency-resolver';
export { ConfigGenerator } from './config-generator';
export { ContractGenerator } from './contract-generator';
export { ADRGenerator } from './adr-generator';
export { builtInBlueprints, getBlueprint, listBlueprints } from './blueprints/index';

export type {
  Blueprint,
  Variable,
  FileTemplate,
  Dependency,
  ConfigFile,
  ContractDefinition,
  ContractInterface,
  ContractMethod,
  ContractEvent,
  ADREntry,
  BlueprintManifest,
  ScaffoldOptions,
  ScaffoldResult,
  ResolvedDependencies,
  DependencyError,
  DependencyWarning,
  GeneratedConfig,
  GeneratedContract,
  GeneratedADR,
  TemplateContext,
} from './types';
