import { SemanticAnalyzer } from '../src/analyzer';

describe('SemanticAnalyzer', () => {
  let analyzer: SemanticAnalyzer;

  beforeEach(() => {
    analyzer = new SemanticAnalyzer();
  });

  it('should extract tech stack from description', () => {
    const result = analyzer.analyze('Build a web app with React and Node.js', 3);
    expect(result.techStack).toContain('react');
    expect(result.techStack).toContain('node');
  });

  it('should detect domain from description', () => {
    const result = analyzer.analyze('Create a REST API with authentication', 2);
    expect(result.domain).toBe('api');
  });

  it('should detect complexity as simple for basic descriptions', () => {
    const result = analyzer.analyze('A simple static website', 1);
    expect(result.complexity).toBe('simple');
  });

  it('should detect complexity as complex for distributed systems', () => {
    const result = analyzer.analyze('Build a distributed microservices platform with event-driven architecture', 5);
    expect(result.complexity).toBe('complex');
  });

  it('should detect complexity as moderate for api descriptions', () => {
    const result = analyzer.analyze('REST API with database and cache', 2);
    expect(result.complexity).toBe('moderate');
  });

  it('should detect stage from description', () => {
    const result = analyzer.analyze('MVP prototype for quick validation', 2);
    expect(result.stage).toBe('mvp');
  });

  it('should default to idea stage when no indicators found', () => {
    const result = analyzer.analyze('Build something cool', 1);
    expect(result.stage).toBe('idea');
  });

  it('should return default teamSize when not provided', () => {
    const result = analyzer.analyze('Test project');
    expect(result.teamSize).toBe(1);
  });

  it('should extract keywords including bigrams', () => {
    const keywords = analyzer.extractKeywords('Build a web application with docker');
    expect(keywords.length).toBeGreaterThan(0);
    expect(keywords).toContain('build');
    expect(keywords).toContain('web');
  });

  it('should return web as default domain when nothing matches', () => {
    const result = analyzer.analyze('Some random project', 1);
    expect(result.domain).toBe('web');
  });

  it('should detect growth stage', () => {
    const result = analyzer.analyze('Scale the platform to handle more users', 3);
    expect(result.stage).toBe('growth');
  });

  it('should detect mature stage', () => {
    const result = analyzer.analyze('Enterprise production system with compliance', 5);
    expect(result.stage).toBe('mature');
  });
});
