import { SemanticMatcher } from '../src/semantic-matcher';

describe('SemanticMatcher', () => {
  let matcher: SemanticMatcher;

  beforeEach(() => {
    matcher = new SemanticMatcher();
  });

  it('should analyze a need and return complete match result', () => {
    const need = matcher.analyzeNeed('Build a web REST API with endpoints using TypeScript and Node.js', 3);
    expect(need.techStack).toContain('typescript');
    expect(need.techStack).toContain('node');
    expect(need.domain).toBe('api');
    expect(need.complexity).toBe('moderate');
  });

  it('should return capabilities from match', () => {
    const need = matcher.analyzeNeed('Build a secure REST API with database and cache', 2);
    const result = matcher.match(need);
    expect(result.capabilities.length).toBeGreaterThan(0);
    expect(result.capabilities[0].score).toBeGreaterThan(0);
  });

  it('should recommend agents for coding tasks', () => {
    const need = matcher.analyzeNeed('Implement a new feature with React and TypeScript', 2);
    const result = matcher.match(need);
    expect(result.agents.length).toBeGreaterThan(0);
    expect(result.agents.some(a => a.agentId === 'Programmer')).toBe(true);
  });

  it('should recommend context packs', () => {
    const need = matcher.analyzeNeed('Fix a bug in the deployment pipeline', 2);
    const result = matcher.match(need);
    expect(result.contextPacks.length).toBeGreaterThan(0);
  });

  it('should recommend workflows', () => {
    const need = matcher.analyzeNeed('Create a new web application with React', 3);
    const result = matcher.match(need);
    expect(result.workflows.length).toBeGreaterThan(0);
  });

  it('should add warning for empty tech stack', () => {
    const need = matcher.analyzeNeed('Build something', 1);
    const result = matcher.match(need);
    expect(result.warnings.some(w => w.includes('No technology stack'))).toBe(true);
  });

  it('should get agent for task', () => {
    const agent = matcher.getAgentForTask('Implement a new API endpoint');
    expect(agent.agentId).toBeTruthy();
    expect(agent.confidence).toBeGreaterThan(0);
  });

  it('should get context packs for task', () => {
    const packs = matcher.getContextForTask('Add unit tests and integration tests');
    expect(packs.length).toBeGreaterThan(0);
  });

  it('should get workflow for task', () => {
    const workflow = matcher.getWorkflowForTask('Deploy to production');
    expect(workflow.workflowId).toBeTruthy();
    expect(workflow.phases.length).toBeGreaterThan(0);
  });

  it('should suggest pipeline', () => {
    const pipeline = matcher.suggestPipeline('Build a full-stack web application with authentication');
    expect(pipeline.agents.length).toBeGreaterThan(0);
    expect(pipeline.packs.length).toBeGreaterThan(0);
    expect(pipeline.workflow.workflowId).toBeTruthy();
  });

  it('should return overallConfidence between 0 and 1', () => {
    const need = matcher.analyzeNeed('Build a web app', 1);
    const result = matcher.match(need);
    expect(result.overallConfidence).toBeGreaterThanOrEqual(0);
    expect(result.overallConfidence).toBeLessThanOrEqual(1);
  });
});
