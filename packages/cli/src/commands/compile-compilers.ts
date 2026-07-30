import { LawsConfig, ProjectManifest, Target } from './compile-types';
import { getBaseRules, getProjectName, getFramework, getCoverageMin } from './compile-readers';

type CompilerFn = (manifest: ProjectManifest, laws: LawsConfig, globalRules: string[], policies: string[]) => string;

function formatRules(baseRules: string[]): string {
  return baseRules.map(r => r.trim()).filter(Boolean).map(r => `- ${r}`).join('\n');
}

export const compileClaude: CompilerFn = (manifest, laws, globalRules, policies) => {
  const base = getBaseRules(laws, globalRules, policies);
  const name = getProjectName(manifest);
  return `# ${name}\n\n${laws.architecture ? `Architecture: ${laws.architecture}\n` : ''}${laws.defensive_programming ? 'Defensive Programming: true\n' : ''}${laws.contract_first ? 'Contract-First: true\n' : ''}\n## Rules\n${formatRules(base)}`;
};

export const compileCursor: CompilerFn = (manifest, laws, globalRules, policies) => {
  const base = getBaseRules(laws, globalRules, policies);
  const fw = getFramework(manifest);
  return `You are an expert ${fw} developer.\n\n${laws.architecture ? `Architecture: ${laws.architecture}\n` : ''}${formatRules(base)}`;
};

export const compileCopilot: CompilerFn = (manifest, laws, globalRules, policies) => {
  const base = getBaseRules(laws, globalRules, policies);
  return `# COPILOT INSTRUCTIONS\n\n${formatRules(base)}\n\n## Best Practices\n- Follow SOLID principles\n- Write tests first\n- Document public APIs`;
};

export const compileWindsurf: CompilerFn = (manifest, laws, globalRules, policies) => {
  const base = getBaseRules(laws, globalRules, policies);
  return `# Windsurf Rules for ${getProjectName(manifest)}\n\n${formatRules(base)}`;
};

export const compileCline: CompilerFn = (manifest, laws, globalRules, policies) => {
  const base = getBaseRules(laws, globalRules, policies);
  return `# Cline Memory Bank\n\nProject: ${getProjectName(manifest)}\nArchitecture: ${laws.architecture || 'Not specified'}\nRules:\n${formatRules(base)}`;
};

export const compileGemini: CompilerFn = (manifest, laws, globalRules, policies) => {
  const base = getBaseRules(laws, globalRules, policies);
  return `You are Gemini, an AI assistant for ${getProjectName(manifest)}.\n\n${formatRules(base)}\n\nTech Stack: ${getFramework(manifest)}`;
};

export const compileContinue: CompilerFn = (manifest, laws, globalRules, policies) => {
  const base = getBaseRules(laws, globalRules, policies);
  return `{\n  \"name\": \"${getProjectName(manifest)}\",\n  \"rules\": [${base.map(r => `\n    \"${r.replace(/"/g, '\\"')}\"`).join(',')}\n  ]\n}`;
};

export const compileZed: CompilerFn = (manifest, laws, globalRules, policies) => {
  const base = getBaseRules(laws, globalRules, policies);
  return `# ${getProjectName(manifest)} - ${getFramework(manifest)}\n${laws.architecture ? `Architecture: ${laws.architecture}\n` : ''}${formatRules(base)}`;
};

export const compileAmazonQ: CompilerFn = (manifest, laws, globalRules, policies) => {
  const base = getBaseRules(laws, globalRules, policies);
  return `Amazon Q Developer - Project Context\n\nProject: ${getProjectName(manifest)}\n${formatRules(base)}`;
};

export const compileCodex: CompilerFn = (manifest, laws, globalRules, policies) => {
  const base = getBaseRules(laws, globalRules, policies);
  return `OpenAI Codex Context for ${getProjectName(manifest)}\n\n${formatRules(base)}`;
};

export const compileAider: CompilerFn = (manifest, laws, globalRules, policies) => {
  const base = getBaseRules(laws, globalRules, policies);
  return `# ${getProjectName(manifest)}\n${formatRules(base)}`;
};

export const compileCursorMdc: CompilerFn = (manifest, laws, globalRules, policies) => {
  const base = getBaseRules(laws, globalRules, policies);
  return `---\ndescription: Rules for ${getProjectName(manifest)}\nglobs: **/*.{ts,tsx,js,jsx}\n---\n\n${formatRules(base)}`;
};

export const compileGithubActions: CompilerFn = (manifest, laws, globalRules, policies) => {
  const coverageMin = getCoverageMin(manifest);
  return `name: CI\non: [push, pull_request]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm ci\n      - run: npm test\n      - run: npm run lint\n      - run: npm run typecheck\n      - if: github.event_name == 'pull_request'\n        run: npx jest --coverage --coverageThreshold='{\"global\":{\"lines\":${coverageMin}}}'\n`;
};

export const COMPILERS: Record<Target, CompilerFn> = {
  claude: compileClaude, cursor: compileCursor, copilot: compileCopilot,
  windsurf: compileWindsurf, cline: compileCline, gemini: compileGemini,
  'continue': compileContinue, zed: compileZed, 'amazon-q': compileAmazonQ,
  codex: compileCodex, aider: compileAider, 'cursor-mdc': compileCursorMdc,
  'github-actions': compileGithubActions,
};

export const TARGET_PATHS: Record<Target, string> = {
  claude: 'CLAUDE.md', cursor: '.cursorrules', copilot: '.github/copilot-instructions.md',
  windsurf: '.windsurfrules', cline: 'CLINE.md', gemini: 'GEMINI.md',
  'continue': '.continuerc.json', zed: '.zed/rules.json', 'amazon-q': 'AMAZON_Q.md',
  codex: 'CODEX.md', aider: 'AIDER.md', 'cursor-mdc': '.cursor/rules/project-rules.mdc',
  'github-actions': '.github/workflows/ci.yml',
};
