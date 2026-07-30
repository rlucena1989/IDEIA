import { KeybindingValidator } from '../keybinding-validator';

describe('KeybindingValidator', () => {
  let validator: KeybindingValidator;

  beforeEach(() => {
    validator = new KeybindingValidator();
  });

  describe('validate', () => {
    it('accepts valid keybinding: ctrl+k', () => {
      const result = validator.validate('ctrl+k');
      expect(result.valid).toBe(true);
    });

    it('accepts valid keybinding: alt+shift+x', () => {
      const result = validator.validate('alt+shift+x');
      expect(result.valid).toBe(true);
    });

    it('accepts function keys: f5', () => {
      const result = validator.validate('f5');
      expect(result.valid).toBe(true);
    });

    it('accepts function keys: f12', () => {
      const result = validator.validate('f12');
      expect(result.valid).toBe(true);
    });

    it('accepts chord: ctrl+k ctrl+t', () => {
      const result = validator.validate('ctrl+k ctrl+t');
      expect(result.valid).toBe(true);
    });

    it('rejects empty keybinding', () => {
      const result = validator.validate('');
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('EMPTY_KEYBINDING');
    });

    it('rejects malformed key', () => {
      const result = validator.validate('invalid!!');
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_FORMAT');
    });

    it('rejects chord with more than 2 keys', () => {
      const result = validator.validate('ctrl+k ctrl+t ctrl+l');
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('MAX_CHORD_EXCEEDED');
    });

    it('warns for reserved system keys: ctrl+c', () => {
      const result = validator.validate('ctrl+c');
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === 'RESERVED_KEY')).toBe(true);
    });

    it('warns for reserved system keys: ctrl+v', () => {
      const result = validator.validate('ctrl+v');
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === 'RESERVED_KEY')).toBe(true);
    });

    it('accepts meta modifier', () => {
      const result = validator.validate('meta+k');
      expect(result.valid).toBe(true);
    });

    it('trims whitespace', () => {
      const result = validator.validate('  ctrl+k  ');
      expect(result.valid).toBe(true);
    });
  });

  describe('findConflicts', () => {
    it('finds conflicting keybinding', () => {
      const conflicts = validator.findConflicts('ctrl+k', ['ctrl+k', 'ctrl+j']);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toBe('ctrl+k');
    });

    it('returns empty when no conflicts', () => {
      const conflicts = validator.findConflicts('ctrl+k', ['ctrl+j', 'ctrl+l']);
      expect(conflicts).toHaveLength(0);
    });

    it('is case insensitive', () => {
      const conflicts = validator.findConflicts('CTRL+K', ['ctrl+k']);
      expect(conflicts).toHaveLength(1);
    });
  });

  describe('isReserved', () => {
    it('returns true for ctrl+c', () => {
      expect(validator.isReserved('ctrl+c')).toBe(true);
    });

    it('returns true for ctrl+v', () => {
      expect(validator.isReserved('ctrl+v')).toBe(true);
    });

    it('returns false for custom keybinding', () => {
      expect(validator.isReserved('ctrl+alt+del')).toBe(false);
    });

    it('returns true for f1', () => {
      expect(validator.isReserved('f1')).toBe(true);
    });
  });
});
