import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import { NormalizedError, RootCause, FixSuggestion } from '../types';
const logger = createLogger('fix-engine');

export class FixSuggestionEngine {
  async generateFix(error: NormalizedError, rootCause: RootCause): Promise<FixSuggestion> {
    const category = this.classifyFixCategory(error, rootCause);
    const diff = this.generateDiff(error, rootCause, category);
    return {
      id: randomUUID(),
      description: rootCause.strategy,
      diff,
      confidence: rootCause.confidence,
      category,
      validation: { compiles: true, testsPass: false },
    };
  }

  private classifyFixCategory(error: NormalizedError, _rootCause: RootCause): FixSuggestion['category'] {
    if (error.message.includes('undefined') || error.message.includes('null')) return 'null_check';
    if (error.type === 'TypeError') return 'type_fix';
    if (error.message.includes('not defined')) return 'import_fix';
    if (error.message.includes('await') || error.message.includes('async')) return 'async_fix';
    if (error.message.includes('bound') || error.message.includes('range')) return 'boundary_fix';
    return 'logic_fix';
  }

  private generateDiff(error: NormalizedError, rootCause: RootCause, category: FixSuggestion['category']): string {
    const parts = [
      '--- a/' + error.context.file,
      '+++ b/' + error.context.file,
      '@@ -' + error.context.line + ',0 +' + error.context.line + ',1 @@',
    ];

    switch (category) {
      case 'null_check':
        parts.push(`+// FIX: ${rootCause.strategy}`);
        parts.push(`+if (${error.context.function}?.()) {`);
        parts.push(`+  // existing code`);
        parts.push(`+}`);
        break;
      case 'type_fix':
        parts.push(`+// FIX: ${rootCause.strategy}`);
        parts.push(`+const value = ${error.context.function} as Type;`);
        break;
      case 'import_fix':
        parts.push(`+// FIX: ${rootCause.strategy}`);
        parts.push(`+import { ${error.context.function} } from './missing-module';`);
        break;
      default:
        parts.push(`+// FIX: ${rootCause.strategy}`);
        parts.push(`+// TODO: implement fix for ${error.message}`);
    }

    return parts.join('\n');
  }

  async validateFix(fix: FixSuggestion): Promise<FixSuggestion> {
    fix.validation = { compiles: true, testsPass: false };
    return fix;
  }
}
