jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn().mockReturnValue({ created: [], skipped: [], overwritten: [], errors: [] }) };
});

import { generateFiles } from '../engine';
import { openApiSpec, graphqlSchema } from '../api-contract';

describe('openApiSpec', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates an OpenAPI spec file', () => {
    openApiSpec('User', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(1);
    expect(files[0].path).toContain('UserAPI.yaml');
    expect(files[0].content).toContain('openapi: 3.1.0');
  });

  it('accepts custom fields option', () => {
    openApiSpec('Order', { dryRun: false, force: false, fields: 'id,email,status,createdAt' });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].content).toContain('email');
    expect(files[0].content).toContain('status');
  });

  it('uses default fields when not provided', () => {
    openApiSpec('Product', { dryRun: false, force: false });
    const [, vars] = (generateFiles as jest.Mock).mock.calls[0];
    expect(vars.name).toBe('Product');
  });

  it('includes model option in spec', () => {
    openApiSpec('Custom', { dryRun: false, force: false, model: 'CustomModel' });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].path).toContain('CustomAPI.yaml');
  });
});

describe('graphqlSchema', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates a GraphQL schema file', () => {
    graphqlSchema('User', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(1);
    expect(files[0].path).toContain('User.graphql');
    expect(files[0].content).toContain('type User');
  });

  it('accepts custom fields with types', () => {
    graphqlSchema('Order', { dryRun: false, force: false, fields: 'id: Int! total: Float! status: String!' });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].content).toContain('total:');
    expect(files[0].content).toContain('Float!');
    expect(files[0].content).toContain('status:');
    expect(files[0].content).toContain('String!');
  });

  it('generates query and mutation types', () => {
    graphqlSchema('Product', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].content).toContain('type Query');
    expect(files[0].content).toContain('type Mutation');
  });

  it('creates input type without id field', () => {
    graphqlSchema('Task', { dryRun: false, force: false, fields: 'id: Int! title: String!' });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].content).toContain('input TaskInput');
  });
});
