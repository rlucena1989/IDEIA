import path from 'node:path';
import YAML from 'yaml';
import { getIO } from '../io';
import { LawsConfig, ProjectManifest } from './compile-types';

export function readLaws(root: string): LawsConfig {
  const lawsPath = path.join(root, '.ai/laws.yaml');
  if (!getIO().fs.exists(lawsPath)) return { rules: [] };
  try { return YAML.parse(getIO().fs.read(lawsPath, 'utf8')) || {}; } catch { return { rules: [] }; }
}

export function readManifest(root: string): ProjectManifest {
  const manifestPath = path.join(root, '.ai/project-manifest.yaml');
  if (!getIO().fs.exists(manifestPath)) return {};
  try { return YAML.parse(getIO().fs.read(manifestPath, 'utf8')) || {}; } catch { return {}; }
}

export function readGlobalRules(root: string): string[] {
  const rulesPath = path.join(root, '.ai/rules');
  if (!getIO().fs.exists(rulesPath)) return [];
  try {
    return getIO().fs.readDir(rulesPath)
      .filter((f: string) => f.endsWith('.md'))
      .map((f: string) => getIO().fs.read(path.join(rulesPath, f), 'utf8'));
  } catch { return []; }
}

export function readPolicies(root: string): string[] {
  const policiesPath = path.join(root, '.ai/policies');
  if (!getIO().fs.exists(policiesPath)) return [];
  try {
    return getIO().fs.readDir(policiesPath)
      .filter((f: string) => f.endsWith('.yaml') || f.endsWith('.yml'))
      .map((f: string) => getIO().fs.read(path.join(policiesPath, f), 'utf8'));
  } catch { return []; }
}

export function getBaseRules(laws: LawsConfig, globalRules: string[], policies: string[]): string[] {
  return [...(laws.rules || []), ...globalRules, ...policies];
}

export function getProjectName(manifest: ProjectManifest): string {
  return manifest.project?.name || 'unknown';
}

export function getFramework(manifest: ProjectManifest): string {
  return manifest.backend?.framework || manifest.frontend?.framework || 'unknown';
}

export function getCoverageMin(manifest: ProjectManifest): number {
  return manifest.quality?.coverage_min ?? 80;
}
