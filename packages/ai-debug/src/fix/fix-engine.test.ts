import { FixSuggestionEngine } from './fix-engine';
import { ErrorNormalizer } from '../error-normalizer';
import { RCAEngine } from '../rca/rca-engine';

describe('FixSuggestionEngine', () => {
  const engine = new FixSuggestionEngine();
  const normalizer = new ErrorNormalizer();
  const rca = new RCAEngine();

  it('should generate null_check fix for undefined errors', async () => {
    const error = await normalizer.normalize(new TypeError('Cannot read properties of undefined'));
    const rootCause = await rca.analyze(error);
    const fix = await engine.generateFix(error, rootCause);
    expect(fix.category).toBe('null_check');
    expect(fix.diff).toContain('?.()');
  });

  it('should generate type_fix for TypeError', async () => {
    const error = await normalizer.normalize(new TypeError('number is not a function'));
    const rootCause = await rca.analyze(error);
    const fix = await engine.generateFix(error, rootCause);
    expect(fix.category).toBe('type_fix');
  });

  it('should generate import_fix for undefined references', async () => {
    const error = await normalizer.normalize(new ReferenceError('foo is not defined'));
    const rootCause = await rca.analyze(error);
    const fix = await engine.generateFix(error, rootCause);
    expect(fix.category).toBe('import_fix');
    expect(fix.diff).toContain("import {");
  });

  it('should validate fixes', async () => {
    const error = await normalizer.normalize(new Error('test error'));
    const rootCause = await rca.analyze(error);
    const fix = await engine.generateFix(error, rootCause);
    const validated = await engine.validateFix(fix);
    expect(validated.validation.compiles).toBe(true);
  });
});
