import { analyzeNeed, getRecommendations, getAgentForTask, getContextForTask, getWorkflowForTask, suggestPipeline } from '../src/semantic-api';

describe('Semantic API', () => {
  it('analyzeNeed parses description', () => {
    const need = analyzeNeed('Build a web application with authentication', 3);
    expect(need.description).toBe('Build a web application with authentication');
    expect(need.teamSize).toBe(3);
  });

  it('analyzeNeed without team size defaults to 1', () => {
    const need = analyzeNeed('Simple CLI tool');
    expect(need.teamSize).toBe(1);
  });

  it('getRecommendations returns match results', () => {
    const need = analyzeNeed('Database migration');
    const result = getRecommendations(need);
    expect(result).toBeDefined();
    expect(result.semanticNeed.description).toBe('Database migration');
  });

  it('getAgentForTask returns an agent recommendation', () => {
    const agent = getAgentForTask('Build a React frontend');
    expect(agent).toBeDefined();
    expect(agent.agentId).toBeDefined();
  });

  it('getAgentForTask returns unknown for ambiguous tasks', () => {
    const agent = getAgentForTask('something completely unrecognizable xyz123');
    expect(agent).toBeDefined();
    expect(typeof agent.confidence).toBe('number');
  });

  it('getContextForTask returns context pack recommendations', () => {
    const packs = getContextForTask('Deploy a microservice');
    expect(Array.isArray(packs)).toBe(true);
  });

  it('getContextForTask returns array even for unknown tasks', () => {
    const packs = getContextForTask('xyz-unknown-task-123');
    expect(Array.isArray(packs)).toBe(true);
  });

  it('getWorkflowForTask returns workflow recommendation', () => {
    const workflow = getWorkflowForTask('Web application');
    expect(workflow).toBeDefined();
    expect(workflow.workflowId).toBeDefined();
  });

  it('getWorkflowForTask returns default for ambiguous', () => {
    const workflow = getWorkflowForTask('xyz-unknown-999');
    expect(workflow).toBeDefined();
  });

  it('suggestPipeline returns complete pipeline suggestion', () => {
    const pipeline = suggestPipeline('Build a full-stack web app with tests');
    expect(pipeline.agents).toBeDefined();
    expect(pipeline.packs).toBeDefined();
    expect(pipeline.workflow).toBeDefined();
  });
});
