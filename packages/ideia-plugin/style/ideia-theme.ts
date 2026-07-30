import { ThemeService } from '@theia/core/lib/browser/theming';
import { createLogger } from '@ideia/logger';
import { ColorRegistry } from '@theia/core/lib/browser/color-registry';
import { ColorDefinition } from '@theia/core/lib/common/color';
const logger = createLogger('ideia-theme');

export const IDEIA_DARK_THEME = {
  id: 'ideia-dark',
  label: 'IDEIA Dark',
  type: 'dark' as const,
  editorTheme: 'ideia-monaco-theme',
};

export const ideiaColors: ColorDefinition[] = [
  { id: 'ideia.bg', description: 'Background base', defaults: { dark: '#0d0d0d' } },
  { id: 'ideia.surface', description: 'Surface', defaults: { dark: '#141414' } },
  { id: 'ideia.raised', description: 'Raised surface', defaults: { dark: '#1a1a1a' } },
  { id: 'ideia.glass', description: 'Glass effect', defaults: { dark: 'rgba(20,20,20,0.82)' } },
  { id: 'ideia.border', description: 'Border', defaults: { dark: 'rgba(255,255,255,0.04)' } },
  { id: 'ideia.borderHover', description: 'Border hover', defaults: { dark: 'rgba(255,255,255,0.08)' } },
  { id: 'ideia.text', description: 'Primary text', defaults: { dark: '#e0e0e0' } },
  { id: 'ideia.textDim', description: 'Dim text', defaults: { dark: '#999999' } },
  { id: 'ideia.textMuted', description: 'Muted text', defaults: { dark: '#666666' } },
  { id: 'ideia.accentCyan', description: 'Cyan accent', defaults: { dark: '#2dd4bf' } },
  { id: 'ideia.accentPurple', description: 'Purple accent', defaults: { dark: '#8b5cf6' } },
  { id: 'ideia.accentGreen', description: 'Green accent', defaults: { dark: '#16a34a' } },
  { id: 'ideia.accentOrange', description: 'Orange accent', defaults: { dark: '#ea580c' } },
  { id: 'ideia.accentRed', description: 'Red accent', defaults: { dark: '#dc2626' } },
  { id: 'ideia.accentBlue', description: 'Blue accent', defaults: { dark: '#3b82f6' } },
  { id: 'editor.background', defaults: { dark: '#0d0d0d' } },
  { id: 'editor.foreground', defaults: { dark: '#e0e0e0' } },
  { id: 'editorLineNumber.foreground', defaults: { dark: '#444444' } },
  { id: 'sideBar.background', defaults: { dark: '#141414' } },
  { id: 'sideBar.foreground', defaults: { dark: '#aaaaaa' } },
  { id: 'activityBar.background', defaults: { dark: '#0d0d0d' } },
  { id: 'activityBar.foreground', defaults: { dark: '#555555' } },
  { id: 'activityBar.activeBorder', defaults: { dark: '#2dd4bf' } },
  { id: 'titleBar.background', defaults: { dark: '#0d0d0d' } },
  { id: 'titleBar.foreground', defaults: { dark: '#888888' } },
];

export function registerIdeiaTheme(): void {
  ThemeService.get().register(IDEIA_DARK_THEME);
}

export function registerIdeiaColors(registry: ColorRegistry): void {
  registry.register(...ideiaColors);
}
