import { Keybinding, KeybindingRegistry } from './types';
export interface CheatsheetCategory {
    name: string;
    description: string;
    keybindings: Keybinding[];
}
export interface CheatsheetOptions {
    includeChord?: boolean;
    format?: 'text' | 'html';
}
export declare class Cheatsheet {
    private registry;
    private categories;
    private discoverIndex;
    constructor(registry: KeybindingRegistry, categories?: Record<string, {
        description: string;
        commands: string[];
    }>);
    discover(): {
        key: string;
        command: string;
        description: string;
    } | undefined;
    getAllByCategory(): Record<string, Array<{
        key: string;
        command: string;
    }>>;
    getShortcutForCommand(command: string): string | undefined;
    getSimilarShortcuts(key: string): Keybinding[];
    generate(options?: CheatsheetOptions): string;
    filterByCategory(category: string): string;
    search(query: string): Keybinding[];
    private groupByCategory;
    private formatKey;
    private toText;
    private findCategoryForCommand;
    printable(): string;
    getCategoryDescription(category: string): string;
    private toHtml;
}
//# sourceMappingURL=cheatsheet.d.ts.map