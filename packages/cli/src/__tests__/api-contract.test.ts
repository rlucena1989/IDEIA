import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockGenerateFiles = jest.fn();
const mockPrintResult = jest.fn();
const mockBuildVars = jest.fn();

jest.mock('../generators/engine', () => ({
  generateFiles: (...args: unknown[]) => mockGenerateFiles(...args),
  printGeneratorResult: (...args: unknown[]) => mockPrintResult(...args),
  buildVars: (...args: unknown[]) => mockBuildVars(...args),
}));

describe('generators - api-contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildVars.mockReturnValue({
      name: 'user', Name: 'User', NAME: 'USER', name_kebab: 'user',
      name_plural: 'users', NamePlural: 'Users',
    });
    mockGenerateFiles.mockReturnValue({ created: [], skipped: [], overwritten: [], errors: [] });
  });

  it('openApiSpec gera arquivos OpenAPI', () => {
    const { openApiSpec } = require('../generators/api-contract');
    openApiSpec('User', { dryRun: false, force: false });

    expect(mockBuildVars).toHaveBeenCalledWith('User');
    expect(mockGenerateFiles).toHaveBeenCalledTimes(1);
    expect(mockPrintResult).toHaveBeenCalledTimes(1);

    const files = mockGenerateFiles.mock.calls[0][0];
    expect(files).toHaveLength(1);
    expect(files[0].path).toContain('UserAPI.yaml');
    expect(files[0].content).toContain('openapi: 3.1.0');
    expect(files[0].content).toContain('/users');
  });

  it('openApiSpec usa fields customizados', () => {
    const { openApiSpec } = require('../generators/api-contract');
    openApiSpec('Product', { dryRun: false, force: false, fields: 'id,title,price' });

    const files = mockGenerateFiles.mock.calls[0][0];
    expect(files[0].content).toContain('title');
    expect(files[0].content).toContain('price');
  });

  it('openApiSpec em dry-run mode', () => {
    const { openApiSpec } = require('../generators/api-contract');
    openApiSpec('Test', { dryRun: true, force: false });

    expect(mockPrintResult).toHaveBeenCalledWith(
      expect.stringContaining('Test'),
      expect.anything(),
      true
    );
  });

  it('graphqlSchema gera arquivos GraphQL', () => {
    const { graphqlSchema } = require('../generators/api-contract');
    graphqlSchema('User', { dryRun: false, force: false });

    expect(mockBuildVars).toHaveBeenCalledWith('User');
    expect(mockGenerateFiles).toHaveBeenCalledTimes(1);
    expect(mockPrintResult).toHaveBeenCalledTimes(1);

    const files = mockGenerateFiles.mock.calls[0][0];
    expect(files).toHaveLength(1);
    expect(files[0].path).toContain('User.graphql');
    expect(files[0].content).toContain('type User');
    expect(files[0].content).toContain('type Query');
    expect(files[0].content).toContain('type Mutation');
  });

  it('graphqlSchema usa model customizado', () => {
    const { graphqlSchema } = require('../generators/api-contract');
    graphqlSchema('Product', { dryRun: false, force: false, model: 'Item' });

    expect(mockGenerateFiles).toHaveBeenCalled();
  });

  it('graphqlSchema em dry-run mode', () => {
    const { graphqlSchema } = require('../generators/api-contract');
    graphqlSchema('Test', { dryRun: true, force: false });

    expect(mockPrintResult).toHaveBeenCalledWith(
      expect.stringContaining('Test'),
      expect.anything(),
      true
    );
  });

  it('graphqlSchema com fields customizados', () => {
    const { graphqlSchema } = require('../generators/api-contract');
    graphqlSchema('Post', { dryRun: false, force: false, fields: 'id: Int! title: String! body: String' });

    const files = mockGenerateFiles.mock.calls[0][0];
    expect(files[0].content).toContain('title:');
    expect(files[0].content).toContain('String!');
  });
});
