import { Emitter, Disposable } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { IThemeIntegration, ThemeDefinition, TokenColor } from './types';

export class DefaultThemeIntegration implements IThemeIntegration {
  private themes = new Map<string, ThemeDefinition>();
  private currentThemeId = 'ideia-dark';
  private onChangedEmitter = new Emitter<string>();

  private defaultTheme: ThemeDefinition = {
    id: 'ideia-dark',
    label: 'IDEIA Dark',
    type: 'dark',
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'sideBar.background': '#252526',
      'activityBar.background': '#2d2d2d',
      'statusBar.background': '#007acc',
    },
  };

  get onThemeChanged() { return this.onChangedEmitter.event; }

  constructor() {
    this.themes.set(this.defaultTheme.id, this.defaultTheme);
  }

  async setTheme(themeId: string): Promise<void> {
    if (!this.themes.has(themeId)) {
      throw new Error(`Theme not registered: ${themeId}`);
    }
    this.currentThemeId = themeId;
    this.onChangedEmitter.fire(themeId);
  }

  getCurrentTheme(): string {
    return this.currentThemeId;
  }

  registerTheme(theme: ThemeDefinition): Disposable {
    this.themes.set(theme.id, theme);
    return { dispose: () => this.themes.delete(theme.id) };
  }

  getTheme(id: string): ThemeDefinition | undefined {
    return this.themes.get(id);
  }

  getCurrentThemeDefinition(): ThemeDefinition {
    return this.themes.get(this.currentThemeId) || this.defaultTheme;
  }

  getColor(key: string): string | undefined {
    const theme = this.getCurrentThemeDefinition();
    return theme.colors[key];
  }
}
