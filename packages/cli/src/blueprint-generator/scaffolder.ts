import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import type {
  BlueprintManifest,
  ScaffoldOptions,
  ScaffoldResult,
  TemplateContext,
  ResolvedDependencies,
} from './types';
import { TemplateEngine, buildTemplateContext } from './template-engine';
import { DependencyResolver } from './dependency-resolver';
import { ConfigGenerator } from './config-generator';
import { ContractGenerator } from './contract-generator';
import { ADRGenerator } from './adr-generator';

export class Scaffolder {
  private templateEngine: TemplateEngine;
  private dependencyResolver: DependencyResolver;
  private configGenerator: ConfigGenerator;
  private contractGenerator: ContractGenerator;
  private adrGenerator: ADRGenerator;

  constructor() {
    this.templateEngine = new TemplateEngine();
    this.dependencyResolver = new DependencyResolver();
    this.configGenerator = new ConfigGenerator();
    this.contractGenerator = new ContractGenerator();
    this.adrGenerator = new ADRGenerator();
  }

  async scaffold(manifest: BlueprintManifest, options: ScaffoldOptions): Promise<ScaffoldResult> {
    const startTime = Date.now();
    let filesCreated = 0;
    let filesSkipped = 0;
    const errors: string[] = [];
    const warnings: string[] = [];

    const targetDir = path.resolve(options.outputDir);

    try {
      await fs.mkdir(targetDir, { recursive: true });
    } catch (_err) {
      errors.push(`Failed to create target directory: ${(err as Error).message}`);
      return this.errorResult(targetDir, errors, startTime);
    }

    const rawVars = await this.resolveVariables(manifest, options);
    const context = buildTemplateContext(rawVars, {
      description: manifest.description,
      features: manifest.tags || [],
    });

    if (manifest.structure) {
      const structResult = await this.processStructure(manifest, context, targetDir);
      filesCreated += structResult.created;
      filesSkipped += structResult.skipped;
      structResult.errors.forEach(e => errors.push(e));
      structResult.warnings.forEach(w => warnings.push(w));
    }

    if (manifest.configs) {
      const configFiles = await this.configGenerator.generate(
        manifest.configs as Record<string, unknown>,
        context,
      );
      for (const cfg of configFiles) {
        const written = await this.writeGeneratedFile(cfg, targetDir);
        if (written) filesCreated++;
        else warnings.push(`Config file already exists (skipped): ${cfg.path}`);
      }
    }

    if (manifest.dependencies) {
      try {
        const resolvedDeps = await this.dependencyResolver.resolve(manifest.dependencies);
        warnings.push(...resolvedDeps.warnings.map(w => w.message));
        errors.push(...resolvedDeps.errors.map(e => e.message));

        let existingPkg: Record<string, unknown> = {};
        const pkgPath = path.join(targetDir, 'package.json');
        try {
          const existingContent = await fs.readFile(pkgPath, 'utf-8');
          existingPkg = JSON.parse(existingContent);
        } catch {
          // doesn't exist yet
        }

        const mergedDeps = this.mergeDepsToExisting(resolvedDeps, existingPkg);
        const scripts = this.resolveDefaultScripts(manifest, context);
        const pkgJson = {
          name: context.projectName,
          version: '0.1.0',
          description: context.description || manifest.description,
          main: 'dist/index.js',
          types: 'dist/index.d.ts',
          scripts,
          ...mergedDeps,
          ...existingPkg,
        };

        await fs.writeFile(pkgPath, JSON.stringify(pkgJson, null, 2), 'utf-8');
        filesCreated++;
      } catch (_err) {
        errors.push(`Dependency resolution failed: ${(err as Error).message}`);
      }
    }

    if (manifest.contracts?.modules && manifest.contracts.modules.length > 0) {
      try {
        const contractFiles = await this.contractGenerator.generate(
          manifest.contracts.modules,
          manifest.contracts.schemaFormat || 'zod',
          {
            generateTests: manifest.contracts.generateTests !== false,
            generateOpenAPI: manifest.contracts.generateOpenAPI === true,
          },
        );
        for (const cf of contractFiles) {
          const written = await this.writeGeneratedFile(cf, targetDir);
          if (written) filesCreated++;
        }
      } catch (_err) {
        errors.push(`Contract generation failed: ${(err as Error).message}`);
      }
    }

    if (manifest.adrs?.autoGenerate !== false) {
      try {
        const adrFiles = await this.adrGenerator.generate(manifest, context);
        for (const adr of adrFiles) {
          const written = await this.writeGeneratedFile(
            { path: adr.path, content: adr.content },
            targetDir,
          );
          if (written) filesCreated++;
        }
      } catch (_err) {
        errors.push(`ADR generation failed: ${(err as Error).message}`);
      }
    }

    if (manifest.postProcess && manifest.postProcess.length > 0) {
      const ppResult = await this.runPostProcessing(manifest.postProcess, context, targetDir, options);
      ppResult.warnings.forEach(w => warnings.push(w));
      ppResult.errors.forEach(e => errors.push(e));
    }

    if (!options.skipGit) {
      try {
        await this.initGit(targetDir);
      } catch (_err) {
        warnings.push(`Git init failed: ${(err as Error).message}`);
      }
    }

    if (!options.skipInstall) {
      try {
        await this.installDependencies(targetDir);
      } catch (_err) {
        warnings.push(`Dependency installation failed: ${(err as Error).message}`);
      }
    }

    return {
      projectPath: targetDir,
      filesCreated,
      filesSkipped,
      dependenciesInstalled: !options.skipInstall,
      gitInitialized: !options.skipGit,
      adrsGenerated: manifest.adrs?.autoGenerate !== false ? (manifest.adrs?.templates?.length || 5) : 0,
      contractsGenerated: manifest.contracts?.modules?.length || 0,
      duration: Date.now() - startTime,
      errors,
      warnings,
    };
  }

  private async processStructure(
    manifest: BlueprintManifest,
    context: TemplateContext,
    targetDir: string,
  ): Promise<{ created: number; skipped: number; errors: string[]; warnings: string[] }> {
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];
    const warnings: string[] = [];

    const structure = manifest.structure || {};

    for (const [key, value] of Object.entries(structure)) {
      const resolvedKey = this.templateEngine.renderPath(key, context);
      const fullPath = path.join(targetDir, resolvedKey);

      if (typeof value === 'object' && value !== null && 'template' in (value as Record<string, unknown>)) {
        const fileDef = value as { template: string; condition?: string; generate?: string };

        if (fileDef.condition) {
          const conditionMet = this.templateEngine.evaluateCondition(fileDef.condition, context);
          if (!conditionMet) {
            skipped++;
            continue;
          }
        }

        const templateContent = fileDef.template;
        try {
          const content = this.templateEngine.render(templateContent, context);
          await fs.mkdir(path.dirname(fullPath), { recursive: true });
          await fs.writeFile(fullPath, content, 'utf-8');
          created++;
        } catch (_err) {
          errors.push(`Failed to render template for "${key}": ${(err as Error).message}`);
        }
      } else {
        try {
          await fs.mkdir(fullPath, { recursive: true });
        } catch (_err) {
          errors.push(`Failed to create directory "${resolvedKey}": ${(err as Error).message}`);
        }
      }
    }

    return { created, skipped, errors, warnings };
  }

  private async resolveVariables(
    manifest: BlueprintManifest,
    options: ScaffoldOptions,
  ): Promise<Record<string, unknown>> {
    const vars: Record<string, unknown> = { ...options.variables };

    if (manifest.variables) {
      for (const v of manifest.variables) {
        if (vars[v.name] !== undefined) continue;

        if (v.default !== undefined) {
          vars[v.name] = v.default;
          continue;
        }

        if (v.required) {
          if (options.ci) {
            throw new Error(`Variable "${v.name}" is required but not provided in CI mode`);
          }
          vars[v.name] = this.suggestValue(v.name);
        }
      }
    }

    return vars;
  }

  private suggestValue(name: string): string {
    const suggestions: Record<string, string> = {
      projectName: 'my-project',
      moduleName: 'my-module',
      author: 'developer',
      port: '3000',
      description: 'Generated by IDEIA Blueprint',
    };
    return suggestions[name] || name;
  }

  private async writeGeneratedFile(
    file: { path: string; content: string },
    targetDir: string,
  ): Promise<boolean> {
    const fullPath = path.join(targetDir, file.path);
    try {
      await fs.access(fullPath);
      return false;
    } catch {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, file.content, 'utf-8');
      return true;
    }
  }

  private mergeDepsToExisting(
    resolved: ResolvedDependencies,
    existing: Record<string, unknown>,
  ): Record<string, unknown> {
    const merged: Record<string, unknown> = {};

    const depTypes = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const;
    for (const depType of depTypes) {
      const resolvedDeps = resolved[depType];
      const existingDeps = existing[depType] as Record<string, string> | undefined;

      if (resolvedDeps && Object.keys(resolvedDeps).length > 0) {
        merged[depType] = { ...resolvedDeps, ...existingDeps };
      } else if (existingDeps && Object.keys(existingDeps).length > 0) {
        merged[depType] = existingDeps;
      }
    }

    return merged;
  }

  private resolveDefaultScripts(
    manifest: BlueprintManifest,
    context: TemplateContext,
  ): Record<string, string> {
    const hasFramework = !!(manifest.dependencies?.dependencies &&
      Object.keys(manifest.dependencies.dependencies).length > 0);

    const scripts: Record<string, string> = {
      build: 'tsc',
      dev: 'tsx watch src/index.ts',
      start: 'node dist/index.js',
      test: 'jest --passWithNoTests',
      lint: 'eslint src/ --ext .ts',
    };

    if (context.features?.includes('api') || hasFramework) {
      scripts.dev = 'tsx watch src/main.ts';
      scripts['test:e2e'] = 'jest --config ./test/jest-e2e.json';
    }

    return scripts;
  }

  private async runPostProcessing(
    steps: { command: string; description?: string; condition?: string; timeout?: number }[],
    context: TemplateContext,
    targetDir: string,
    options: ScaffoldOptions,
  ): Promise<{ warnings: string[]; errors: string[] }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    for (const step of steps) {
      if (step.condition) {
        const met = this.templateEngine.evaluateCondition(step.condition, context);
        if (!met) continue;
      }

      if (step.command.includes('git init') && options.skipGit) continue;
      if ((step.command.includes('npm install') || step.command.includes('pnpm install')) && options.skipInstall) continue;

      try {
        if (step.description) {
          process.stdout.write(`  -> ${step.description}...`);
        }
        execSync(step.command, {
          cwd: targetDir,
          stdio: 'pipe',
          timeout: step.timeout || 120000,
        });
        if (step.description) {
          process.stdout.write(' done\n');
        }
      } catch (_err) {
        warnings.push(`Post-process step "${step.command}" failed: ${(err as Error).message}`);
      }
    }

    return { warnings, errors };
  }

  private async initGit(targetDir: string): Promise<void> {
    try {
      await fs.access(path.join(targetDir, '.git'));
    } catch {
      execSync('git init', { cwd: targetDir, stdio: 'pipe' });
    }
  }

  private async installDependencies(targetDir: string): Promise<void> {
    const hasPnpmLock = await fs.access(path.join(targetDir, 'pnpm-lock.yaml')).then(() => true).catch(() => false);
    const hasYarnLock = await fs.access(path.join(targetDir, 'yarn.lock')).then(() => true).catch(() => false);

    const cmd = hasPnpmLock ? 'pnpm install' : hasYarnLock ? 'yarn install' : 'npm install';
    execSync(cmd, { cwd: targetDir, stdio: 'pipe', timeout: 120000 });
  }

  private errorResult(targetDir: string, errors: string[], startTime: number): ScaffoldResult {
    return {
      projectPath: targetDir,
      filesCreated: 0,
      filesSkipped: 0,
      dependenciesInstalled: false,
      gitInitialized: false,
      adrsGenerated: 0,
      contractsGenerated: 0,
      duration: Date.now() - startTime,
      errors,
      warnings: [],
    };
  }
}
