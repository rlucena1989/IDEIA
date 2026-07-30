import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { Command } from 'commander';
import { initCommand, shouldCopyFile, validateFlavor, ALLOWED_FLAVORS, MODE_FILTERS } from '../src/commands/init';

function makeProgram(): Command {
  const program = new Command();
  program.addCommand(initCommand());
  return program;
}

describe('CLI E2E Smoke', () => {
  let tempDir: string;
  let origCwd: () => string;
  let origExit: typeof process.exit;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ideia-e2e-'));
    origCwd = process.cwd.bind(process.cwd);
    origExit = process.exit.bind(process.exit);
    jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
    jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as any);
  });

  afterAll(() => {
    jest.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  async function runCmd(args: string[]): Promise<void> {
    const program = makeProgram();
    await program.parseAsync(args, { from: 'user' });
  }

  describe('init command', () => {
    it('creates expected structure with minimal mode', async () => {
      await runCmd(['init', 'test-project', '--minimal', '--yes']);
      const projectDir = path.join(tempDir, 'test-project');
      expect(fs.existsSync(projectDir)).toBe(true);
      expect(fs.existsSync(path.join(projectDir, '.ai'))).toBe(true);
    }, 30000);

    it('creates laws.yaml in minimal mode', async () => {
      await runCmd(['init', 'test-project-2', '--minimal', '--yes']);
      const projectDir = path.join(tempDir, 'test-project-2');
      expect(fs.existsSync(path.join(projectDir, '.ai', 'laws.yaml'))).toBe(true);
    }, 30000);

    it('creates project-manifest.yaml', async () => {
      await runCmd(['init', 'test-project-3', '--minimal', '--yes']);
      const projectDir = path.join(tempDir, 'test-project-3');
      expect(fs.existsSync(path.join(projectDir, '.ai', 'project-manifest.yaml'))).toBe(true);
    }, 30000);

    it('handles dry-run without writing files', async () => {
      await runCmd(['init', 'dry-run-project', '--minimal', '--dry-run']);
      const projectDir = path.join(tempDir, 'dry-run-project');
      expect(fs.existsSync(projectDir)).toBe(false);
    }, 30000);

    it('scaffolds with --template flag', async () => {
      await runCmd(['init', 'tpl-project', '--minimal', '--template', 'nodejs-api', '--yes']);
      const projectDir = path.join(tempDir, 'tpl-project');
      expect(fs.existsSync(projectDir)).toBe(true);
      expect(fs.existsSync(path.join(projectDir, '.ai'))).toBe(true);
    }, 30000);
  });

  describe('init utilities', () => {
    it('shouldCopyFile includes minimal files', () => {
      expect(shouldCopyFile('laws.yaml', 'minimal')).toBe(true);
      expect(shouldCopyFile('project-manifest.yaml', 'minimal')).toBe(true);
    });

    it('shouldCopyFile excludes template directories in standard mode', () => {
      expect(shouldCopyFile('generators/feature-blueprint.js', 'standard')).toBe(false);
      expect(shouldCopyFile('prompts/copilot.md', 'standard')).toBe(false);
    });

    it('validateFlavor accepts all allowed flavors', () => {
      for (const flavor of ALLOWED_FLAVORS) {
        expect(() => validateFlavor(flavor)).not.toThrow();
      }
    });

    it('validateFlavor rejects invalid flavors', () => {
      expect(() => validateFlavor('invalid')).toThrow();
    });

    it('MODE_FILTERS minimal has correct structure', () => {
      expect(MODE_FILTERS.minimal.include).toContain('laws.yaml');
      expect(MODE_FILTERS.minimal.include).toContain('project-manifest.yaml');
      expect(MODE_FILTERS.minimal.include).toContain('context/ai-handoff.md');
    });
  });
});
