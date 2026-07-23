import { createProject, runSimulation, formatSimulationReport } from '../company';

describe('createProject', () => {
  it('creates a project with given name and description', () => {
    const project = createProject('TestCorp', 'A test company');
    expect(project.name).toBe('TestCorp');
    expect(project.description).toBe('A test company');
    expect(project.status).toBe('planning');
  });

  it('initializes with roles and artifacts', () => {
    const project = createProject('Startup', 'A startup');
    expect(project.roles.length).toBeGreaterThan(0);
  });
});

describe('runSimulation', () => {
  it('runs simulation and produces timeline', () => {
    const project = createProject('TestCorp', 'Test');
    const result = runSimulation(project);
    expect(result.timeline.length).toBeGreaterThan(0);
    expect(result.status).toMatch(/completed|in_progress/);
  });

  it('maintains project identity', () => {
    const project = createProject('Acme', 'Widget maker');
    const result = runSimulation(project);
    expect(result.name).toBe('Acme');
    expect(result.description).toBe('Widget maker');
  });
});

describe('formatSimulationReport', () => {
  it('produces a text report containing project name', () => {
    const project = createProject('ReportCo', 'Reporting');
    const completed = runSimulation(project);
    const report = formatSimulationReport(completed);
    expect(report.length).toBeGreaterThan(0);
    expect(report).toContain('ReportCo');
  });
});
