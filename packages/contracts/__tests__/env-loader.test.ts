import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { loadEnv } from '../src/env-loader';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

describe('loadEnv', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `env-loader-test-${Date.now()}-${Math.random()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('does not throw when no env files exist', () => {
    expect(() => loadEnv(tmpDir)).not.toThrow();
  });

  it('loads .env file when present', () => {
    fs.writeFileSync(path.join(tmpDir, '.env'), 'TEST_VAR=hello\nANOTHER=world\n');
    expect(() => loadEnv(tmpDir)).not.toThrow();
  });

  it('loads .env.local after .env', () => {
    fs.writeFileSync(path.join(tmpDir, '.env'), 'KEY=from_env\n');
    fs.writeFileSync(path.join(tmpDir, '.env.local'), 'KEY=from_local\n');
    expect(() => loadEnv(tmpDir)).not.toThrow();
  });
});
