import { createLogger } from '@ideia/logger';
import {  ContextPack, ResolvedPack, Section, InjectedContext, RenderedSection, SlicedResult,
  CombineOptions, PackPriority, ContextInjectorConfig, TemplateEngineType,
} from './types';
const logger = createLogger('context-pack-injector');

// --- TemplateEngine ---

export class TemplateEngine {
  constructor(private _config: { engine: TemplateEngineType }) {}

  async render(template: string, variables: Record<string, unknown>): Promise<string> {
    if (this._config.engine === 'none') return template;

    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, String(value ?? ''));
    }

    result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, cond, content) => {
      return variables[cond] ? content : '';
    });

    result = result.replace(/\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_match, listName, template_) => {
      const list = variables[listName];
      if (!Array.isArray(list)) return '';
      return list.map((item: unknown) => {
        return template_.replace(/\{\{this\.(\w+)\}\}/g, (_sub: string, prop: string) => {
          const obj = item as Record<string, unknown>;
          return String(obj[prop] ?? '');
        });
      }).join('\n');
    });

    result = result.replace(/\{\{!\s*[\s\S]*?\}\}/g, '');

    return result;
  }
}

// --- VariableResolver ---

export class VariableResolver {
  resolve(content: string, variables: Record<string, unknown>): string {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, String(value ?? ''));
    }
    return result;
  }

  checkRequired(packs: ResolvedPack[], variables: Record<string, unknown>): string[] {
    const missing: string[] = [];
    for (const resolved of packs) {
      for (const variable of resolved.pack.variables) {
        if (variable.required && !(variable.name in variables)) {
          missing.push(variable.name);
        }
      }
    }
    return missing;
  }

  applyDefaults(pack: ContextPack, variables: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = { ...variables };
    for (const variable of pack.variables) {
      if (!(variable.name in result) && variable.default !== undefined) {
        result[variable.name] = variable.default;
      }
    }
    return result;
  }
}

// --- Prioritizer ---

export class Prioritizer {
  prioritize(sections: (Section & { packName: string; resolvedContent: string })[]): (Section & { packName: string; resolvedContent: string })[] {
    const priorityOrder: Record<PackPriority, number> = { P0: 0, P1: 1, P2: 2 };
    return [...sections].sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 2;
      const pb = priorityOrder[b.priority] ?? 2;
      return pa - pb;
    });
  }
}

// --- SliceSelector ---

export class SliceSelector {
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  slice(
    sections: (Section & { packName: string; resolvedContent: string })[],
    maxTokens: number
  ): SlicedResult {
    const allSections: RenderedSection[] = sections.map((s) => ({
      id: s.id,
      pack: s.packName,
      title: s.title,
      content: s.resolvedContent,
      tokens: this.estimateTokens(s.resolvedContent),
      priority: s.priority,
      included: false,
    }));

    const sorted = [...allSections].sort((a, b) => {
      const order: Record<PackPriority, number> = { P0: 0, P1: 1, P2: 2 };
      return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
    });

    const included: RenderedSection[] = [];
    const excluded: RenderedSection[] = [];
    let totalTokens = 0;
    const margin = maxTokens * 0.9;

    for (const section of sorted) {
      if (totalTokens + section.tokens <= margin) {
        included.push({ ...section, included: true });
        totalTokens += section.tokens;
      } else {
        excluded.push(section);
      }
    }

    const overflowPct = maxTokens > 0 ? ((totalTokens - maxTokens) / maxTokens) * 100 : 0;

    return { included, excluded, totalTokens, maxTokens, overflowPct };
  }
}

// --- FormatCombiner ---

export class FormatCombiner {
  constructor(private _config: { separator: string }) {}

  combine(sections: RenderedSection[], options?: CombineOptions): string {
    const parts: string[] = [];

    if (options?.showSummary) {
      const packSet = new Set(sections.map((s) => s.pack));
      const summaryParts = [`Context Packs: ${options.usedPacks.join(', ')}`, `Sections: ${sections.length}`, `Total Tokens: ${sections.reduce((a, s) => a + s.tokens, 0)}`];
      parts.push(summaryParts.join(' | '));
      parts.push('');
    }

    for (const section of sections) {
      if (!section.included) continue;
      const header = `[${section.pack}] ${section.title} (${section.priority})`;
      parts.push(header);
      parts.push(section.content);
      parts.push('');
    }

    return parts.join(this._config.separator);
  }
}

// --- ContextInjector ---

export class ContextInjector {
  private _templateEngine: TemplateEngine;
  private _variableResolver: VariableResolver;
  private _prioritizer: Prioritizer;
  private _sliceSelector: SliceSelector;
  private _combiner: FormatCombiner;

  constructor(private _config: ContextInjectorConfig) {
    this._templateEngine = new TemplateEngine({ engine: _config.templateEngine });
    this._variableResolver = new VariableResolver();
    this._prioritizer = new Prioritizer();
    this._sliceSelector = new SliceSelector();
    this._combiner = new FormatCombiner({ separator: _config.packSeparator });
  }

  async inject(
    packs: ResolvedPack[],
    variables: Record<string, unknown>,
    maxTokens?: number
  ): Promise<InjectedContext> {
    const warnings: string[] = [];
    const usedPacks: string[] = [];

    const rawSections: (Section & { packName: string; resolvedContent: string })[] = [];
    for (const resolved of packs) {
      usedPacks.push(resolved.pack.name);
      for (const section of resolved.pack.sections) {
        rawSections.push({ ...section, packName: resolved.pack.name, resolvedContent: section.content });
      }
    }

    const missingVars = this._variableResolver.checkRequired(packs, variables);
    if (missingVars.length > 0) {
      warnings.push(`Missing required variables: ${missingVars.join(', ')}`);
    }

    for (const section of rawSections) {
      section.resolvedContent = this._variableResolver.resolve(section.content, variables);
    }

    const prioritized = this._prioritizer.prioritize(rawSections);

    let finalSections: RenderedSection[];
    let sliced = false;

    if (maxTokens !== undefined && maxTokens > 0) {
      const slicedResult = this._sliceSelector.slice(prioritized, maxTokens);
      finalSections = slicedResult.included;
      if (slicedResult.excluded.length > 0) {
        sliced = true;
        const p0Excluded = slicedResult.excluded.filter((s) => s.priority === 'P0');
        if (p0Excluded.length > 0) {
          warnings.push(`CRITICAL: ${p0Excluded.length} P0 sections excluded`);
        }
      }
    } else {
      finalSections = prioritized.map((s) => ({
        id: s.id,
        pack: s.packName,
        title: s.title,
        content: s.resolvedContent,
        tokens: this._sliceSelector.estimateTokens(s.resolvedContent),
        priority: s.priority,
        included: true,
      }));
    }

    const rendered: RenderedSection[] = [];
    for (const section of finalSections) {
      const renderedContent = await this._templateEngine.render(section.content, variables);
      rendered.push({
        ...section,
        content: renderedContent,
        tokens: this._sliceSelector.estimateTokens(renderedContent),
      });
    }

    const prompt = this._combiner.combine(rendered, {
      showSummary: this._config.includeSummary,
      usedPacks,
    });

    const totalTokens = rendered.reduce((a, s) => a + s.tokens, 0);

    return {
      prompt,
      usedPacks,
      totalTokens,
      maxTokens: maxTokens ?? totalTokens,
      sections: rendered,
      variables,
      warnings,
      sliced,
    };
  }

  renderSection(section: Section, variables: Record<string, unknown>): string {
    return this._variableResolver.resolve(section.content, variables);
  }

  estimateTokens(text: string): number {
    return this._sliceSelector.estimateTokens(text);
  }

  async slice(packs: ResolvedPack[], maxTokens: number): Promise<SlicedResult> {
    const rawSections: (Section & { packName: string; resolvedContent: string })[] = [];
    for (const resolved of packs) {
      for (const section of resolved.pack.sections) {
        rawSections.push({ ...section, packName: resolved.pack.name, resolvedContent: section.content });
      }
    }
    return this._sliceSelector.slice(rawSections, maxTokens);
  }

  combine(sections: RenderedSection[], options?: CombineOptions): string {
    return this._combiner.combine(sections, options);
  }

  convertFormat(_section: Section, _targetFormat: string): string {
    return _section.content;
  }
}
