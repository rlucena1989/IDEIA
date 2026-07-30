"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeybindingValidator = void 0;
const RESERVED_KEYS = new Set([
    'ctrl+c', 'ctrl+v', 'ctrl+x', 'ctrl+z', 'ctrl+y',
    'ctrl+a', 'ctrl+s', 'alt+f', 'ctrl+h', 'ctrl+n',
    'ctrl+o', 'ctrl+p', 'ctrl+w', 'ctrl+q', 'ctrl+shift+esc',
    'alt+f4', 'f1', 'f5', 'f11', 'f12',
]);
const KEY_PATTERN = /^(?:(?:ctrl|alt|shift|meta)(?:\+(?:ctrl|alt|shift|meta))*\+[a-z0-9[\];',./`\-=\\]|f[1-9]|f1[0-9]|f2[0-4]|ctrl|alt|shift|meta)$/i;
class KeybindingValidator {
    validate(keybinding) {
        const errors = [];
        const warnings = [];
        if (!keybinding || keybinding.trim().length === 0) {
            errors.push({ code: 'EMPTY_KEYBINDING', message: 'Keybinding cannot be empty' });
            return { valid: false, errors, warnings };
        }
        const trimmed = keybinding.trim();
        const parts = trimmed.split(' ');
        const keys = [];
        if (parts.length > 2) {
            errors.push({
                code: 'MAX_CHORD_EXCEEDED',
                message: 'Maximum of 2 keys in a chord sequence allowed (e.g. ctrl+k ctrl+t)',
            });
        }
        const isChord = parts.length > 1;
        if (isChord) {
            for (const part of parts) {
                if (part)
                    keys.push(part);
            }
        }
        else {
            keys.push(trimmed);
        }
        for (const k of keys) {
            if (!KEY_PATTERN.test(k)) {
                errors.push({
                    code: 'INVALID_FORMAT',
                    message: `Invalid key format: "${k}". Expected format: ctrl+k, alt+shift+x, f5, etc.`,
                });
            }
        }
        if (errors.length > 0) {
            return { valid: false, errors, warnings };
        }
        if (this.isReserved(trimmed)) {
            warnings.push({
                code: 'RESERVED_KEY',
                message: `"${trimmed}" is a system-reserved keybinding`,
            });
        }
        return { valid: true, errors, warnings };
    }
    findConflicts(keybinding, existing) {
        const conflicts = [];
        for (const existingKb of existing) {
            if (this.doConflict(keybinding, existingKb)) {
                conflicts.push(existingKb);
            }
        }
        return conflicts;
    }
    isReserved(keybinding) {
        return RESERVED_KEYS.has(keybinding.toLowerCase().trim());
    }
    doConflict(a, b) {
        const normalizedA = a.toLowerCase().trim();
        const normalizedB = b.toLowerCase().trim();
        return normalizedA === normalizedB;
    }
}
exports.KeybindingValidator = KeybindingValidator;
//# sourceMappingURL=keybinding-validator.js.map