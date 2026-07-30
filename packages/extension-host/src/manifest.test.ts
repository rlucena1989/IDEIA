import { ExtensionManifestParser } from './manifest';

describe('ExtensionManifestParser', () => {
  let parser: ExtensionManifestParser;

  beforeEach(() => {
    parser = new ExtensionManifestParser();
  });

  it('should parse a valid extension manifest', () => {
    const raw = JSON.stringify({
      id: 'ext-1',
      name: 'Test Extension',
      version: '1.0.0',
      engineVersion: '^1.0.0',
      activationEvents: ['onCommand:hello'],
    });
    const manifest = parser.parse(raw);
    expect(manifest.id).toBe('ext-1');
    expect(manifest.name).toBe('Test Extension');
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.activationEvents).toEqual(['onCommand:hello']);
  });

  it('should parse manifest with optional contributions', () => {
    const raw = JSON.stringify({
      id: 'ext-2',
      name: 'With Contributions',
      version: '0.0.1',
      engineVersion: '^1.0.0',
      contributes: [
        { type: 'commands', value: { id: 'cmd1' } },
        { type: 'menus', value: { path: 'editor' } },
      ],
    });
    const manifest = parser.parse(raw);
    expect(manifest.contributes).toHaveLength(2);
    expect(manifest.contributes![0].type).toBe('commands');
  });

  it('should reject manifest with missing required fields', () => {
    expect(() => parser.parse(JSON.stringify({ id: 'ext-3' }))).toThrow();
  });

  it('should validate correct JSON as true', () => {
    const result = parser.validate(JSON.stringify({
      id: 'v',
      name: 'v',
      version: '1.0.0',
      engineVersion: '1.0.0',
    }));
    expect(result).toBe(true);
  });

  it('should validate incorrect JSON as false', () => {
    expect(parser.validate('not json')).toBe(false);
    expect(parser.validate(JSON.stringify({}))).toBe(false);
  });
});
