import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AdrCli, createAdrCli } from '../src/adr-cli';
import { EventBus } from '@ideia/event-bus';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

function createTestBus(): EventBus {
  return { emit: async () => {} } as unknown as EventBus;
}

describe('AdrCli', () => {
  let cli: AdrCli;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adr-cli-test-'));
    cli = createAdrCli(createTestBus(), tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('can be constructed', () => {
    expect(cli).toBeDefined();
  });

  it('init creates ADR directory and README', async () => {
    const result = await cli.init();
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'README.md'))).toBe(true);
  });

  it('create generates a new ADR', async () => {
    const result = await cli.create('Test ADR', {
      context: 'Test context',
      decision: 'Test decision',
      consequences: ['C1'],
    });
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect((result.data as { id: string }).id).toBe('0001');
  });

  it('list returns empty for no ADRs', async () => {
    const result = await cli.list();
    expect(result.success).toBe(true);
    expect(result.message).toContain('No ADRs found');
  });

  it('list returns created ADRs', async () => {
    await cli.create('First ADR');
    const result = await cli.list();
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
    expect((result.data as Array<unknown>).length).toBe(1);
  });

  it('show returns specific ADR', async () => {
    await cli.create('Showable ADR');
    const result = await cli.show('0001');
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect((result.data as { title: string }).title).toBe('Showable ADR');
  });

  it('show returns error for unknown ADR', async () => {
    const result = await cli.show('9999');
    expect(result.success).toBe(false);
  });

  it('updateStatus changes ADR status', async () => {
    await cli.create('Status Test');
    const result = await cli.updateStatus('0001', 'accepted');
    expect(result.success).toBe(true);
    expect(result.message).toContain('accepted');
  });

  it('updateStatus rejects invalid status', async () => {
    const result = await cli.updateStatus('0001', 'invalid');
    expect(result.success).toBe(false);
  });
});
