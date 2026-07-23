import { tokenizeMath, isNumeric, extractNumbers, evaluateSimpleMath } from './math-parser';

describe('math-parser', () => {
  describe('tokenizeMath', () => {
    it('should tokenize numbers', () => {
      const tokens = tokenizeMath('123 45.6');
      expect(tokens).toEqual([
        { kind: 'num', value: 123 },
        { kind: 'num', value: 45.6 }
      ]);
    });

    it('should tokenize operators', () => {
      const tokens = tokenizeMath('+ - * / ^');
      expect(tokens).toEqual([
        { kind: 'op', value: '+' },
        { kind: 'op', value: '-' },
        { kind: 'op', value: '*' },
        { kind: 'op', value: '/' },
        { kind: 'op', value: '^' }
      ]);
    });

    it('should tokenize parentheses', () => {
      const tokens = tokenizeMath('()');
      expect(tokens).toEqual([
        { kind: 'paren', value: '(' },
        { kind: 'paren', value: ')' }
      ]);
    });

    it('should tokenize identifiers', () => {
      const tokens = tokenizeMath('sqrt abs sin cos');
      expect(tokens).toEqual([
        { kind: 'ident', value: 'sqrt' },
        { kind: 'ident', value: 'abs' },
        { kind: 'ident', value: 'sin' },
        { kind: 'ident', value: 'cos' }
      ]);
    });

    it('should return empty array for empty string', () => {
      const tokens = tokenizeMath('');
      expect(tokens).toEqual([]);
    });
  });

  describe('isNumeric', () => {
    it('should return true for integers', () => {
      expect(isNumeric('123')).toBe(true);
    });

    it('should return true for floats', () => {
      expect(isNumeric('123.45')).toBe(true);
    });

    it('should return false for non-numbers', () => {
      expect(isNumeric('abc')).toBe(false);
      expect(isNumeric('12a')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isNumeric('')).toBe(false);
    });
  });

  describe('extractNumbers', () => {
    it('should extract numbers from text', () => {
      const numbers = extractNumbers('Price: 100.50 USD, Tax: 20');
      expect(numbers).toEqual([100.5, 20]);
    });

    it('should handle negative numbers', () => {
      const numbers = extractNumbers('Temp: -5C, Change: +10');
      expect(numbers).toEqual([-5, 10]);
    });

    it('should return empty array when no numbers', () => {
      const numbers = extractNumbers('No numbers here!');
      expect(numbers).toEqual([]);
    });
  });

  describe('evaluateSimpleMath', () => {
    it('should evaluate basic arithmetic', () => {
      expect(evaluateSimpleMath('2 + 3 * 4')).toBe(14);
      expect(evaluateSimpleMath('(2 + 3) * 4')).toBe(20);
      expect(evaluateSimpleMath('10 / 2')).toBe(5);
    });

    it('should return null for invalid input', () => {
      expect(evaluateSimpleMath('abc')).toBeNull();
      expect(evaluateSimpleMath('')).toBeNull();
    });

    it('should handle non-numeric result', () => {
      expect(evaluateSimpleMath('NaN')).toBeNull();
      expect(evaluateSimpleMath('1/0')).toBeNull();
    });

    it('should catch thrown exceptions', () => {
      expect(evaluateSimpleMath('(')).toBeNull();
    });

    it('should sanitize non-math chars and still evaluate', () => {
      expect(evaluateSimpleMath('alert(1)')).toBe(1);
    });

    it('should handle floating point', () => {
      expect(evaluateSimpleMath('10.5 / 2')).toBe(5.25);
    });
  });
});