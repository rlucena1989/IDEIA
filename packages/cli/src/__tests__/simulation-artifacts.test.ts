import { generatePhaseArtifacts } from '../local-ai/simulation/artifacts';
import { CompanyProject, SimulationRole } from '../local-ai/simulation/types';

const mockProject: CompanyProject = {
  name: 'TestProject',
  description: 'A test project',
  createdAt: '2026-01-01T00:00:00.000Z',
  status: 'in_progress',
  roles: [],
  artifacts: [],
  timeline: [],
};

const mockRole: SimulationRole = {
  name: 'engineer',
  title: 'Software Engineer',
  responsibilities: ['Implement features'],
  artifactsProduced: ['Source Code'],
};

describe('generatePhaseArtifacts', () => {
  it('deve gerar artefatos para fase requirements', () => {
    const artifacts = generatePhaseArtifacts(mockProject, 'requirements', mockRole);
    expect(artifacts).toHaveLength(2);
    expect(artifacts[0].title).toBe('Product Vision');
    expect(artifacts[0].phase).toBe('requirements');
    expect(artifacts[0].format).toBe('markdown');
    expect(artifacts[0].approved).toBe(false);
    expect(artifacts[0].content).toContain('TestProject');
    expect(artifacts[1].title).toBe('Milestone Plan');
  });

  it('deve gerar artefatos para fase architecture', () => {
    const artifacts = generatePhaseArtifacts(mockProject, 'architecture', mockRole);
    expect(artifacts).toHaveLength(2);
    expect(artifacts[0].title).toBe('Architecture Decision Record');
    expect(artifacts[0].content).toContain('Clean Architecture');
    expect(artifacts[1].title).toBe('Component Diagram');
    expect(artifacts[1].format).toBe('diagram');
  });

  it('deve gerar artefatos para fase implementation', () => {
    const artifacts = generatePhaseArtifacts(mockProject, 'implementation', mockRole);
    expect(artifacts).toHaveLength(3);
    expect(artifacts[0].title).toBe('Entity Definition');
    expect(artifacts[0].format).toBe('code');
    expect(artifacts[0].content).toContain('class Project');
    expect(artifacts[1].title).toBe('Use Case');
    expect(artifacts[2].title).toBe('Unit Tests');
  });

  it('deve gerar artefatos para fase testing', () => {
    const artifacts = generatePhaseArtifacts(mockProject, 'testing', mockRole);
    expect(artifacts).toHaveLength(2);
    expect(artifacts[0].title).toBe('Test Plan');
    expect(artifacts[0].content).toContain('Unit tests for all use cases');
    expect(artifacts[1].title).toBe('Test Cases');
  });

  it('deve gerar artefatos para fase deployment', () => {
    const artifacts = generatePhaseArtifacts(mockProject, 'deployment', mockRole);
    expect(artifacts).toHaveLength(2);
    expect(artifacts[0].title).toBe('Deployment Pipeline');
    expect(artifacts[0].role).toBe('cto');
    expect(artifacts[1].title).toBe('Dockerfile');
  });

  it('deve gerar artefatos para fase review', () => {
    const artifacts = generatePhaseArtifacts(mockProject, 'review', mockRole);
    expect(artifacts).toHaveLength(2);
    expect(artifacts[0].title).toBe('Final Review Report');
    expect(artifacts[0].role).toBe('ceo');
    expect(artifacts[0].content).toContain('APPROVED');
    expect(artifacts[1].title).toBe('Technical Debt Log');
  });

  it('cada artefato deve ter id unico', () => {
    const req = generatePhaseArtifacts(mockProject, 'requirements', mockRole);
    const arch = generatePhaseArtifacts(mockProject, 'architecture', mockRole);
    const ids = [...req, ...arch].map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada artefato deve ter createdAt no formato ISO', () => {
    const artifacts = generatePhaseArtifacts(mockProject, 'testing', mockRole);
    for (const a of artifacts) {
      expect(() => new Date(a.createdAt)).not.toThrow();
      expect(new Date(a.createdAt).toISOString()).toBe(a.createdAt);
    }
  });
});
