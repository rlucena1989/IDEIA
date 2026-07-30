import { ValidationResult } from './keybinding-validator';
import { DefaultKeybindingRegistry } from './registry';
export interface KeybindingEntry {
    command: string;
    keybinding: string;
    default: string;
    when?: string;
}
export interface ConflictInfo {
    command: string;
    keybinding: string;
    conflictingWith: string[];
}
export type PresetScheme = 'default' | 'vim-mode' | 'emacs-mode';
export declare class KeybindingCustomizer {
    private entries;
    private defaults;
    private validator;
    private registry;
    constructor(registry?: DefaultKeybindingRegistry);
    set(command: string, keybinding: string): ValidationResult;
    reset(command: string): boolean;
    getAll(): KeybindingEntry[];
    getConflicts(): ConflictInfo[];
    import(json: string): {
        imported: number;
        errors: string[];
    };
    export(): string;
    registerDefaults(defaults: Array<{
        command: string;
        defaultKeybinding: string;
    }>): void;
    getCustomizations(): KeybindingEntry[];
    resetAll(): void;
    resetCategory(category: string): void;
    getConflictsWith(keybinding: string): ConflictInfo[];
    getRecommendedKeybindings(profile?: string): Array<{
        command: string;
        keybinding: string;
    }>;
    applyPresetScheme(scheme: PresetScheme): void;
    exportToJSON(): string;
    importFromJSON(json: string): {
        imported: number;
        errors: string[];
    };
    private getAllKeybindings;
}
//# sourceMappingURL=keybinding-customizer.d.ts.map