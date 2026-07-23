import { checkSystem, runFirstRunWizard } from '../src/installer';

describe('Installer', () => {
  describe('checkSystem', () => {
    it('should return checks array', () => {
      const result = checkSystem();
      expect(result.checks).toBeDefined();
      expect(Array.isArray(result.checks)).toBe(true);
      expect(result.checks.length).toBeGreaterThanOrEqual(3);
    });

    it('should check Node.js', () => {
      const result = checkSystem();
      const nodeCheck = result.checks.find(c => c.name === 'Node.js');
      expect(nodeCheck).toBeDefined();
      expect(nodeCheck!.installed).toBe(true);
      expect(nodeCheck!.version).toBeTruthy();
      expect(nodeCheck!.required).toBe('>= 20');
    });

    it('should check npm', () => {
      const result = checkSystem();
      const npmCheck = result.checks.find(c => c.name === 'npm');
      expect(npmCheck).toBeDefined();
      expect(npmCheck!.installed).toBe(true);
      expect(npmCheck!.version).toBeTruthy();
    });

    it('should check Git', () => {
      const result = checkSystem();
      const gitCheck = result.checks.find(c => c.name === 'Git');
      expect(gitCheck).toBeDefined();
    });

    it('should check port 3030', () => {
      const result = checkSystem();
      const portCheck = result.checks.find(c => c.name === 'Port 3030');
      expect(portCheck).toBeDefined();
    });

    it('should return allPassed boolean', () => {
      const result = checkSystem();
      expect(typeof result.allPassed).toBe('boolean');
    });

    it('should return firstRun boolean', () => {
      const result = checkSystem();
      expect(typeof result.firstRun).toBe('boolean');
    });
  });

  describe('runFirstRunWizard', () => {
    it('should run without throwing', () => {
      expect(() => runFirstRunWizard()).not.toThrow();
    });
  });
});
