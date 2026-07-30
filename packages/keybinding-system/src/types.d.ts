import { Disposable } from '@ideia/core-contributions';
export interface Keybinding {
    command: string;
    key: string;
    when?: string;
    args?: unknown[];
    priority?: number;
}
export interface ResolvedKeybinding {
    command: string;
    key: string;
    when?: string;
    contexts: string[];
    chord?: string;
}
export type KeyCode = string;
export interface KeybindingRegistry {
    registerKeybinding(keybinding: Keybinding): Disposable;
    getKeybindingsForCommand(command: string): Keybinding[];
    getKeybindingsForKey(key: string): Keybinding[];
    resolveKeybinding(key: string, context: string[]): ResolvedKeybinding[];
    hasKeybinding(key: string, context: string[]): boolean;
    onKeybindingsChanged: import('@ideia/core-contributions').Event<void>;
}
export interface ContextKeyService {
    getContext(key: string): unknown;
    setContext(key: string, value: unknown): void;
    getContextKeys(): Map<string, unknown>;
    matches(expression: string): boolean;
    onContextChanged: import('@ideia/core-contributions').Event<string>;
}
//# sourceMappingURL=types.d.ts.map