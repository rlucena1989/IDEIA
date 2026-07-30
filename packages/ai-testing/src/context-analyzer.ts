import { AnalysisContext, ExportInfo, TypeDefinition } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('context-analyzer');

export class ContextAnalyzer {
  analyze(filePath: string, sourceCode: string, existingTests?: string[]): AnalysisContext {
    const exports = this.extractExports(sourceCode);
    const dependencies = this.extractDependencies(sourceCode);
    const types = this.extractTypeDefinitions(sourceCode);
    return {
      sourceFile: filePath,
      sourceCode,
      exports,
      dependencies,
      types,
      existingTests: existingTests ?? [],
      coverageData: undefined,
    };
  }

  private extractExports(sourceCode: string): ExportInfo[] {
    const exports: ExportInfo[] = [];
    const exportRegex = /export\s+(?:default\s+)?(?:async\s+)?(?:function\s+(\w+)|class\s+(\w+)|interface\s+(\w+)|type\s+(\w+)|const\s+(\w+)|enum\s+(\w+))/g;
    let match: RegExpExecArray | null;
    while ((match = exportRegex.exec(sourceCode)) !== null) {
      const name = match[1] ?? match[2] ?? match[3] ?? match[4] ?? match[5] ?? match[6];
      if (match[1]) exports.push({ name, type: 'function', signature: '' });
      else if (match[2]) exports.push({ name, type: 'class', signature: '' });
      else if (match[3]) exports.push({ name, type: 'interface', signature: '' });
      else if (match[4]) exports.push({ name, type: 'type', signature: '' });
      else if (match[5]) exports.push({ name, type: 'const', signature: '' });
      else if (match[6]) exports.push({ name, type: 'variable', signature: '' });
    }
    return exports;
  }

  private extractDependencies(sourceCode: string): string[] {
    const deps: string[] = [];
    const importRegex = /from\s+['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(sourceCode)) !== null) {
      const dep = match[1];
      if (!dep.startsWith('.')) deps.push(dep);
    }
    return [...new Set(deps)];
  }

  private extractTypeDefinitions(sourceCode: string): TypeDefinition[] {
    const types: TypeDefinition[] = [];
    const interfaceRegex = /export\s+interface\s+(\w+)\s*\{/g;
    let match: RegExpExecArray | null;
    while ((match = interfaceRegex.exec(sourceCode)) !== null) {
      types.push({ name: match[1], kind: 'interface' });
    }
    const typeRegex = /export\s+type\s+(\w+)\s*=/g;
    while ((match = typeRegex.exec(sourceCode)) !== null) {
      types.push({ name: match[1], kind: 'type' });
    }
    return types;
  }
}
