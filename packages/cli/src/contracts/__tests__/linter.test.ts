import fs from 'fs';
import path from 'path';
import os from 'os';
import { lintSpec } from '../linter';

describe('linter', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'linter-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeSpec(name: string, content: string): string {
    const fp = path.join(tmpDir, name);
    fs.writeFileSync(fp, content, 'utf-8');
    return fp;
  }

  test('lints OpenAPI spec with warnings', () => {
    const fp = writeSpec('api.json', JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/users': {
          get: {
            operationId: 'listUsers',
            responses: { '200': { description: 'OK' } },
          },
        },
      },
    }));
    const result = lintSpec(fp);
    expect(result.specType).toBe('openapi');
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThan(0);
  });

  test('detects missing servers in OpenAPI', () => {
    const fp = writeSpec('no-servers.json', JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    }));
    const result = lintSpec(fp);
    expect(result.issues.some(i => i.rule === 'no-servers')).toBe(true);
  });

  test('detects missing security schemes in OpenAPI', () => {
    const fp = writeSpec('no-security.json', JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
      components: {},
    }));
    const result = lintSpec(fp);
    expect(result.issues.some(i => i.rule === 'security')).toBe(true);
  });

  test('detects GET with requestBody in OpenAPI', () => {
    const fp = writeSpec('get-body.json', JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/search': {
          get: {
            operationId: 'search',
            requestBody: { content: { 'application/json': {} } },
            responses: { '200': { description: 'OK' } },
          },
        },
      },
    }));
    const result = lintSpec(fp);
    expect(result.issues.some(i => i.rule === 'get-body')).toBe(true);
  });

  test('lints AsyncAPI spec', () => {
    const fp = writeSpec('async.yaml', `
asyncapi: '2.0.0'
info:
  title: Test
  version: '1.0.0'
channels:
  events:
    subscribe:
      message:
        payload:
          type: object
    `);
    const result = lintSpec(fp);
    expect(result.specType).toBe('asyncapi');
    expect(result.issues.length).toBeGreaterThan(0);
  });

  test('detects missing channels in AsyncAPI', () => {
    const fp = writeSpec('no-channels.yaml', `
asyncapi: '2.0.0'
info:
  title: Test
  version: '1.0.0'
channels: {}
    `);
    const result = lintSpec(fp);
    expect(result.issues.some(i => i.rule === 'no-channels')).toBe(true);
  });

  test('handles unknown spec type', () => {
    const fp = writeSpec('unknown.json', JSON.stringify({ name: 'unknown' }));
    const result = lintSpec(fp);
    expect(result.specType).toBe('unknown');
    expect(result.issues.some(i => i.rule === 'unknown-type')).toBe(true);
  });

  test('calculates score correctly', () => {
    const fp = writeSpec('perfect.json', JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Perfect', version: '1.0.0' },
      servers: [{ url: 'http://localhost' }],
      paths: {
        '/items': {
          get: {
            operationId: 'listItems',
            responses: { '200': { description: 'OK' } },
          },
        },
      },
      components: {
        securitySchemes: { apiKey: { type: 'apiKey' } },
      },
    }));
    const result = lintSpec(fp);
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  test('throws for non-existent file', () => {
    expect(() => lintSpec(path.join(tmpDir, 'nonexistent.json'))).toThrow();
  });
});
