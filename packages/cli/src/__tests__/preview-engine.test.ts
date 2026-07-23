import { generatePreview, generateFrontendTemplate, generateLowLevelTemplate } from '../runtime/preview-engine';

describe('preview-engine', () => {
  it('should generate diff between two texts', () => {
    const orig = 'line1\nline2\nline3';
    const mod = 'line1\nline2-modified\nline3';
    const diff = generatePreview(orig, mod, 'test.ts');
    expect(diff.linesAdded).toBeGreaterThan(0);
    expect(diff.linesRemoved).toBeGreaterThan(0);
    expect(diff.chunks.length).toBeGreaterThan(0);
  });

  it('should generate React template', () => {
    const code = generateFrontendTemplate('react', 'UserCard');
    expect(code).toContain('React');
    expect(code).toContain('UserCard');
  });

  it('should generate Vue template', () => {
    const code = generateFrontendTemplate('vue', 'UserCard');
    expect(code).toContain('<template>');
    expect(code).toContain('UserCard');
  });

  it('should generate service template', () => {
    const code = generateLowLevelTemplate('service', 'User');
    expect(code).toContain('UserService');
    expect(code).toContain('execute');
  });

  it('should generate repository template', () => {
    const code = generateLowLevelTemplate('repository', 'User');
    expect(code).toContain('UserRepository');
    expect(code).toContain('findById');
  });
});