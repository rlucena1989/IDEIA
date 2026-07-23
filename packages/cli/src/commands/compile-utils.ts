import path from 'node:path';
import YAML from 'yaml';
import { getIO } from '../io';

/** Tipo que define target. */
export type Target = typeof TARGETS[number];
/** Processa a r g e t s. */
export const TARGETS = [
  'claude', 'cursor', 'copilot', 'windsurf', 'cline',
  'gemini', 'continue', 'zed', 'amazon-q', 'codex',
  'aider', 'cursor-mdc', 'github-actions',
] as const;

/** Interface que define a estrutura de laws config. */
export interface LawsConfig {
  architecture?: string;
  defensive_programming?: boolean;
  contract_first?: boolean;
  rules?: string[];
  path_scoped_rules?: Record<string, string[]>;
}

interface PathScopedOutput {
  path: string;
  content: string;
}

/** Interface que define a estrutura de project manifest. */
export interface ProjectManifest {
  project?: { name?: string };
  backend?: { framework?: string };
  frontend?: { framework?: string };
  quality?: { coverage_min?: number; unit_tests?: boolean };
}

/**
 * Lê laws.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function readLaws(root: string): LawsConfig {
  const lawsPath = path.join(root, '.ai/laws.yaml');
  if (!getIO().fs.exists(lawsPath)) return { rules: [] };
  try { return YAML.parse(getIO().fs.read(lawsPath, 'utf8')) || {}; }
  catch { return { rules: [] }; }
}

/**
 * Lê manifest.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function readManifest(root: string): ProjectManifest {
  const manifestPath = path.join(root, '.ai/project-manifest.yaml');
  if (!getIO().fs.exists(manifestPath)) return {};
  try { return (YAML.parse(getIO().fs.read(manifestPath, 'utf8')) as ProjectManifest) || {}; }
  catch { return {}; }
}

/**
 * Lê global rules.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function readGlobalRules(root: string): string[] {
  const rulesPath = path.join(root, '.ai/rules/global.rules.md');
  if (getIO().fs.exists(rulesPath)) {
    return getIO().fs.read(rulesPath, 'utf8').split('\n')
      .map(l => l.replace(/^- /, '').trim())
      .filter(l => l.length > 0 && !l.startsWith('#'));
  }
  return [];
}

/**
 * Lê policies.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function readPolicies(root: string): string[] {
  const policiesDir = path.join(root, '.ai/policies');
  const policyLines: string[] = [];
  if (getIO().fs.exists(policiesDir)) {
    const files = getIO().fs.readDir(policiesDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
    for (const file of files) {
      const content = getIO().fs.read(path.join(policiesDir, file), 'utf8');
      const parsed = YAML.parse(content);
      if (parsed?.forbidden_tokens) {
        policyLines.push(`Forbidden tokens: ${parsed.forbidden_tokens.join(', ')}`);
      }
      if (parsed?.required_files) {
        policyLines.push(`Required files: ${parsed.required_files.join(', ')}`);
      }
    }
  }
  return policyLines;
}

/**
 * Obtém base rules.
 * @param laws - Valor laws.
 * @param globalRules - Valor rules.
 * @param policies - Valor policies.
 * @returns O resultado da operação.
 */
export function getBaseRules(laws: LawsConfig, globalRules: string[], policies: string[]): string[] {
  return [...(laws.rules || []), ...globalRules, ...policies];
}

/**
 * Obtém project name.
 * @param manifest - Valor manifest.
 * @returns O resultado da operação.
 */
export function getProjectName(manifest: ProjectManifest): string {
  return manifest.project?.name || 'project';
}

/**
 * Obtém framework.
 * @param manifest - Valor manifest.
 * @returns O resultado da operação.
 */
export function getFramework(manifest: ProjectManifest): string {
  return manifest.backend?.framework || 'unknown';
}

/**
 * Obtém coverage min.
 * @param manifest - Valor manifest.
 * @returns O resultado da operação.
 */
export function getCoverageMin(manifest: ProjectManifest): number {
  return manifest.quality?.coverage_min || 80;
}

/**
 * Compila claude.
 * @param manifest - Valor manifest.
 * @param laws - Valor laws.
 * @param globalRules - Valor rules.
 * @param policies - Valor policies.
 * @returns O resultado da operação.
 */
export function compileClaude(manifest: ProjectManifest, laws: LawsConfig, globalRules: string[], policies: string[]): string {
  const rules = getBaseRules(laws, globalRules, policies);
  const projectName = getProjectName(manifest);
  return `# Claude Code Instructions — ${projectName}

## Architecture
- Architecture: ${laws.architecture || 'Clean Architecture'}
- Defensive programming: ${laws.defensive_programming !== false}
- Contract-first: ${laws.contract_first !== false}

## Rules
${rules.map(r => `- ${r}`).join('\n')}

## Stack
${manifest.backend?.framework ? `- Backend: ${manifest.backend.framework}` : ''}
${manifest.frontend?.framework ? `- Frontend: ${manifest.frontend.framework}` : ''}
${manifest.quality?.coverage_min ? `- Coverage min: ${manifest.quality.coverage_min}%` : ''}
`;
}

/**
 * Compila cursor.
 * @param manifest - Valor manifest.
 * @param laws - Valor laws.
 * @param globalRules - Valor rules.
 * @param policies - Valor policies.
 * @returns O resultado da operação.
 */
export function compileCursor(manifest: ProjectManifest, laws: LawsConfig, globalRules: string[], policies: string[]): string {
  const rules = getBaseRules(laws, globalRules, policies);
  return `---
description: AI-Devkit Governance Rules
globs: 
---
# AI-Devkit — Cursor Rules

## Architecture
- ${laws.architecture || 'Clean Architecture'}
- Defensive programming: ${laws.defensive_programming !== false}
- Contract-first: ${laws.contract_first !== false}

## Required Rules
${rules.map(r => `- ${r}`).join('\n')}
`;
}

/**
 * Compila copilot.
 * @param manifest - Valor manifest.
 * @param laws - Valor laws.
 * @param globalRules - Valor rules.
 * @param policies - Valor policies.
 * @returns O resultado da operação.
 */
export function compileCopilot(manifest: ProjectManifest, laws: LawsConfig, globalRules: string[], policies: string[]): string {
  const rules = getBaseRules(laws, globalRules, policies);
  const projectName = getProjectName(manifest);
  return `# GitHub Copilot Instructions — ${projectName}

## Architecture
- Architecture: ${laws.architecture || 'Clean Architecture'}
- Defensive programming: ${laws.defensive_programming !== false}
- Contract-first: ${laws.contract_first !== false}

## Coding Rules
${rules.map(r => `- ${r}`).join('\n')}

## Testing
- Coverage minimum: ${getCoverageMin(manifest)}%
- Unit tests required: ${manifest.quality?.unit_tests !== false}
`;
}

/**
 * Compila windsurf.
 * @param manifest - Valor manifest.
 * @param laws - Valor laws.
 * @param globalRules - Valor rules.
 * @param policies - Valor policies.
 * @returns O resultado da operação.
 */
export function compileWindsurf(manifest: ProjectManifest, laws: LawsConfig, globalRules: string[], policies: string[]): string {
  const rules = getBaseRules(laws, globalRules, policies);
  return `# Windsurf Governance Rules

## Architecture
- ${laws.architecture || 'Clean Architecture'}

## Rules
${rules.map(r => `- ${r}`).join('\n')}

## Quality Gates
- Run \`ai-devkit verify\` before submitting
- Coverage minimum: ${getCoverageMin(manifest)}%
`;
}

/**
 * Compila cline.
 * @param manifest - Valor manifest.
 * @param laws - Valor laws.
 * @param globalRules - Valor rules.
 * @param policies - Valor policies.
 * @returns O resultado da operação.
 */
export function compileCline(manifest: ProjectManifest, laws: LawsConfig, globalRules: string[], policies: string[]): string {
  const rules = getBaseRules(laws, globalRules, policies);
  const projectName = getProjectName(manifest);
  return `# Cline Rules — ${projectName}

## Project
${((manifest.backend as Record<string, unknown> | undefined)?.framework as string) ? `- Framework: ${(manifest.backend as Record<string, unknown>).framework}` : ''}
${laws.architecture || "Clean Architecture"}
${((manifest.quality as Record<string, unknown> | undefined)?.coverage_min as number) ? `- Coverage min: ${(manifest.quality as Record<string, unknown>).coverage_min}%` : ''}

## Mandatory Rules
${rules.map(r => `- ${r}`).join('\n')}

## Before committing
- Run \`ai-devkit verify\`
- Ensure all tests pass
`;
}

/**
 * Compila gemini.
 * @param manifest - Valor manifest.
 * @param laws - Valor laws.
 * @param globalRules - Valor rules.
 * @param policies - Valor policies.
 * @returns O resultado da operação.
 */
export function compileGemini(manifest: ProjectManifest, laws: LawsConfig, globalRules: string[], policies: string[]): string {
  const rules = getBaseRules(laws, globalRules, policies);
  const projectName = getProjectName(manifest);
  return `# Gemini Code Assist Instructions — ${projectName}

## Project Context
- Architecture: ${laws.architecture || 'Clean Architecture'}
- Framework: ${getFramework(manifest)}
- Defensive programming: ${laws.defensive_programming !== false}

## Development Rules
${rules.map(r => `- ${r}`).join('\n')}

## Quality Standards
- Minimum coverage: ${getCoverageMin(manifest)}%
- All public functions must have JSDoc
- Domain layer must not import infrastructure
`;
}

/**
 * Compila continue.
 * @param manifest - Valor manifest.
 * @param laws - Valor laws.
 * @param globalRules - Valor rules.
 * @param policies - Valor policies.
 * @returns O resultado da operação.
 */
export function compileContinue(manifest: ProjectManifest, laws: LawsConfig, globalRules: string[], policies: string[]): string {
  const rules = getBaseRules(laws, globalRules, policies);
  const projectName = getProjectName(manifest);
  return `# Continue Dev Rules — ${projectName}

## Architecture
${laws.architecture || 'Clean Architecture'}

## Rules
${rules.map(r => `- ${r}`).join('\n')}

## Testing
Coverage minimum: ${getCoverageMin(manifest)}%
`;
}

/**
 * Compila zed.
 * @param manifest - Valor manifest.
 * @param laws - Valor laws.
 * @param globalRules - Valor rules.
 * @param policies - Valor policies.
 * @returns O resultado da operação.
 */
export function compileZed(manifest: ProjectManifest, laws: LawsConfig, globalRules: string[], policies: string[]): string {
  const rules = getBaseRules(laws, globalRules, policies);
  return `# Zed Editor Rules

## Architecture
${laws.architecture || 'Clean Architecture'}

## Rules
${rules.map(r => `- ${r}`).join('\n')}

## Before commit
- Run \`ai-devkit verify\`
- Run tests
`;
}

/**
 * Compila amazon q.
 * @param manifest - Valor manifest.
 * @param laws - Valor laws.
 * @param globalRules - Valor rules.
 * @param policies - Valor policies.
 * @returns O resultado da operação.
 */
export function compileAmazonQ(manifest: ProjectManifest, laws: LawsConfig, globalRules: string[], policies: string[]): string {
  const rules = getBaseRules(laws, globalRules, policies);
  const projectName = getProjectName(manifest);
  return `# Amazon Q Developer Rules — ${projectName}

## Architecture
- ${laws.architecture || 'Clean Architecture'}
- Defensive programming: ${laws.defensive_programming !== false}

## Development Guidelines
${rules.map(r => `- ${r}`).join('\n')}

## Quality
- Coverage minimum: ${getCoverageMin(manifest)}%
`;
}

/**
 * Compila codex.
 * @param manifest - Valor manifest.
 * @param laws - Valor laws.
 * @param globalRules - Valor rules.
 * @param policies - Valor policies.
 * @returns O resultado da operação.
 */
export function compileCodex(manifest: ProjectManifest, laws: LawsConfig, globalRules: string[], policies: string[]): string {
  const rules = getBaseRules(laws, globalRules, policies);
  const projectName = getProjectName(manifest);
  return `# OpenAI Codex Instructions — ${projectName}

## Architecture
${laws.architecture || 'Clean Architecture'}

## Rules
${rules.map(r => `- ${r}`).join('\n')}

## Testing
Coverage minimum: ${getCoverageMin(manifest)}%
`;
}

/**
 * Compila aider.
 * @param manifest - Valor manifest.
 * @param laws - Valor laws.
 * @param globalRules - Valor rules.
 * @param policies - Valor policies.
 * @returns O resultado da operação.
 */
export function compileAider(manifest: ProjectManifest, laws: LawsConfig, globalRules: string[], policies: string[]): string {
  const rules = getBaseRules(laws, globalRules, policies);
  const projectName = getProjectName(manifest);
  return `# Aider AI Instructions — ${projectName}

## Architecture
${laws.architecture || 'Clean Architecture'}

## Rules
${rules.map(r => `- ${r}`).join('\n')}

## Quality Gates
- Run \`ai-devkit verify\` before commit
- Coverage minimum: ${getCoverageMin(manifest)}%
`;
}

/**
 * Compila cursor mdc.
 * @param manifest - Valor manifest.
 * @param laws - Valor laws.
 * @param globalRules - Valor rules.
 * @param policies - Valor policies.
 * @returns O resultado da operação.
 */
export function compileCursorMdc(manifest: ProjectManifest, laws: LawsConfig, globalRules: string[], policies: string[]): string {
  const rules = getBaseRules(laws, globalRules, policies);
  return `---
description: AI-Devkit Governance Rules (MDC format)
globs: 
---
# AI-Devkit — Cursor MDC Rules

## Architecture
- ${laws.architecture || 'Clean Architecture'}

## Rules
${rules.map(r => `- ${r}`).join('\n')}

## Quality
- Coverage minimum: ${getCoverageMin(manifest)}%
`;
}

/**
 * Compila github actions.
 * @param manifest - Valor manifest.
 * @param laws - Valor laws.
 * @param globalRules - Valor rules.
 * @param policies - Valor policies.
 * @returns O resultado da operação.
 */
export function compileGithubActions(manifest: ProjectManifest, laws: LawsConfig, globalRules: string[], policies: string[]): string {
  const rules = getBaseRules(laws, globalRules, policies);
  const projectName = getProjectName(manifest);
  return `# GitHub Actions AI Instructions — ${projectName}

## Architecture
${laws.architecture || 'Clean Architecture'}

## Rules
${rules.map(r => `- ${r}`).join('\n')}

## CI Requirements
- Coverage minimum: ${getCoverageMin(manifest)}%
- Run \`ai-devkit verify\` in CI pipeline
`;
}

/** Processa o m p i l e r s. */
export const COMPILERS: Record<Target, (manifest: ProjectManifest, laws: LawsConfig, globalRules: string[], policies: string[]) => string> = {
  claude: compileClaude,
  cursor: compileCursor,
  copilot: compileCopilot,
  windsurf: compileWindsurf,
  cline: compileCline,
  gemini: compileGemini,
  continue: compileContinue,
  zed: compileZed,
  'amazon-q': compileAmazonQ,
  codex: compileCodex,
  aider: compileAider,
  'cursor-mdc': compileCursorMdc,
  'github-actions': compileGithubActions,
};

/** Processa a r g e t_ p a t h s. */
export const TARGET_PATHS: Record<Target, string> = {
  claude: 'CLAUDE.md',
  cursor: '.cursor/rules/ai-devkit.mdc',
  copilot: '.github/copilot-instructions.md',
  windsurf: '.windsurf/rules/governance.md',
  cline: '.clinerules',
  gemini: 'GEMINI.md',
  continue: '.continuerules',
  zed: '.rules',
  'amazon-q': '.amazonq/rules/governance.md',
  codex: 'AGENTS.md',
  aider: 'AGENTS.md',
  'cursor-mdc': '.cursor/rules/ai-devkit-global.mdc',
  'github-actions': '.github/ai-instructions.md',
};

/**
 * Obtém path scoped outputs.
 * @param root - Valor root.
 * @param manifest - Valor manifest.
 * @param laws - Valor laws.
 * @param globalRules - Valor rules.
 * @param policies - Valor policies.
 * @returns O resultado da operação.
 */
function getPathScopedOutputs(root: string, manifest: ProjectManifest, laws: LawsConfig, globalRules: string[], policies: string[]): PathScopedOutput[] {
  const outputs: PathScopedOutput[] = [];
  const scopedRules = laws.path_scoped_rules || {};

  for (const [scopePath, scopeRules] of Object.entries(scopedRules)) {
    const fullScopePath = path.join(root, scopePath);
    if (!getIO().fs.exists(fullScopePath)) continue;

    const projectName = getProjectName(manifest);
    const baseRules = getBaseRules(laws, globalRules, policies);

    outputs.push({
      path: path.join(scopePath, '.clinerules'),
      content: `# Cline Rules — ${projectName} (${scopePath})

## Scope-specific Rules
${scopeRules.map(r => `- ${r}`).join('\n')}

## Global Rules (inherited)
${baseRules.map(r => `- ${r}`).join('\n')}

## Before committing
- Run \`ai-devkit verify\`
- Ensure all tests pass
`,
    });

    outputs.push({
      path: path.join(scopePath, '.cursorrules'),
      content: `# Cursor Rules — ${projectName} (${scopePath})

## Scope-specific Rules
${scopeRules.map(r => `- ${r}`).join('\n')}

## Global Rules
${baseRules.map(r => `- ${r}`).join('\n')}
`,
    });
  }

  return outputs;
}
export { getPathScopedOutputs };

/**
     * Inicia watch.
     * @param root - Valor root.
     * @param intervalMs - Valor ms.
     * @returns O resultado da operação.
     */
    export function startWatch(root: string, intervalMs: number = 5000): NodeJS.Timeout {
  const { printLine } = require('../utils/output');
  const lawsPath = path.join(root, '.ai/laws.yaml');
  let lastMtime = getIO().fs.exists(lawsPath) ? getIO().fs.stat(lawsPath).mtimeMs : 0;

  printLine(`[WATCH] Monitoring ${lawsPath} every ${intervalMs}ms`);

  return setInterval(() => {
    if (!getIO().fs.exists(lawsPath)) return;
    const currentMtime = getIO().fs.stat(lawsPath).mtimeMs;
    if (currentMtime > lastMtime) {
      lastMtime = currentMtime;
      printLine(`[WATCH] Detected change in laws.yaml — recompiling...`);
      try {
        const manifest = readManifest(root);
        const laws = readLaws(root);
        const globalRules = readGlobalRules(root);
        const policies = readPolicies(root);

        for (const target of TARGETS) {
          const content = COMPILERS[target](manifest, laws, globalRules, policies);
          const relativePath = TARGET_PATHS[target];
          const fullPath = path.join(root, relativePath);
          getIO().fs.mkDir(path.dirname(fullPath), true);
          getIO().fs.write(fullPath, content);
        }

        const scopedOutputs = getPathScopedOutputs(root, manifest, laws, globalRules, policies);
        for (const output of scopedOutputs) {
          const fullPath = path.join(root, output.path);
          getIO().fs.mkDir(path.dirname(fullPath), true);
          getIO().fs.write(fullPath, output.content);
        }

        printLine(`[WATCH] Recompiled ${TARGETS.length} targets + ${scopedOutputs.length} scoped rules successfully`);
      } catch (_err) {
        const msg = err instanceof Error ? err.message : String(err);
        printLine(`[WATCH] Error recompiling: ${msg}`);
      }
    }
  }, intervalMs);
}
