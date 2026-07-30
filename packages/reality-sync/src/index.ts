export { RealitySyncDaemon } from './watcher';
export { syncManifest } from './sync-manifest';
export { syncGaps } from './sync-gaps';
export { syncRegistry } from './sync-registry';
export { ProactiveInitiativeEngine } from './initiative-engine';
export { StudyIntensifier } from './study-intensifier';
export { StudyScanner, createStudyScanner } from './study-scanner';
export { SafetyCircuit } from './safety-circuit';
export { BHPProtocol } from './bhp-protocol';
export { UsabilityProfileEngine } from './usability-profile';
export { DecisionContinuityEngine } from './decision-continuity';
export { SafetyLayers } from './safety-layers';
export { applyProfile, getProfile, listProfiles, customizeProfile } from './profiles';
export { validate, validateConfigFile } from './config-validator';
export { TechRadarAPI, TechRadar, createTechRadar, createTechRadarAPI } from './tech-radar';
export type { TechItem, TechEvaluation, ScanHistoryEntry, TechRecommendation } from './tech-radar';
export { PathValidator, ScopeViolationError, createPathValidator, expectViolation, expectAllowed } from './path-validator';
export { ADRGenerator, createADRGenerator } from './adr-generator';
export { ADRValidator, createADRValidator } from './adr-validator';
export type { ADRValidationResult } from './adr-validator';
export { getTemplateNames, getTemplate, renderTemplate } from './adr-templates';
export { AutoStudyGenerator, createAutoStudyGenerator } from './auto-study';
export type { AutoStudyDraft, AutoStudyInput, StudySection, ViabilityScore } from './auto-study';
export type { SyncConfig, SyncResult, SyncEvent, FixAction, FixPlan, ScanResult, InitiativeReport } from './types';
export type { FixIssue } from './initiative-engine';
export type { TriggerStatus, RollbackPoint } from './safety-circuit';
export type { BHPStatus, BHPMessage } from './bhp-protocol';
export type { UserProfile, ProfileRecommendation, TeamPolicy } from './usability-profile';
export type { Decision, DecisionStatusReport, DecisionType } from './decision-continuity';
export type { LayerCheckResult, LayerName, SafetyAction, SafetyLayersStatus } from './safety-layers';
export type { ProfilePreset, ProfileLevel, RiskThreshold } from './profiles';
export type { ConfigValidationResult, ConfigError } from './config-validator';

import * as path from 'node:path';
import { createLogger } from '@ideia/logger';
import { SyncConfig } from './types';

export function createDefaultConfig(workspaceRoot: string): SyncConfig {
  return {
    workspaceRoot,
    docsDir: path.join(workspaceRoot, 'docs'),
    packagesDir: path.join(workspaceRoot, 'packages'),
    manifestPath: path.join(workspaceRoot, 'docs', 'governance', 'REALITY-MANIFEST.md'),
    gapsPath: path.join(workspaceRoot, 'docs', 'governance', 'GAPS-PRODUCAO-IDE.md'),
    registryPath: path.join(workspaceRoot, 'docs', 'governance', 'document-registry.md'),
    watchPaths: [
      path.join(workspaceRoot, 'packages'),
      path.join(workspaceRoot, 'docs'),
      path.join(workspaceRoot, 'docs', 'governance'),
    ],
    ignorePatterns: ['node_modules', 'dist', '.git', 'coverage', '.ai'],
  };
}
