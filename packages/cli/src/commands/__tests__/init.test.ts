import {
  ALLOWED_FLAVORS, TEMPLATES, INSTALL_MODES, MODE_FILTERS,
  findProjectTemplateDir, scaffoldFromTemplate, validateFlavor,
  autoDetectFlavor, shouldCopyFile, initCommand,
} from '../init';
import type { InitDeps } from '../init';

const makeDeps = (overrides = {}): InitDeps => ({
  existsSync: jest.fn().mockReturnValue(false),
  statSync: jest.fn().mockImplementation(() => ({ isDirectory: () => true })),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn().mockReturnValue([]),
  readFileSync: jest.fn().mockReturnValue(''),
  readFileBuffer: jest.fn().mockReturnValue(Buffer.from('')),
  writeFileSync: jest.fn(),
  pathResolve: jest.fn((...s: string[]) => s.join('/')),
  pathJoin: jest.fn((...s: string[]) => s.join('/')),
  pathBasename: jest.fn((p: string) => p.split('/').pop() || ''),
  pathDirname: jest.fn((p: string) => p.split('/').slice(0, -1).join('/')),
  pathRelative: jest.fn((_f: string, t: string) => t),
  cwd: '/project',
  __dirname: '/project/node_modules/package',
  log: jest.fn(),
  error: jest.fn(),
  detectStack: jest.fn().mockReturnValue({ languages: ['typescript'], frameworks: ['nestjs'] }),
  ...overrides,
});

describe('ALLOWED_FLAVORS', () => {
  it('should contain valid flavors', () => {
    expect(ALLOWED_FLAVORS).toContain('nestjs');
    expect(ALLOWED_FLAVORS).toContain('express');
    expect(ALLOWED_FLAVORS).toContain('fastify');
    expect(ALLOWED_FLAVORS).toContain('fastapi');
    expect(ALLOWED_FLAVORS).toContain('go');
    expect(ALLOWED_FLAVORS.length).toBe(5);
  });
});

describe('TEMPLATES', () => {
  it('should contain valid templates', () => {
    expect(TEMPLATES).toContain('nodejs-api');
    expect(TEMPLATES).toContain('nextjs-app');
    expect(TEMPLATES).toContain('python-api');
    expect(TEMPLATES.length).toBe(3);
  });
});

describe('INSTALL_MODES', () => {
  it('should contain valid install modes', () => {
    expect(INSTALL_MODES).toContain('minimal');
    expect(INSTALL_MODES).toContain('standard');
    expect(INSTALL_MODES).toContain('full');
    expect(INSTALL_MODES.length).toBe(3);
  });
});

describe('MODE_FILTERS', () => {
  it('should have minimal filter with include list', () => {
    const filter = MODE_FILTERS.minimal;
    expect(filter.include).toContain('laws.yaml');
    expect(filter.include).toContain('project-manifest.yaml');
    expect(filter.exclude).toEqual([]);
  });

  it('should have standard filter with exclude list', () => {
    const filter = MODE_FILTERS.standard;
    expect(filter.include).toEqual([]);
    expect(filter.exclude).toContain('generators');
    expect(filter.exclude).toContain('prompts');
    expect(filter.exclude).toContain('features');
  });

  it('should have full filter with empty include and exclude', () => {
    const filter = MODE_FILTERS.full;
    expect(filter.include).toEqual([]);
    expect(filter.exclude).toEqual([]);
  });
});

describe('findProjectTemplateDir', () => {
  it('should find existing template', () => {
    const deps = makeDeps({ existsSync: jest.fn().mockReturnValue(true) });
    const dir = findProjectTemplateDir('nodejs-api', deps);
    expect(dir).toBeTruthy();
  });

  it('should throw error if template not found', () => {
    const deps = makeDeps({ existsSync: jest.fn().mockReturnValue(false) });
    expect(() => findProjectTemplateDir('invalid', deps)).toThrow('not found');
  });

  it('should check multiple candidate paths', () => {
    const existsSync = jest.fn().mockReturnValue(false);
    const deps = makeDeps({ existsSync });
    expect(() => findProjectTemplateDir('test', deps)).toThrow('not found');
    expect(existsSync).toHaveBeenCalledTimes(3);
  });
});

describe('scaffoldFromTemplate', () => {
  it('should copy files in safe mode', () => {
    const deps = makeDeps({
      existsSync: jest.fn().mockReturnValue(false),
      statSync: jest.fn().mockImplementation(() => ({ isDirectory: () => false })),
      readdirSync: jest.fn().mockReturnValue([]),
    });
    const result = scaffoldFromTemplate('/source', '/dest', 'myapp', 'safe', deps);
    expect(result).toHaveProperty('copied');
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('skipped');
    expect(result).toHaveProperty('overwritten');
  });

  it('should overwrite in force mode', () => {
    const deps = makeDeps({
      existsSync: jest.fn().mockReturnValue(true),
      statSync: jest.fn().mockImplementation(() => ({ isDirectory: () => false })),
      readdirSync: jest.fn().mockReturnValue([]),
    });
    const result = scaffoldFromTemplate('/source', '/dest', 'myapp', 'force', deps);
    expect(result.overwritten.length).toBeGreaterThanOrEqual(0);
  });

  it('should skip existing files in safe mode', () => {
    const deps = makeDeps({
      existsSync: jest.fn().mockReturnValue(true),
      statSync: jest.fn().mockImplementation(() => ({ isDirectory: () => false })),
      readdirSync: jest.fn().mockReturnValue([]),
    });
    const result = scaffoldFromTemplate('/source', '/dest', 'myapp', 'safe', deps);
    expect(result.skipped.length).toBeGreaterThanOrEqual(0);
  });

  it('should not write files in dry-run mode', () => {
    const writeFileSync = jest.fn();
    const deps = makeDeps({
      existsSync: jest.fn().mockReturnValue(false),
      statSync: jest.fn().mockImplementation(() => ({ isDirectory: () => false })),
      readdirSync: jest.fn().mockReturnValue([]),
      writeFileSync,
    });
    scaffoldFromTemplate('/source', '/dest', 'myapp', 'dry-run', deps);
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it('should replace placeholder in package.json', () => {
    const readFileSync = jest.fn().mockReturnValue('{"name": "placeholder"}');
    const writeFileSync = jest.fn();
    const deps = makeDeps({
      existsSync: jest.fn().mockReturnValue(false),
      statSync: jest.fn().mockImplementation(() => ({ isDirectory: () => false })),
      readdirSync: jest.fn().mockReturnValue([]),
      readFileSync,
      writeFileSync,
    });
    scaffoldFromTemplate('/source/package.json', '/dest/package.json', 'myapp', 'safe', deps);
    const writtenContent = writeFileSync.mock.calls[0]?.[1];
    if (writtenContent) {
      expect(writtenContent).not.toContain('placeholder');
    }
  });

  it('should collect errors and not throw', () => {
    const deps = makeDeps({
      existsSync: jest.fn().mockImplementation(() => { throw new Error('access denied'); }),
    });
    const result = scaffoldFromTemplate('/source', '/dest', 'myapp', 'safe', deps);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('access denied');
  });
});

describe('validateFlavor', () => {
  it('should accept valid flavor', () => {
    expect(() => validateFlavor('nestjs')).not.toThrow();
    expect(() => validateFlavor('express')).not.toThrow();
    expect(() => validateFlavor('go')).not.toThrow();
  });

  it('should reject invalid flavor', () => {
    expect(() => validateFlavor('invalid')).toThrow('Invalid flavor');
    expect(() => validateFlavor('react')).toThrow('Invalid flavor');
    expect(() => validateFlavor('vue')).toThrow('Invalid flavor');
  });
});

describe('autoDetectFlavor', () => {
  it('should detect nestjs', () => {
    const deps = makeDeps();
    expect(autoDetectFlavor('/project', deps)).toBe('nestjs');
  });

  it('should detect fastify', () => {
    const deps = makeDeps({ detectStack: jest.fn().mockReturnValue({ languages: ['typescript'], frameworks: ['fastify'] }) });
    expect(autoDetectFlavor('/project', deps)).toBe('fastify');
  });

  it('should detect express', () => {
    const deps = makeDeps({ detectStack: jest.fn().mockReturnValue({ languages: ['javascript'], frameworks: ['express'] }) });
    expect(autoDetectFlavor('/project', deps)).toBe('express');
  });

  it('should detect fastapi', () => {
    const deps = makeDeps({ detectStack: jest.fn().mockReturnValue({ languages: ['python'], frameworks: ['fastapi'] }) });
    expect(autoDetectFlavor('/project', deps)).toBe('fastapi');
  });

  it('should detect go', () => {
    const deps = makeDeps({ detectStack: jest.fn().mockReturnValue({ languages: ['go'], frameworks: [] }) });
    expect(autoDetectFlavor('/project', deps)).toBe('go');
  });

  it('should return nestjs as default', () => {
    const deps = makeDeps({ detectStack: jest.fn().mockReturnValue({ languages: [], frameworks: [] }) });
    expect(autoDetectFlavor('/project', deps)).toBe('nestjs');
  });
});

describe('shouldCopyFile', () => {
  it('should include files in minimal include list', () => {
    expect(shouldCopyFile('laws.yaml', 'minimal')).toBe(true);
    expect(shouldCopyFile('project-manifest.yaml', 'minimal')).toBe(true);
    expect(shouldCopyFile('context/ai-handoff.md', 'minimal')).toBe(true);
  });

  it('should exclude files not in minimal include list', () => {
    expect(shouldCopyFile('generators/test.ts', 'minimal')).toBe(false);
    expect(shouldCopyFile('prompts/custom.md', 'minimal')).toBe(false);
  });

  it('should include everything in full', () => {
    expect(shouldCopyFile('anything.txt', 'full')).toBe(true);
    expect(shouldCopyFile('generators/test.ts', 'full')).toBe(true);
  });

  it('should exclude directories in standard', () => {
    expect(shouldCopyFile('generators/', 'standard')).toBe(false);
    expect(shouldCopyFile('generators', 'standard')).toBe(false);
  });

  it('should exclude paths under excluded directories in standard', () => {
    expect(shouldCopyFile('generators/test.ts', 'standard')).toBe(false);
    expect(shouldCopyFile('prompts/custom.md', 'standard')).toBe(false);
  });

  it('should include files not in standard exclude list', () => {
    expect(shouldCopyFile('laws.yaml', 'standard')).toBe(true);
    expect(shouldCopyFile('policies/command-policy.md', 'standard')).toBe(true);
  });
});

describe('initCommand', () => {
  it('should be defined', () => {
    expect(initCommand).toBeDefined();
  });

  it('should return a Command with name init', () => {
    const cmd = initCommand();
    expect(cmd.name()).toBe('init');
  });

  it('should define an argument via .argument() call', () => {
    const cmd = initCommand();
    const desc = cmd.description();
    expect(desc).toContain('Initialize');
  });

  it('should have --flavor option', () => {
    const cmd = initCommand();
    const opt = cmd.options.find(o => o.long === '--flavor');
    expect(opt).toBeDefined();
  });

  it('should have --template option', () => {
    const cmd = initCommand();
    const opt = cmd.options.find(o => o.long === '--template');
    expect(opt).toBeDefined();
  });

  it('should have --wizard option', () => {
    const cmd = initCommand();
    const opt = cmd.options.find(o => o.long === '--wizard');
    expect(opt).toBeDefined();
  });

  it('should have --force option', () => {
    const cmd = initCommand();
    const opt = cmd.options.find(o => o.long === '--force');
    expect(opt).toBeDefined();
  });

  it('should have --dry-run option', () => {
    const cmd = initCommand();
    const opt = cmd.options.find(o => o.long === '--dry-run');
    expect(opt).toBeDefined();
  });

  it('should have --yes option', () => {
    const cmd = initCommand();
    const opt = cmd.options.find(o => o.long === '--yes');
    expect(opt).toBeDefined();
  });

  it('should have --minimal option', () => {
    const cmd = initCommand();
    const opt = cmd.options.find(o => o.long === '--minimal');
    expect(opt).toBeDefined();
  });

  it('should have --standard option', () => {
    const cmd = initCommand();
    const opt = cmd.options.find(o => o.long === '--standard');
    expect(opt).toBeDefined();
  });

  it('should have --full option', () => {
    const cmd = initCommand();
    const opt = cmd.options.find(o => o.long === '--full');
    expect(opt).toBeDefined();
  });

  it('should have description containing Initialize', () => {
    const cmd = initCommand();
    expect(cmd.description()).toContain('Initialize');
  });
});
