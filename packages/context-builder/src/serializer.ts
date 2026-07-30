import { ScoredContextItem, ComposedContext } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('serializer');

export type SerializationFormat = 'compact' | 'full' | 'minimal';

export class ContextSerializer {
  serialize(composed: ComposedContext, format: SerializationFormat = 'compact'): string {
    switch (format) {
      case 'minimal':
        return this.toMinimal(composed);
      case 'full':
        return this.toFull(composed);
      case 'compact':
      default:
        return this.toCompact(composed);
    }
  }

  private toCompact(ctx: ComposedContext): string {
    const lines: string[] = [];

    lines.push(`[CONTEXT] sources=${ctx.sourcesUsed.join(',')} items=${ctx.items.length} tokens=${ctx.totalTokens}/${ctx.tokenBudget}`);

    for (const item of ctx.items) {
      const tag = item.tags.length > 0 ? ` #${item.tags.slice(0, 3).join(',')}` : '';
      const src = item.source.slice(0, 12);
      const preview = item.content.replace(/\n/g, ' ').slice(0, 120);
      lines.push(`[${src}|${item.category}|s=${Math.round(item.score)}] ${preview}${tag}`);
    }

    return lines.join('\n');
  }

  private toFull(ctx: ComposedContext): string {
    const sections: string[] = [
      `# Context Report`,
      `- Generated: ${ctx.composedAt}`,
      `- Sources: ${ctx.sourcesUsed.join(', ')}`,
      `- Items: ${ctx.items.length}`,
      `- Tokens: ${ctx.totalTokens} / ${ctx.tokenBudget} (${ctx.utilization}%)`,
      `- Summary: ${ctx.summary}`,
      ``,
      `## Items`,
    ];

    for (const item of ctx.items) {
      sections.push(
        `### ${item.category} [${item.source}] (score=${item.score})`,
        `Tags: ${item.tags.join(', ') || 'none'}`,
        `Freshness: ${item.freshness}`,
        ``,
        item.content,
        ``,
      );
    }

    if (ctx.provenance.length > 0) {
      sections.push(`## Provenance`);
      for (const p of ctx.provenance) {
        sections.push(`- [${p.action}] ${p.itemId}: ${p.reason} (source=${p.source})`);
      }
    }

    return sections.join('\n');
  }

  private toMinimal(ctx: ComposedContext): string {
    const items = ctx.items
      .map(i => `[${i.category}|${i.source}] ${i.content.replace(/\n/g, ' ').slice(0, 80)}`)
      .join('\n');
    return `ctx:${ctx.items.length} src:${ctx.sourcesUsed.join(',')} tok:${ctx.totalTokens}\n${items}`;
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  estimateItemTokens(item: ScoredContextItem): number {
    return Math.ceil((item.content.length + item.tags.join(',').length + item.source.length) / 4);
  }
}
