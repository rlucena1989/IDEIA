import { WhenClauseEvaluator } from '../when-clause';

describe('WhenClauseEvaluator', () => {
  let evaluator: WhenClauseEvaluator;

  beforeEach(() => {
    evaluator = new WhenClauseEvaluator();
  });

  describe('setContext / getContext', () => {
    it('stores and retrieves context values', () => {
      evaluator.setContext('editorFocus', true);
      evaluator.setContext('resourceScheme', 'file');

      expect(evaluator.getContext('editorFocus')).toBe(true);
      expect(evaluator.getContext('resourceScheme')).toBe('file');
    });

    it('returns undefined for missing keys', () => {
      expect(evaluator.getContext('nonexistent')).toBeUndefined();
    });

    it('overwrites existing context values', () => {
      evaluator.setContext('mode', 'insert');
      evaluator.setContext('mode', 'normal');

      expect(evaluator.getContext('mode')).toBe('normal');
    });
  });

  describe('evaluate', () => {
    describe('simple conditions', () => {
      it('returns true when a context key is present in activeContexts', () => {
        expect(evaluator.evaluate('editorFocus', ['editorFocus'])).toBe(true);
      });

      it('returns false when a context key is not present in activeContexts', () => {
        expect(evaluator.evaluate('editorFocus', ['terminalFocus'])).toBe(false);
      });

      it('returns true for empty expression', () => {
        expect(evaluator.evaluate('', ['editorFocus'])).toBe(true);
        expect(evaluator.evaluate('   ', ['editorFocus'])).toBe(true);
      });

      it('handles negated conditions with ! prefix', () => {
        expect(evaluator.evaluate('!editorFocus', ['terminalFocus'])).toBe(true);
        expect(evaluator.evaluate('!editorFocus', ['editorFocus'])).toBe(false);
      });

      it('returns true for empty activeContexts with no expression', () => {
        expect(evaluator.evaluate('', [])).toBe(true);
      });
    });

    describe('complex expressions with &&', () => {
      it('returns true when all conditions match', () => {
        expect(
          evaluator.evaluate('editorFocus && resourceScheme', [
            'editorFocus',
            'resourceScheme',
          ])
        ).toBe(true);
      });

      it('returns false when any condition fails with &&', () => {
        expect(
          evaluator.evaluate('editorFocus && resourceScheme', ['editorFocus'])
        ).toBe(false);
      });

      it('returns false when all conditions fail with &&', () => {
        expect(evaluator.evaluate('a && b && c', ['x'])).toBe(false);
      });

      it('short-circuits on first false', () => {
        expect(evaluator.evaluate('a && b', ['a'])).toBe(false);
      });
    });

    describe('complex expressions with ||', () => {
      it('returns true when any condition matches', () => {
        expect(
          evaluator.evaluate('editorFocus || terminalFocus', ['editorFocus'])
        ).toBe(true);
        expect(
          evaluator.evaluate('editorFocus || terminalFocus', ['terminalFocus'])
        ).toBe(true);
      });

      it('returns false when no condition matches', () => {
        expect(
          evaluator.evaluate('editorFocus || terminalFocus', ['searchFocus'])
        ).toBe(false);
      });

      it('short-circuits on first true', () => {
        expect(evaluator.evaluate('a || b', ['a'])).toBe(true);
      });
    });

    describe('mixed && and ||', () => {
      it('evaluates && before || correctly', () => {
        expect(
          evaluator.evaluate('a && b || c', ['a', 'b'])
        ).toBe(true);
        expect(
          evaluator.evaluate('a && b || c', ['a', 'c'])
        ).toBe(true);
        expect(
          evaluator.evaluate('a && b || c', ['a'])
        ).toBe(false);
      });

      it('handles negated conditions in expressions', () => {
        expect(
          evaluator.evaluate('!editorFocus && terminalFocus', ['terminalFocus'])
        ).toBe(true);
        expect(
          evaluator.evaluate('!editorFocus && terminalFocus', [
            'editorFocus',
            'terminalFocus',
          ])
        ).toBe(false);
      });
    });

    describe('activeContexts parameter', () => {
      it('uses passed contexts instead of stored context', () => {
        evaluator.setContext('editorFocus', true);

        expect(evaluator.evaluate('editorFocus', ['editorFocus'])).toBe(true);
        expect(evaluator.evaluate('editorFocus', [])).toBe(false);
      });

      it('works with multiple active contexts', () => {
        expect(
          evaluator.evaluate('editorFocus && resourceScheme', [
            'editorFocus',
            'resourceScheme',
            'terminalFocus',
          ])
        ).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('handles quoted string contexts', () => {
        expect(evaluator.evaluate('"editorFocus"', ['editorFocus'])).toBe(true);
        expect(evaluator.evaluate('"editorFocus"', ['terminalFocus'])).toBe(false);
      });

      it('handles negation of single token', () => {
        expect(evaluator.evaluate('!editorFocus', ['terminalFocus'])).toBe(true);
      });

      it('handles multiple negations in sequence', () => {
        expect(
          evaluator.evaluate('!a && !b', ['c'])
        ).toBe(true);
        expect(
          evaluator.evaluate('!a && !b', ['a'])
        ).toBe(false);
      });

      it('handles expression with only a negation operator (negates empty string)', () => {
        expect(evaluator.evaluate('!', ['a'])).toBe(true);
      });
    });
  });
});
