import { ConfigEngine } from '../src/config-engine';

jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockRejectedValue(new Error('ENOENT')),
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn(() => { throw new Error('ENOENT'); }),
  existsSync: jest.fn(() => false),
}));

const mockFsp = jest.requireMock('fs/promises');

describe('ConfigEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('constructs without error', () => {
    const engine = new ConfigEngine();
    expect(engine).toBeDefined();
    expect(engine).toBeInstanceOf(ConfigEngine);
  });

  it('returns undefined for unknown config keys', () => {
    const engine = new ConfigEngine();
    expect(engine.get('nonexistent.key')).toBeUndefined();
  });

  it('sets and gets simple config values', async () => {
    const engine = new ConfigEngine();
    await engine.set('theme', 'dark');
    expect(engine.get('theme')).toBe('dark');
  });

  it('sets and gets nested config values with dot notation', async () => {
    const engine = new ConfigEngine();
    await engine.set('database.host', 'localhost');
    await engine.set('database.port', 5432);
    expect(engine.get('database.host')).toBe('localhost');
    expect(engine.get('database.port')).toBe(5432);
  });

  it('persists config to file on set', async () => {
    const engine = new ConfigEngine();
    await engine.set('foo', 'bar');
    expect(mockFsp.writeFile).toHaveBeenCalled();
    const [filePath] = mockFsp.writeFile.mock.calls[0];
    expect(filePath).toContain('.ideia');
    expect(filePath).toContain('config.json');
  });

  it('loads config from files', async () => {
    mockFsp.readFile.mockResolvedValue(JSON.stringify({ globalKey: 'globalVal' }));
    const engine = new ConfigEngine();
    await engine.load();
    expect(mockFsp.readFile).toHaveBeenCalled();
    const global = engine.getGlobal();
    expect(global).toBeDefined();
  });

  it('getFull returns merged config', async () => {
    const engine = new ConfigEngine();
    await engine.set('key', 'value');
    const full = engine.getFull();
    expect(full).toHaveProperty('key', 'value');
  });

  it('getProject returns project config', async () => {
    const engine = new ConfigEngine();
    await engine.set('project.key', 'projectVal');
    const project = engine.getProject();
    expect(project).toHaveProperty('project.key', 'projectVal');
  });
});
