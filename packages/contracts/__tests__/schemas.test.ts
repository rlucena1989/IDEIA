import {
  RequirementSchema,
  WorkflowTaskSchema,
  TraceLinkSchema,
  FeedbackEventSchema,
  AgentIdentitySchema,
} from '../src/schemas';

describe('RequirementSchema', () => {
  it('should validate a valid requirement', () => {
    const result = RequirementSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'User authentication',
      category: 'security',
      createdAt: '2026-07-15T10:00:00.000Z',
      updatedAt: '2026-07-15T10:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing required fields', () => {
    const result = RequirementSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should apply defaults', () => {
    const result = RequirementSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test',
      category: 'functional',
      createdAt: '2026-07-15T10:00:00.000Z',
      updatedAt: '2026-07-15T10:00:00.000Z',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe('medium');
      expect(result.data.status).toBe('draft');
    }
  });
});

describe('WorkflowTaskSchema', () => {
  it('should validate a valid workflow task', () => {
    const result = WorkflowTaskSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Implement login',
      type: 'feature',
      createdAt: '2026-07-15T10:00:00.000Z',
      updatedAt: '2026-07-15T10:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('should accept dependencies array', () => {
    const result = WorkflowTaskSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440002',
      title: 'Test task',
      type: 'bug',
      dependencies: ['550e8400-e29b-41d4-a716-446655440001'],
      createdAt: '2026-07-15T10:00:00.000Z',
      updatedAt: '2026-07-15T10:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });
});

describe('TraceLinkSchema', () => {
  it('should validate a valid trace link', () => {
    const result = TraceLinkSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440010',
      sourceType: 'requirement',
      sourceId: '550e8400-e29b-41d4-a716-446655440000',
      targetType: 'workflow_task',
      targetId: '550e8400-e29b-41d4-a716-446655440001',
      relationship: 'implements',
      createdAt: '2026-07-15T10:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });
});

describe('FeedbackEventSchema', () => {
  it('should validate a valid feedback event', () => {
    const result = FeedbackEventSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440020',
      type: 'suggestion',
      source: 'user',
      targetType: 'workflow_task',
      targetId: '550e8400-e29b-41d4-a716-446655440001',
      content: 'Consider adding input validation',
      createdAt: '2026-07-15T10:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });
});

describe('AgentIdentitySchema', () => {
  it('should validate a valid agent identity', () => {
    const result = AgentIdentitySchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440030',
      name: 'code-engineer',
      role: 'engineer',
      createdAt: '2026-07-15T10:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('should reject unknown role', () => {
    const result = AgentIdentitySchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440031',
      name: 'hacker-agent',
      role: 'hacker',
      createdAt: '2026-07-15T10:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });
});
