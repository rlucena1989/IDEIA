import type { BlueprintManifest, GeneratedADR, TemplateContext } from './types';
import { TemplateEngine, defaultHelpers } from './template-engine';

export class ADRGenerator {
  private engine: TemplateEngine;

  constructor() {
    this.engine = new TemplateEngine();
  }

  async generate(
    manifest: BlueprintManifest,
    context: TemplateContext,
    existingAdrCount?: number,
  ): Promise<GeneratedADR[]> {
    const adrs: GeneratedADR[] = [];
    let counter = existingAdrCount || 1;

    const framework = this.detectFramework(manifest);
    adrs.push(this.createFrameworkADR(counter++, framework, manifest, context));

    if (context.features?.includes('database') || context.features?.includes('postgresql')) {
      adrs.push(this.createDatabaseADR(counter++, context));
    }

    adrs.push(this.createArchitectureADR(counter++, context));

    adrs.push(this.createPackageManagerADR(counter++));

    const testFramework = this.detectTestFramework(manifest);
    adrs.push(this.createTestFrameworkADR(counter++, testFramework));

    if (context.features?.includes('api')) {
      adrs.push(this.createApiProtocolADR(counter++, context));
    }

    if (context.features?.includes('auth') || context.features?.includes('jwt')) {
      adrs.push(this.createAuthStrategyADR(counter++, context));
    }

    if (context.features?.includes('monorepo')) {
      adrs.push(this.createMonorepoADR(counter++));
    }

    if (manifest.adrs?.templates) {
      for (const tpl of manifest.adrs.templates) {
        adrs.push(this.createCustomADR(counter++, tpl.title, context));
      }
    }

    return adrs;
  }

  private createFrameworkADR(
    id: number,
    framework: string,
    manifest: BlueprintManifest,
    context: TemplateContext,
  ): GeneratedADR {
    const frameworkBenefits = this.frameworkBenefits(framework);
    const idStr = String(id).padStart(4, '0');
    const date = new Date().toISOString().split('T')[0];

    const content = `# ADR-${idStr}: ${framework} as Main Framework

Status: Accepted
Date: ${date}

## Context

Need a framework to build the application "${context.projectName}".
${manifest.description}

## Decision

Use ${framework} as the main framework.

## Consequences

- Positive:
  - Mature ecosystem with good documentation
  - Active community and long-term support
  - Modular and extensible architecture
  - Native TypeScript support
  - ${frameworkBenefits}
- Negative:
  - Initial learning curve
  - Overhead for very simple projects
  - External framework dependency
`;

    return {
      path: `docs/adr/ADR-${idStr}-framework-${defaultHelpers.kebabCase(framework)}.md`,
      content,
      title: `${framework} as Main Framework`,
      id: `ADR-${idStr}`,
    };
  }

  private createDatabaseADR(id: number, context: TemplateContext): GeneratedADR {
    const idStr = String(id).padStart(4, '0');
    const date = new Date().toISOString().split('T')[0];
    const dbType = context.features?.includes('postgresql') ? 'PostgreSQL' : 'Relational Database';

    const content = `# ADR-${idStr}: ${dbType} as Database

Status: Accepted
Date: ${date}

## Context

Database selection for "${context.projectName}".
The application requires persistent, reliable data storage with support for relationships and transactions.

## Decision

Use ${dbType} with Prisma ORM.

## Consequences

- Positive:
  - Proven reliability in production
  - Advanced type support (JSONB, arrays, enum)
  - Prisma provides type-safety and automatic migrations
  - Excellent OLTP performance
- Negative:
  - Requires connection management and pooling
  - Backup and recovery more complex than embedded databases
  - Infrastructure overhead vs embedded databases
`;

    return {
      path: `docs/adr/ADR-${idStr}-database-selection.md`,
      content,
      title: `${dbType} as Database`,
      id: `ADR-${idStr}`,
    };
  }

  private createArchitectureADR(id: number, context: TemplateContext): GeneratedADR {
    const idStr = String(id).padStart(4, '0');
    const date = new Date().toISOString().split('T')[0];

    const content = `# ADR-${idStr}: Clean Architecture

Status: Accepted
Date: ${date}

## Context

Architectural pattern for "${context.projectName}".
Need to organize code in a maintainable, testable way with clear separation of concerns.

## Decision

Adopt Clean Architecture with layers:
- Contract: DTOs, interfaces, validation schemas
- Application: Use cases, services
- Infrastructure: Repositories, database, external services

## Consequences

- Positive:
  - Clear separation of responsibilities
  - Isolated testability of each layer
  - Independence from frameworks and external drivers
  - Easy maintenance and evolution
- Negative:
  - More files and boilerplate code
  - Can be excessive for simple projects
  - Requires team discipline to maintain boundaries
`;

    return {
      path: `docs/adr/ADR-${idStr}-clean-architecture.md`,
      content,
      title: 'Clean Architecture',
      id: `ADR-${idStr}`,
    };
  }

  private createPackageManagerADR(id: number): GeneratedADR {
    const idStr = String(id).padStart(4, '0');
    const date = new Date().toISOString().split('T')[0];

    const content = `# ADR-${idStr}: pnpm as Package Manager

Status: Accepted
Date: ${date}

## Context

Package manager selection for the project.

## Decision

Use pnpm as the package manager.

## Consequences

- Positive:
  - Faster installation via intelligent linking
  - Disk space savings (content-addressable store)
  - Native workspace support (monorepo)
  - Strict mode prevents phantom dependencies
- Negative:
  - Different from npm (learning curve)
  - Some tools may have partial compatibility
`;

    return {
      path: `docs/adr/ADR-${idStr}-package-manager.md`,
      content,
      title: 'pnpm as Package Manager',
      id: `ADR-${idStr}`,
    };
  }

  private createTestFrameworkADR(id: number, framework: string): GeneratedADR {
    const idStr = String(id).padStart(4, '0');
    const date = new Date().toISOString().split('T')[0];

    const content = `# ADR-${idStr}: ${framework} as Test Framework

Status: Accepted
Date: ${date}

## Context

Test framework selection for the project.

## Decision

Use ${framework} as the test framework.

## Consequences

- Positive:
  - Industry standard for TypeScript testing
  - Rich matchers and assertion library
  - Snapshot testing support
  - Mocking capabilities built-in
- Negative:
  - Additional build step for TypeScript
  - Configuration overhead for complex setups
`;

    return {
      path: `docs/adr/ADR-${idStr}-test-framework.md`,
      content,
      title: `${framework} as Test Framework`,
      id: `ADR-${idStr}`,
    };
  }

  private createApiProtocolADR(id: number, context: TemplateContext): GeneratedADR {
    const idStr = String(id).padStart(4, '0');
    const date = new Date().toISOString().split('T')[0];
    const protocol = context.features?.includes('graphql') ? 'GraphQL' : 'REST';

    const content = `# ADR-${idStr}: ${protocol} as API Protocol

Status: Accepted
Date: ${date}

## Context

API protocol selection for "${context.projectName}".

## Decision

Use ${protocol} as the primary API protocol.

## Consequences

- Positive:
${protocol === 'REST' ? `  - Simple and widely adopted
  - Stateless and cacheable
  - Excellent tooling ecosystem` : `  - Flexible queries (request only needed data)
  - Strong typing via Schema Definition Language
  - Excellent for complex data relationships`}
- Negative:
${protocol === 'REST' ? `  - Over-fetching/under-fetching issues
  - Multiple endpoints for complex resources` : `  - Caching complexity
  - Query complexity can impact performance
  - Learning curve for consumers`}
`;

    return {
      path: `docs/adr/ADR-${idStr}-api-protocol.md`,
      content,
      title: `${protocol} as API Protocol`,
      id: `ADR-${idStr}`,
    };
  }

  private createAuthStrategyADR(id: number, context: TemplateContext): GeneratedADR {
    const idStr = String(id).padStart(4, '0');
    const date = new Date().toISOString().split('T')[0];
    const strategy = context.features?.includes('oauth') ? 'OAuth 2.0' : 'JWT';

    const content = `# ADR-${idStr}: ${strategy} for Authentication

Status: Accepted
Date: ${date}

## Context

Authentication strategy for "${context.projectName}".

## Decision

Use ${strategy} for authentication.

## Consequences

- Positive:
${strategy === 'JWT' ? `  - Stateless authentication
  - Works well with REST APIs
  - No server-side session storage needed` : `  - Delegated authorization
  - Industry standard for third-party access
  - Supports multiple grant types`}
- Negative:
${strategy === 'JWT' ? `  - Token revocation complexity
  - Payload size impacts performance
  - Secret management is critical` : `  - Additional round trips for token exchange
  - Provider dependency
  - Implementation complexity`}
`;

    return {
      path: `docs/adr/ADR-${idStr}-auth-strategy.md`,
      content,
      title: `${strategy} for Authentication`,
      id: `ADR-${idStr}`,
    };
  }

  private createMonorepoADR(id: number): GeneratedADR {
    const idStr = String(id).padStart(4, '0');
    const date = new Date().toISOString().split('T')[0];

    const content = `# ADR-${idStr}: Monorepo Structure

Status: Accepted
Date: ${date}

## Context

Repository structure for the project.

## Decision

Use pnpm workspaces monorepo with Turborepo for task orchestration.

## Consequences

- Positive:
  - Shared code and types across packages
  - Unified dependency management
  - Coordinated builds and releases
  - Atomic cross-package changes
- Negative:
  - Increased complexity in CI/CD
  - Steeper learning curve for new contributors
  - Potential for dependency coupling
`;

    return {
      path: `docs/adr/ADR-${idStr}-monorepo-structure.md`,
      content,
      title: 'Monorepo Structure',
      id: `ADR-${idStr}`,
    };
  }

  private createCustomADR(id: number, title: string, context: TemplateContext): GeneratedADR {
    const idStr = String(id).padStart(4, '0');
    const date = new Date().toISOString().split('T')[0];

    const content = `# ADR-${idStr}: ${title}

Status: Proposed
Date: ${date}

## Context

Decision needed for "${context.projectName}".

## Decision

[Describe the decision made]

## Consequences

- Positive:
  - [List positive consequences]
- Negative:
  - [List negative consequences]
`;

    return {
      path: `docs/adr/ADR-${idStr}-${defaultHelpers.kebabCase(title)}.md`,
      content,
      title,
      id: `ADR-${idStr}`,
    };
  }

  private detectFramework(manifest: BlueprintManifest): string {
    const deps = {
      ...(manifest.dependencies?.dependencies || {}),
      ...(manifest.dependencies?.devDependencies || {}),
    };
    if (deps['@nestjs/core'] || deps['@nestjs/common']) return 'NestJS';
    if (deps['express']) return 'Express';
    if (deps['fastify']) return 'Fastify';
    if (deps['next'] || deps['next/dist/server']) return 'Next.js';
    if (deps['@theia/core']) return 'Theia';
    if (deps['react']) return 'React';
    if (deps['@angular/core']) return 'Angular';
    if (deps['nuxt'] || deps['nuxt3']) return 'Nuxt';
    return 'Node.js';
  }

  private detectTestFramework(manifest: BlueprintManifest): string {
    const deps = {
      ...(manifest.dependencies?.dependencies || {}),
      ...(manifest.dependencies?.devDependencies || {}),
    };
    if (deps['vitest']) return 'Vitest';
    if (deps['@playwright/test']) return 'Playwright';
    if (deps['mocha']) return 'Mocha';
    return 'Jest';
  }

  private frameworkBenefits(framework: string): string {
    const benefits: Record<string, string> = {
      'NestJS': 'Dependency injection built-in, decorators for routes/validation, OpenAPI/Swagger integration',
      'Express': 'Simple and flexible, largest middleware ecosystem, minimal overhead',
      'Fastify': 'High performance, schema-based serialization, low overhead',
      'Next.js': 'SSR/SSG out of the box, file-based routing, excellent DX',
      'React': 'Component-based, virtual DOM, extensive ecosystem',
      'Angular': 'Full-featured framework, built-in DI, comprehensive tooling',
      'Theia': 'Desktop-grade IDE, LSP/DAP native, extensible widget system',
    };
    return benefits[framework] || 'Industry-standard tools and practices';
  }
}
