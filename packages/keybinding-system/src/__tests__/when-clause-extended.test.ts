import { WhenClauseEvaluator } from '../when-clause';

describe('WhenClauseEvaluator - extended', () => {
  const evaluator = new WhenClauseEvaluator();

  it('evaluates simple context match', () => {
    expect(evaluator.evaluate('editorFocus', ['editorFocus'])).toBe(true);
  });

  it('evaluates negated context', () => {
    expect(evaluator.evaluate('!editorFocus', ['editorFocus'])).toBe(false);
  });

  it('evaluates AND condition', () => {
    expect(evaluator.evaluate('editorFocus && textFocus', ['editorFocus', 'textFocus'])).toBe(true);
  });

  it('evaluates AND condition with missing context', () => {
    expect(evaluator.evaluate('editorFocus && textFocus', ['editorFocus'])).toBe(false);
  });

  it('evaluates OR condition', () => {
    expect(evaluator.evaluate('editorFocus || terminalFocus', ['terminalFocus'])).toBe(true);
  });

  it('evaluates OR condition - both true', () => {
    expect(evaluator.evaluate('editorFocus || terminalFocus', ['editorFocus', 'terminalFocus'])).toBe(true);
  });

  it('evaluates OR condition - neither true', () => {
    expect(evaluator.evaluate('editorFocus || terminalFocus', ['sidebarFocus'])).toBe(false);
  });

  it('evaluates complex nested expression', () => {
    expect(evaluator.evaluate('editorFocus && !terminalFocus', ['editorFocus'])).toBe(true);
  });

  it('returns true for empty expression', () => {
    expect(evaluator.evaluate('', ['anything'])).toBe(true);
  });

  it('setContext and getContext work', () => {
    evaluator.setContext('myKey', 'myValue');
    expect(evaluator.getContext('myKey')).toBe('myValue');
  });

  it('getContext returns undefined for missing key', () => {
    expect(evaluator.getContext('nonExistent')).toBeUndefined();
  });
});
