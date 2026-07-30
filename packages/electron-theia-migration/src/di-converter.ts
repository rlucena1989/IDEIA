export type InjectionPattern = 'constructor' | 'property' | 'factory' | 'manual';

export interface DiConversion {
  className: string;
  pattern: InjectionPattern;
  dependencies: string[];
  decoratorAdded: boolean;
  injectionsAdded: boolean;
  moduleRegistered: boolean;
}

export class DiConverter {
  private conversions: DiConversion[] = [];

  analyzeClass(content: string, className: string): DiConversion {
    const hasDecorator = content.includes('@injectable()');
    const constructorInjections = this.extractConstructorParams(content);
    const propertyInjections = this.extractPropertyInjections(content);
    const allDeps = [...new Set([...constructorInjections, ...propertyInjections])];

    const conversion: DiConversion = {
      className,
      pattern: hasDecorator ? 'constructor' : 'manual',
      dependencies: allDeps,
      decoratorAdded: hasDecorator,
      injectionsAdded: constructorInjections.length > 0 || propertyInjections.length > 0,
      moduleRegistered: false,
    };

    this.conversions.push(conversion);
    return conversion;
  }

  private extractConstructorParams(content: string): string[] {
    const params: string[] = [];
    const regex = /constructor\s*\(([^)]*)\)/g;
    const match = regex.exec(content);
    if (match) {
      const args = match[1].split(',').map(a => a.trim());
      for (const arg of args) {
        const parts = arg.split(':').map(p => p.trim());
        if (parts.length >= 2) params.push(parts[1].replace(/\[.*\]/g, '').trim());
      }
    }
    return params;
  }

  private extractPropertyInjections(content: string): string[] {
    const injections: string[] = [];
    const regex = /@inject\((\w+)\)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      injections.push(match[1]);
    }
    return injections;
  }

  generateModuleRegistration(className: string, dependencies: string[]): string {
    const lines: string[] = [
      'import { ContainerModule } from \'@theia/core/shared/inversify\';',
      `import { ${className} } from './${className.toLowerCase()}';`,
      ...dependencies.map(d => `import { ${d} } from './${d.toLowerCase()}';`),
      '',
      'export default new ContainerModule(bind => {',
      `  bind(${className}).toSelf().inSingletonScope();`,
      ...dependencies.map(d => `  bind(${d}).toSelf().inSingletonScope();`),
      '});',
    ];
    return lines.join('\n');
  }

  getConversions(): DiConversion[] {
    return [...this.conversions];
  }
}
