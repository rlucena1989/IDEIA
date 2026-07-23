import fs from 'node:fs';
import path from 'node:path';

/** Interface que define a estrutura de bootstrap config. */
export interface BootstrapConfig {
  projectName: string;
  stack: 'node' | 'python' | 'go' | 'rust';
  features: string[];
  outputDir: string;
}

/** Interface que define a estrutura de bootstrap result. */
export interface BootstrapResult {
  created: string[];
  skipped: string[];
  errors: string[];
  summary: string;
}

const BOOTSTRAP_TEMPLATES: Record<string, (name: string) => string> = {
  'package.json_node': (name) => JSON.stringify({ name, version: '1.0.0', private: true, scripts: { build: 'tsc', test: 'jest', dev: 'ts-node src/index.ts' }, devDependencies: { typescript: '^5.0.0', jest: '^29.0.0' } }, null, 2),
  'tsconfig.json': () => JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'commonjs', strict: true, esModuleInterop: true, outDir: './dist', rootDir: './src' }, include: ['src'] }, null, 2),
  'src/index.ts': () => 'console.log("Hello, world!");\n',
  '.gitignore': () => 'node_modules/\ndist/\n.env\n*.log\n',
  'README.md': (name) => `# ${name}\n\n## Getting Started\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`,
  'src/app.ts': () => `import express from 'express';\n\nconst app = express();\nconst port = process.env.PORT || 3000;\n\napp.get('/', (req, res) => {\n  res.json({ status: 'ok' });\n});\n\napp.listen(port, () => {\n  console.log(\`Server running on port \${port}\`);\n});\n`,
  'src/__tests__/app.test.ts': () => `describe('App', () => {\n  it('should work', () => {\n    expect(true).toBe(true);\n  });\n});\n`,
  'Dockerfile': (_name) => `FROM node:20-alpine\nWORKDIR /app\nCOPY package.json .\nRUN npm install\nCOPY . .\nRUN npm run build\nCMD ["node", "dist/index.js"]\n`,
  'docker-compose.yml': (_name) => `version: '3.8'\nservices:\n  app:\n    build: .\n    ports:\n      - "3000:3000"\n    environment:\n      - NODE_ENV=production\n`,
  '.env.example': () => 'PORT=3000\nNODE_ENV=development\n',
};

/**
 * Scaffolds a new project from bootstrap templates based on the provided config.
 * @param config - Project name, stack, features and output directory.
 * @returns Summary of created, skipped and errored files.
 */
export function bootstrapProject(config: BootstrapConfig): BootstrapResult {
  const created: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  const baseDir = path.resolve(config.outputDir, config.projectName);
  try {
    fs.mkdirSync(baseDir, { recursive: true });
  } catch (e: unknown) {
    errors.push(`Nao foi possivel criar diretorio: ${e instanceof Error ? e.message : String(e)}`);
    return { created, skipped, errors, summary: `Falha: ${errors.length} erros` };
  }

  const templatesToGenerate = ['package.json_node', 'tsconfig.json', 'src/index.ts', '.gitignore', 'README.md'];

  if (config.features.includes('express') || config.features.includes('api')) {
    templatesToGenerate.push('src/app.ts', 'src/__tests__/app.test.ts');
  }
  if (config.features.includes('docker')) {
    templatesToGenerate.push('Dockerfile', 'docker-compose.yml');
  }
  if (config.features.includes('env')) {
    templatesToGenerate.push('.env.example');
  }

  for (const [key, generator] of Object.entries(BOOTSTRAP_TEMPLATES)) {
    if (!templatesToGenerate.includes(key)) continue;
    const filePath = path.join(baseDir, key.replace('_node', ''));
    try {
      if (fs.existsSync(filePath)) {
        skipped.push(filePath);
        continue;
      }
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, generator(config.projectName), 'utf-8');
      created.push(filePath);
    } catch (e: unknown) {
      errors.push(`Erro ao criar ${key}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const summary = `${created.length} arquivos criados, ${skipped.length} pulados, ${errors.length} erros.`;
  return { created, skipped, errors, summary };
}

/**
 * Generates living documentation for a set of modules.
 * @param modules - Module metadata (name, file, description, exports).
 * @returns The generated markdown documentation.
 */
export function generateModuleDocs(modules: Array<{ name: string; file: string; description: string; exports: string[] }>): string {
  const lines: string[] = ['# Documentacao Viva dos Modulos', '', `Gerado em: ${new Date().toISOString()}`, '', '---', ''];

  for (const mod of modules) {
    lines.push(`## ${mod.name}`);
    lines.push('');
    lines.push(`**Arquivo:** \`${mod.file}\``);
    lines.push('');
    lines.push(mod.description);
    lines.push('');
    if (mod.exports.length > 0) {
      lines.push('**Exports:**');
      for (const exp of mod.exports) {
        lines.push(`- \`${exp}\``);
      }
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generates a prompt pack describing each module's CLI usage.
 * @param modules - Module metadata (name, description, cli).
 * @returns The generated markdown prompt pack.
 */
export function generatePromptPack(modules: Array<{ name: string; description: string; cli: string }>): string {
  const lines: string[] = ['# Prompt Pack — ai-devkit', '', '## Como usar', '', 'Para cada tarefa, use o prompt correspondente para guiar o modelo de IA.', '', '---', ''];

  for (const mod of modules) {
    lines.push(`### ${mod.name}`);
    lines.push('');
    lines.push(mod.description);
    lines.push('');
    if (mod.cli) {
      lines.push(`\`\`\`bash\n${mod.cli}\n\`\`\``);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}