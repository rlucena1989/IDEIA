import { CompanyProject, SimulationArtifact, SimulationPhase, SimulationRole } from './types';

function generateId(): string {
  return `art_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function generateRequirements(project: string, role: SimulationRole): SimulationArtifact[] {
  const timestamp = new Date().toISOString();
  return [
    {
      id: generateId(), title: 'Product Vision', role: role.name, phase: 'requirements',
      content: `# Product Vision: ${project}\n\n## Vision Statement\nA modern platform that provides exceptional value to users through innovative features.\n\n## Target Audience\n- Primary: Technical professionals\n- Secondary: Business stakeholders\n\n## Key Differentiators\n1. Clean Architecture from day one\n2. AI-assisted development lifecycle\n3. Built-in quality gates\n\n## Success Metrics\n- Time to market: < 3 months\n- Code coverage: > 80%\n- User satisfaction: > 4.5/5`,
      format: 'markdown', createdAt: timestamp, approved: false,
    },
    {
      id: generateId(), title: 'Milestone Plan', role: role.name, phase: 'requirements',
      content: `# Milestone Plan: ${project}\n\n## M1 - Foundation (Week 1-2)\n- Project scaffolding\n- CI/CD pipeline\n- Database setup\n\n## M2 - Core Features (Week 3-6)\n- User authentication\n- CRUD operations\n- API endpoints\n\n## M3 - Quality (Week 7-8)\n- Test coverage\n- Security audit\n- Performance optimization\n\n## M4 - Launch (Week 9-10)\n- Documentation\n- Deployment\n- Monitoring`,
      format: 'markdown', createdAt: timestamp, approved: false,
    },
  ];
}

function generateArchitecture(project: string, role: SimulationRole): SimulationArtifact[] {
  const timestamp = new Date().toISOString();
  return [
    {
      id: generateId(), title: 'Architecture Decision Record', role: role.name, phase: 'architecture',
      content: `# ADR-001: Architecture for ${project}\n\n## Status\nAccepted\n\n## Context\nNeed a scalable, maintainable architecture.\n\n## Decision\nUse Clean Architecture with the following layers:\n- **Domain Layer**: Entities, Value Objects, Domain Services\n- **Application Layer**: Use Cases, DTOs, Application Services\n- **Infrastructure Layer**: Repositories, External APIs, Database\n- **Presentation Layer**: Controllers, Middleware, Views\n\n## Consequences\n- Positive: Testability, maintainability, separation of concerns\n- Negative: More boilerplate code\n\n## Technology Stack\n- Backend: Node.js + TypeScript\n- Framework: NestJS\n- Database: PostgreSQL\n- ORM: Prisma\n- Validation: Zod`,
      format: 'markdown', createdAt: timestamp, approved: false,
    },
    {
      id: generateId(), title: 'Component Diagram', role: role.name, phase: 'architecture',
      content: `graph TD\n  A[Client] --> B[API Gateway]\n  B --> C[Auth Service]\n  B --> D[Business Service]\n  D --> E[Domain Layer]\n  E --> F[Repository]\n  F --> G[Database]\n  C --> H[User Repository]\n  H --> G`,
      format: 'diagram', createdAt: timestamp, approved: false,
    },
  ];
}

function generateImplementation(project: string, role: SimulationRole): SimulationArtifact[] {
  const timestamp = new Date().toISOString();
  return [
    {
      id: generateId(), title: 'Entity Definition', role: role.name, phase: 'implementation',
      content: `// Domain/Entities/Project.ts\nexport class Project {\n  constructor(\n    public readonly id: string,\n    public name: string,\n    public description: string,\n    public createdAt: Date,\n    public updatedAt: Date\n  ) {}\n\n  static create(name: string, description: string): Project {\n    return new Project(\n      crypto.randomUUID(),\n      name,\n      description,\n      new Date(),\n      new Date()\n    );\n  }\n\n  update(name: string, description: string): void {\n    this.name = name;\n    this.description = description;\n    this.updatedAt = new Date();\n  }\n}`,
      format: 'code', createdAt: timestamp, approved: false,
    },
    {
      id: generateId(), title: 'Use Case', role: role.name, phase: 'implementation',
      content: `// Application/UseCases/CreateProjectUseCase.ts\nexport class CreateProjectUseCase {\n  constructor(private repo: ProjectRepository) {}\n\n  async execute(input: CreateProjectInput): Promise<Project> {\n    const project = Project.create(input.name, input.description);\n    await this.repo.save(project);\n    return project;\n  }\n}\n\ninterface CreateProjectInput {\n  name: string;\n  description: string;\n}`,
      format: 'code', createdAt: timestamp, approved: false,
    },
    {
      id: generateId(), title: 'Unit Tests', role: role.name, phase: 'implementation',
      content: `// __tests__/CreateProjectUseCase.test.ts\ndescribe('CreateProjectUseCase', () => {\n  it('should create a project successfully', async () => {\n    const mockRepo = { save: jest.fn() };\n    const useCase = new CreateProjectUseCase(mockRepo as Record<string, unknown>);\n\n    const result = await useCase.execute({\n      name: 'Test Project',\n      description: 'A test project',\n    });\n\n    expect(result).toBeDefined();\n    expect(result.name).toBe('Test Project');\n    expect(mockRepo.save).toHaveBeenCalled();\n  });\n\n  it('should throw on empty name', async () => {\n    const useCase = new CreateProjectUseCase({} as Record<string, unknown>);\n    await expect(useCase.execute({ name: '', description: '' })).rejects.toThrow();\n  });\n});`,
      format: 'code', createdAt: timestamp, approved: false,
    },
  ];
}

function generateTesting(project: string, role: SimulationRole): SimulationArtifact[] {
  const timestamp = new Date().toISOString();
  return [
    {
      id: generateId(), title: 'Test Plan', role: role.name, phase: 'testing',
      content: `# Test Plan: ${project}\n\n## Scope\n- Unit tests for all use cases\n- Integration tests for repositories\n- E2E tests for critical paths\n\n## Test Levels\n1. **Unit** (80%+ coverage)\n   - Domain entities\n   - Use cases\n   - Validators\n2. **Integration** (60%+ coverage)\n   - Repository implementations\n   - External API adapters\n3. **E2E** (Critical paths only)\n   - User registration flow\n   - CRUD operations\n\n## Tools\n- Jest (unit/integration)\n- Supertest (E2E)\n- Faker (test data)`,
      format: 'markdown', createdAt: timestamp, approved: false,
    },
    {
      id: generateId(), title: 'Test Cases', role: role.name, phase: 'testing',
      content: `# Test Cases\n\n| ID | Description | Steps | Expected |\n|----|-------------|-------|----------|\n| TC1 | Create project | POST /api/projects | 201 Created |\n| TC2 | Get project list | GET /api/projects | 200 + array |\n| TC3 | Update project | PUT /api/projects/:id | 200 OK |\n| TC4 | Delete project | DELETE /api/projects/:id | 204 No Content |\n| TC5 | Invalid input | POST /api/projects {} | 400 Bad Request |`,
      format: 'markdown', createdAt: timestamp, approved: false,
    },
  ];
}

function generateDeployment(project: string): SimulationArtifact[] {
  const timestamp = new Date().toISOString();
  return [
    {
      id: generateId(), title: 'Deployment Pipeline', role: 'cto', phase: 'deployment',
      content: `# Deployment Pipeline for ${project}\n\n## Stages\n1. **Lint** - ESLint + Prettier\n2. **TypeCheck** - tsc --noEmit\n3. **Test** - jest --coverage\n4. **Build** - npm run build\n5. **Security** - npm audit\n6. **Deploy** - Deploy to production\n\n## Infrastructure\n- Container: Docker\n- Orchestration: Kubernetes\n- Registry: GitHub Container Registry\n- Environment: Staging + Production`,
      format: 'markdown', createdAt: timestamp, approved: false,
    },
    {
      id: generateId(), title: 'Dockerfile', role: 'engineer', phase: 'deployment',
      content: `FROM node:20-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:20-alpine AS production\nWORKDIR /app\nCOPY --from=builder /app/dist ./dist\nCOPY --from=builder /app/node_modules ./node_modules\nEXPOSE 3000\nCMD ["node", "dist/index.js"]`,
      format: 'code', createdAt: timestamp, approved: false,
    },
  ];
}

function generateReview(project: string): SimulationArtifact[] {
  const timestamp = new Date().toISOString();
  return [
    {
      id: generateId(), title: 'Final Review Report', role: 'ceo', phase: 'review',
      content: `# Executive Review: ${project}\n\n## Summary\n✅ Project meets all acceptance criteria\n✅ Architecture follows Clean Architecture principles\n✅ Code coverage above 80%\n✅ All security checks passed\n\n## Recommendations\n1. Monitor performance in production\n2. Schedule regular dependency updates\n3. Plan for scaling phase 2\n\n## Verdict\n**APPROVED** - Ready for production deployment`,
      format: 'markdown', createdAt: timestamp, approved: false,
    },
    {
      id: generateId(), title: 'Technical Debt Log', role: 'cto', phase: 'review',
      content: `# Technical Debt Log\n\n| Item | Severity | Priority | Estimated Effort |\n|------|----------|----------|-----------------|\n| Add request rate limiting | Medium | P2 | 2 days |\n| Implement caching layer | Medium | P2 | 3 days |\n| Add API versioning | Low | P3 | 1 day |\n| Improve error messages | Low | P3 | 0.5 day |`,
      format: 'markdown', createdAt: timestamp, approved: false,
    },
  ];
}

/**
 * Gera phase artifacts.
 * @param project - Valor project.
 * @param phase - Valor phase.
 * @param role - Valor role.
 * @returns O resultado da operação.
 */
export function generatePhaseArtifacts(project: CompanyProject, phase: SimulationPhase, role: SimulationRole): SimulationArtifact[] {
  switch (phase) {
    case 'requirements': return generateRequirements(project.name, role);
    case 'architecture': return generateArchitecture(project.name, role);
    case 'implementation': return generateImplementation(project.name, role);
    case 'testing': return generateTesting(project.name, role);
    case 'deployment': return generateDeployment(project.name);
    case 'review': return generateReview(project.name);
  }
}
