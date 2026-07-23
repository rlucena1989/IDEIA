/** Tipo que define pattern category. */
export type PatternCategory = 'architectural' | 'design' | 'ui' | 'system' | 'business' | 'code' | 'security' | 'performance';

/** Tipo que define pattern severity. */
export type PatternSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/** Interface que define a estrutura de pattern definition. */
export interface PatternDefinition {
  id: string;
  name: string;
  category: PatternCategory;
  description: string;
  severity: PatternSeverity;
  tags: string[];
  examples: string[];
  constraints: string[];
  confidence: number;
  version: string;
}

/** Interface que define a estrutura de pattern match. */
export interface PatternMatch {
  patternId: string;
  source: string;
  line: number;
  confidence: number;
  evidence: string;
}

/** Interface que define a estrutura de pattern registry config. */
export interface PatternRegistryConfig {
  maxPatterns: number;
  autoLearnThreshold: number;
}

/** Processa e f a u l t_ p a t t e r n_ r e g i s t r y_ c o n f i g. */
export const DEFAULT_PATTERN_REGISTRY_CONFIG: PatternRegistryConfig = {
  maxPatterns: 200,
  autoLearnThreshold: 0.6,
};

const BUILT_IN_PATTERNS: PatternDefinition[] = [
  { id: 'arch-clean', name: 'Clean Architecture', category: 'architectural', description: 'Separation of concerns: domain, application, infrastructure layers', severity: 'high', tags: ['ddd', 'layers', 'separation'], examples: ['src/domain/', 'src/application/', 'src/infrastructure/'], constraints: ['Domain cannot import infrastructure'], confidence: 0.95, version: '1.0.0' },
  { id: 'arch-hexagonal', name: 'Hexagonal Architecture', category: 'architectural', description: 'Ports and adapters pattern for decoupling core from external concerns', severity: 'high', tags: ['ports', 'adapters', 'decoupling'], examples: ['src/core/', 'src/adapters/'], constraints: ['Core has no external deps'], confidence: 0.9, version: '1.0.0' },
  { id: 'design-repository', name: 'Repository Pattern', category: 'design', description: 'Mediates between domain and data mapping layers', severity: 'medium', tags: ['data', 'persistence', 'abstraction'], examples: ['class UserRepository', 'interface ProductRepository'], constraints: ['Repository interfaces in domain', 'Implementations in infra'], confidence: 0.85, version: '1.0.0' },
  { id: 'design-factory', name: 'Factory Method', category: 'design', description: 'Creates objects without specifying exact class', severity: 'medium', tags: ['creation', 'factory', 'new'], examples: ['createUser()', 'buildConfig()'], constraints: [], confidence: 0.8, version: '1.0.0' },
  { id: 'design-dto', name: 'Data Transfer Object', category: 'design', description: 'Simple objects carrying data between layers', severity: 'low', tags: ['dto', 'transfer', 'serialization'], examples: ['class CreateUserDto', 'interface ProductResponse'], constraints: ['No business logic in DTOs'], confidence: 0.9, version: '1.0.0' },
  { id: 'ui-component', name: 'Component Pattern', category: 'ui', description: 'Reusable UI component with props, state and lifecycle', severity: 'info', tags: ['react', 'vue', 'component', 'reusable'], examples: ['export function Button()', 'export class UserCard'], constraints: ['Single responsibility'], confidence: 0.95, version: '1.0.0' },
  { id: 'ui-layout', name: 'Layout Pattern', category: 'ui', description: 'Page layout structure with header, sidebar, content, footer', severity: 'info', tags: ['layout', 'page', 'template'], examples: ['<Layout>', '<Sidebar>', '<Header>'], constraints: ['Layout does not contain business logic'], confidence: 0.85, version: '1.0.0' },
  { id: 'sys-module', name: 'Module Pattern', category: 'system', description: 'Organized module with public API and internal implementation', severity: 'medium', tags: ['module', 'encapsulation', 'barrel'], examples: ['index.ts', 'module.ts'], constraints: ['Public API in index.ts'], confidence: 0.9, version: '1.0.0' },
  { id: 'biz-crud', name: 'CRUD Flow', category: 'business', description: 'Create, Read, Update, Delete operations for an entity', severity: 'medium', tags: ['crud', 'entity', 'rest'], examples: ['POST /users', 'GET /users/:id', 'PUT /users/:id', 'DELETE /users/:id'], constraints: ['Standard REST endpoints'], confidence: 0.95, version: '1.0.0' },
  { id: 'biz-workflow', name: 'Approval Workflow', category: 'business', description: 'Multi-step approval with states and transitions', severity: 'high', tags: ['workflow', 'approval', 'state-machine'], examples: ['PENDING -> APPROVED -> REJECTED'], constraints: ['State transitions are explicit'], confidence: 0.8, version: '1.0.0' },
  { id: 'sec-auth', name: 'Authentication Pattern', category: 'security', description: 'JWT/OAuth2 authentication middleware', severity: 'critical', tags: ['auth', 'jwt', 'oauth', 'middleware'], examples: ['authMiddleware', 'verifyToken'], constraints: ['Token validation on every request'], confidence: 0.95, version: '1.0.0' },
  { id: 'sec-validation', name: 'Input Validation', category: 'security', description: 'Validate all external input before processing', severity: 'critical', tags: ['validation', 'sanitize', 'zod'], examples: ['zod schema', 'class-validator'], constraints: ['Validate at API boundary'], confidence: 0.9, version: '1.0.0' },
  { id: 'perf-caching', name: 'Caching Strategy', category: 'performance', description: 'Cache frequently accessed data to reduce latency', severity: 'medium', tags: ['cache', 'redis', 'memory'], examples: ['cache.get()', 'cache.set()'], constraints: ['Cache invalidation strategy defined'], confidence: 0.85, version: '1.0.0' },
  { id: 'perf-lazy', name: 'Lazy Loading', category: 'performance', description: 'Defer loading of non-critical resources', severity: 'low', tags: ['lazy', 'defer', 'split'], examples: ['React.lazy()', 'dynamic import()'], constraints: ['Critical path not deferred'], confidence: 0.8, version: '1.0.0' },
];

/** Classe responsável por processa registry. */
export class PatternRegistry {
  private patterns: Map<string, PatternDefinition> = new Map();
  private config: PatternRegistryConfig;

  constructor(config: Partial<PatternRegistryConfig> = {}) {
    this.config = { ...DEFAULT_PATTERN_REGISTRY_CONFIG, ...config };
    for (const p of BUILT_IN_PATTERNS) {
      this.patterns.set(p.id, p);
    }
  }

  register(pattern: PatternDefinition): void {
    if (this.patterns.size >= this.config.maxPatterns) return;
    this.patterns.set(pattern.id, pattern);
  }

  get(id: string): PatternDefinition | undefined {
    return this.patterns.get(id);
  }

  getAll(): PatternDefinition[] {
    return Array.from(this.patterns.values());
  }

  findByCategory(category: PatternCategory): PatternDefinition[] {
    return this.getAll().filter(p => p.category === category);
  }

  findByTag(tag: string): PatternDefinition[] {
    return this.getAll().filter(p => p.tags.includes(tag));
  }

  search(query: string): PatternDefinition[] {
    const q = query.toLowerCase();
    return this.getAll().filter(p =>
      p.id.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  count(): number {
    return this.patterns.size;
  }

  getStats(): { total: number; byCategory: Record<string, number>; bySeverity: Record<string, number> } {
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    for (const p of this.patterns.values()) {
      byCategory[p.category] = (byCategory[p.category] || 0) + 1;
      bySeverity[p.severity] = (bySeverity[p.severity] || 0) + 1;
    }
    return { total: this.patterns.size, byCategory, bySeverity };
  }
}
