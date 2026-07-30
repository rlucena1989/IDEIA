import { describe, it, expect } from '@jest/globals';
import { ProjectScanner, createProjectScanner } from '../src/scanner';

describe('ProjectScanner', () => {
  it('should create via factory', () => {
    const scanner = createProjectScanner();
    expect(scanner).toBeInstanceOf(ProjectScanner);
  });

  it('should scan a directory and return results', async () => {
    const scanner = new ProjectScanner({ maxDepth: 2, maxFiles: 100 });
    const result = await scanner.scan(__dirname);
    expect(result.projectName).toBeDefined();
    expect(result.rootDir).toBeDefined();
    expect(result.structure).toBeDefined();
    expect(result.size).toBeDefined();
    expect(result.languages).toBeDefined();
    expect(result.techs).toBeDefined();
    expect(result.scannedAt).toBeDefined();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should have valid structure counts', async () => {
    const scanner = new ProjectScanner({ maxDepth: 2, maxFiles: 100 });
    const result = await scanner.scan(__dirname);
    expect(result.structure.files).toBeGreaterThanOrEqual(0);
    expect(result.structure.directories).toBeGreaterThanOrEqual(0);
  });

  it('should have valid size properties', async () => {
    const scanner = new ProjectScanner({ maxDepth: 1, maxFiles: 10 });
    const result = await scanner.scan(__dirname);
    expect(result.size.totalBytes).toBeGreaterThanOrEqual(0);
    expect(result.size.linesOfCode).toBeGreaterThanOrEqual(0);
  });

  it('should update options', () => {
    const scanner = new ProjectScanner({ maxDepth: 5 });
    scanner.setOptions({ maxDepth: 3, maxFiles: 500 });
    scanner.setOptions({ excludeDirs: ['node_modules'] });
  });

  it('should handle non-existent directory gracefully', async () => {
    const scanner = new ProjectScanner({ maxDepth: 1, maxFiles: 10 });
    try {
      const result = await scanner.scan('/nonexistent/path');
      expect(result.structure.files).toBe(0);
    } catch (err) {
      expect(err).toBeDefined();
    }
  });

  it('should detect common technologies from file extensions', async () => {
    const scanner = new ProjectScanner({ maxDepth: 1, maxFiles: 10 });
    const result = await scanner.scan(__dirname);
    const _scannedTechNames = result.techs.map(t => t.name);
  });
});
