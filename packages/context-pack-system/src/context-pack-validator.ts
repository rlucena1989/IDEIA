import { ContextPack, ValidationResult, ValidationError, DependencyValidation, DependencyStatus, VariableValidation, SlicingValidation, HookValidation, FullValidation, CompatibilityResult, ConsistencyResult } from './types';
import { createLogger } from '@ideia/logger';
import { ContextPackRegistry } from './context-pack-registry';
const logger = createLogger('context-pack-validator');

export class PackValidator {
  validateSchema(pack: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!pack || typeof pack !== 'object') {
      errors.push({ code: 'SC-00', message: 'Pack must be a non-null object', severity: 'error' });
      return { valid: false, errors, warnings };
    }

    const p = pack as Record<string, unknown>;

    if (!p.name || typeof p.name !== 'string') {
      errors.push({ code: 'SC-01', message: 'Name is required and must be a string', severity: 'error', field: 'name' });
    }

    if (!p.version || typeof p.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(p.version as string)) {
      errors.push({ code: 'SC-02', message: 'Version must follow semver (X.Y.Z)', severity: 'error', field: 'version' });
    }

    if (!p.description || typeof p.description !== 'string' || (p.description as string).length < 10) {
      errors.push({ code: 'SC-03', message: 'Description must have at least 10 characters', severity: 'error', field: 'description' });
    }

    if (!p.sections || !Array.isArray(p.sections) || (p.sections as unknown[]).length === 0) {
      errors.push({ code: 'SC-04', message: 'At least 1 section is required', severity: 'error', field: 'sections' });
    }

    if (Array.isArray(p.sections)) {
      const sectionIds = new Set<string>();
      for (let i = 0; i < (p.sections as unknown[]).length; i++) {
        const section = (p.sections as Record<string, unknown>[])[i];
        if (section.id) {
          if (sectionIds.has(section.id as string)) {
            errors.push({ code: 'SC-05', message: `Duplicate section id: ${section.id}`, severity: 'error', field: `sections[${i}].id` });
          }
          sectionIds.add(section.id as string);
        }
        if (!section.content || (section.content as string).trim().length === 0) {
          errors.push({ code: 'SC-06', message: `Section content cannot be empty for section ${i}`, severity: 'error', field: `sections[${i}].content` });
        }
      }
    }

    if (p.deprecated && !p.deprecationMessage) {
      warnings.push({ code: 'SC-13', message: 'Deprecated pack should have deprecationMessage', severity: 'warning', field: 'deprecationMessage' });
    }

    if (Array.isArray(p.tags)) {
      for (const tag of p.tags as string[]) {
        if (typeof tag === 'string' && !/^[a-z][a-z0-9-]*$/.test(tag)) {
          warnings.push({ code: 'SC-15', message: `Tag "${tag}" should follow kebab-case`, severity: 'warning', field: 'tags' });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async validateDependencies(pack: ContextPack, registry: ContextPackRegistry): Promise<DependencyValidation> {
    const dependencies: DependencyStatus[] = [];

    for (const dep of pack.dependencies) {
      const depPack = await registry.get(dep.pack, dep.version);
      dependencies.push({
        pack: dep.pack,
        version: dep.version,
        required: dep.required,
        resolved: depPack !== null,
        resolvedVersion: depPack?.version,
        error: depPack ? undefined : `Dependency "${dep.pack}@${dep.version}" not found`,
      });
    }

    const valid = dependencies.every((d) => !d.required || d.resolved);
    return { valid, dependencies };
  }

  validateVariables(pack: ContextPack): VariableValidation {
    const undefinedVars: string[] = [];
    const unusedVars: string[] = [];
    const mismatchedTypes: string[] = [];

    const declaredVarNames = new Set(pack.variables.map((v) => v.name));

    const contentVarRegex = /\{\{(\w+)\}\}/g;
    const usedInContent = new Set<string>();
    for (const section of pack.sections) {
      let match: RegExpExecArray | null;
      while ((match = contentVarRegex.exec(section.content)) !== null) {
        usedInContent.add(match[1]);
      }
    }

    for (const varName of usedInContent) {
      if (!declaredVarNames.has(varName)) {
        undefinedVars.push(varName);
      }
    }

    for (const declared of pack.variables) {
      if (!usedInContent.has(declared.name)) {
        unusedVars.push(declared.name);
      }
    }

    return {
      valid: undefinedVars.length === 0,
      undefinedVars,
      unusedVars,
      mismatchedTypes,
    };
  }

  validateSlicing(pack: ContextPack): SlicingValidation {
    const warnings: string[] = [];
    const totalSections = pack.sections.length;

    for (const rule of pack.slicing) {
      if (rule.maxSections !== undefined && rule.maxSections > totalSections) {
        warnings.push(`SC-10: Slice rule for ${rule.maxTokens} tokens has maxSections (${rule.maxSections}) > total sections (${totalSections})`);
      }
    }

    return { valid: warnings.length === 0, warnings };
  }

  validateHooks(pack: ContextPack): HookValidation {
    const errors: string[] = [];

    for (const hook of pack.hooks) {
      if (!hook.script || hook.script.trim().length === 0) {
        errors.push(`Hook script is empty for type ${hook.type}`);
      }
      if (hook.script && hook.script.includes('/') && !hook.script.startsWith('inline:')) {
        errors.push(`SC-11: Hook script "${hook.script}" may be a file path that does not exist`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async validateFull(pack: ContextPack, registry: ContextPackRegistry): Promise<FullValidation> {
    const schema = this.validateSchema(pack);
    const dependencies = await this.validateDependencies(pack, registry);
    const variables = this.validateVariables(pack);
    const slicing = this.validateSlicing(pack);
    const hooks = this.validateHooks(pack);

    const overall = schema.valid && dependencies.valid && variables.valid && slicing.valid && hooks.valid;

    return { schema, dependencies, variables, slicing, hooks, overall };
  }

  validateCompatibility(packA: ContextPack, packB: ContextPack): CompatibilityResult {
    const conflicts: string[] = [];

    const aSections = new Set(packA.sections.map((s) => s.id));
    const bSections = new Set(packB.sections.map((s) => s.id));

    for (const sectionId of aSections) {
      if (bSections.has(sectionId)) {
        const sectionA = packA.sections.find((s) => s.id === sectionId);
        const sectionB = packB.sections.find((s) => s.id === sectionId);
        if (sectionA && sectionB && sectionA.priority !== sectionB.priority) {
          conflicts.push(`Section "${sectionId}" has different priority (${sectionA.priority} vs ${sectionB.priority})`);
        }
      }
    }

    const aVars = new Set(packA.variables.map((v) => v.name));
    const bVars = new Set(packB.variables.map((v) => v.name));

    for (const varName of aVars) {
      if (bVars.has(varName)) {
        const varA = packA.variables.find((v) => v.name === varName);
        const varB = packB.variables.find((v) => v.name === varName);
        if (varA && varB && varA.type !== varB.type) {
          conflicts.push(`Variable "${varName}" has different type (${varA.type} vs ${varB.type})`);
        }
      }
    }

    return { compatible: conflicts.length === 0, conflicts };
  }

  validateConsistency(pack: ContextPack): ConsistencyResult {
    const issues: string[] = [];

    if (pack.deprecated && pack.replacedBy) {
      if (pack.replacedBy === pack.name) {
        issues.push('Pack cannot replace itself');
      }
    }

    if (pack.totalTokens !== undefined) {
      const estimatedTokens = pack.sections.reduce((s, sec) => s + Math.ceil(sec.content.length / 4), 0);
      const ratio = Math.abs(estimatedTokens - pack.totalTokens) / Math.max(pack.totalTokens, 1);
      if (ratio > 0.2) {
        issues.push(`SC-12: Estimated tokens (${estimatedTokens}) differs from declared totalTokens (${pack.totalTokens}) by >20%`);
      }
    }

    if (pack.variables.length > 0) {
      const varNames = new Set(pack.variables.map((v) => v.name));
      if (varNames.size !== pack.variables.length) {
        issues.push('Duplicate variable names detected');
      }
    }

    return { consistent: issues.length === 0, issues };
  }
}
