import { Disposable } from '@ideia/core-contributions';
import { Keybinding, ResolvedKeybinding, KeybindingRegistry } from './types';
export interface CommandMetadata {
    command: string;
    name: string;
    description?: string;
    category: string;
}
export declare class DefaultKeybindingRegistry implements KeybindingRegistry {
    private keybindings;
    private disposables;
    private whenEvaluator;
    private onChangedEmitter;
    get onKeybindingsChanged(): import("@ideia/core-contributions").Event<void>;
    registerKeybinding(keybinding: Keybinding): Disposable;
    getKeybindingsForCommand(command: string): Keybinding[];
    getKeybindingsForKey(key: string): Keybinding[];
    resolveKeybinding(key: string, contextKeys: string[]): ResolvedKeybinding[];
    hasKeybinding(key: string, contextKeys: string[]): boolean;
    getAllKeybindings(): Keybinding[];
    private unregisterKeybinding;
    getRegisteredCommands(): string[];
    getUnassignedCommands(): string[];
    getCommandMetadata(command: string): CommandMetadata | undefined;
    getCommandsByCategory(category: string): CommandMetadata[];
}
//# sourceMappingURL=registry.d.ts.map