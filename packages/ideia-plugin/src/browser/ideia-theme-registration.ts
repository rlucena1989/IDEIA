import { injectable } from '@theia/core/shared/inversify';
import { ColorContribution } from '@theia/core/lib/browser/color-application-contribution';
import { ColorRegistry } from '@theia/core/lib/browser/color-registry';
import { ColorDefinition } from '@theia/core/lib/common/color';

export const IDEIA_DARK_THEME = {
  id: 'ideia-dark',
  label: 'IDEIA Dark',
  type: 'dark' as const,
  description: 'IDEIA professional dark theme inspired by the mockup design',
  editorTheme: 'ideia-monaco-theme',
};

const ideiaColors: ColorDefinition[] = [
  // === BASE ===
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

  // === VSCODE / THEIA STANDARD COLORS ===
  { id: 'foreground', description: 'Overall foreground color', defaults: { dark: '#e0e0e0' } },
  { id: 'editor.foreground', description: 'Editor foreground', defaults: { dark: '#e0e0e0' } },
  { id: 'editor.background', description: 'Editor background', defaults: { dark: '#0d0d0d' } },
  { id: 'editorLineNumber.foreground', description: 'Line numbers', defaults: { dark: '#444444' } },
  { id: 'editorLineNumber.activeForeground', description: 'Active line number', defaults: { dark: '#999999' } },
  { id: 'editorCursor.foreground', description: 'Editor cursor', defaults: { dark: '#2dd4bf' } },
  { id: 'editor.selectionBackground', description: 'Selection background', defaults: { dark: 'rgba(45,212,191,0.12)' } },
  { id: 'editor.selectionHighlightBackground', description: 'Selection highlight', defaults: { dark: 'rgba(45,212,191,0.06)' } },
  { id: 'editor.lineHighlightBackground', description: 'Line highlight', defaults: { dark: 'rgba(255,255,255,0.02)' } },
  { id: 'editor.inactiveSelectionBackground', description: 'Inactive selection', defaults: { dark: 'rgba(45,212,191,0.06)' } },
  { id: 'editorWidget.background', description: 'Editor widget bg', defaults: { dark: '#141414' } },
  { id: 'editorWidget.border', description: 'Editor widget border', defaults: { dark: 'rgba(255,255,255,0.04)' } },
  { id: 'editorGroupHeader.tabsBackground', description: 'Tab bar bg', defaults: { dark: '#0d0d0d' } },
  { id: 'editorGroupHeader.tabsBorder', description: 'Tab bar border', defaults: { dark: 'rgba(255,255,255,0.04)' } },
  { id: 'tab.activeBackground', description: 'Active tab bg', defaults: { dark: '#0d0d0d' } },
  { id: 'tab.activeForeground', description: 'Active tab fg', defaults: { dark: '#e0e0e0' } },
  { id: 'tab.inactiveBackground', description: 'Inactive tab bg', defaults: { dark: '#0d0d0d' } },
  { id: 'tab.inactiveForeground', description: 'Inactive tab fg', defaults: { dark: '#777777' } },
  { id: 'tab.activeBorder', description: 'Active tab border', defaults: { dark: '#2dd4bf' } },
  { id: 'tab.border', description: 'Tab separator', defaults: { dark: 'rgba(255,255,255,0.04)' } },

  // === SIDEBAR ===
  { id: 'sideBar.background', description: 'Sidebar background', defaults: { dark: '#141414' } },
  { id: 'sideBar.foreground', description: 'Sidebar foreground', defaults: { dark: '#aaaaaa' } },
  { id: 'sideBar.border', description: 'Sidebar border', defaults: { dark: 'rgba(255,255,255,0.04)' } },
  { id: 'sideBarSectionHeader.background', description: 'Sidebar header', defaults: { dark: '#141414' } },
  { id: 'sideBarSectionHeader.foreground', description: 'Sidebar header text', defaults: { dark: '#888888' } },
  { id: 'sideBarTitle.foreground', description: 'Sidebar title', defaults: { dark: '#888888' } },

  // === ACTIVITY BAR ===
  { id: 'activityBar.background', description: 'Activity bar background', defaults: { dark: '#0d0d0d' } },
  { id: 'activityBar.foreground', description: 'Activity bar foreground', defaults: { dark: '#555555' } },
  { id: 'activityBar.inactiveForeground', description: 'Activity bar inactive', defaults: { dark: '#555555' } },
  { id: 'activityBar.activeBorder', description: 'Activity bar active border', defaults: { dark: '#2dd4bf' } },
  { id: 'activityBar.activeBackground', description: 'Activity bar active bg', defaults: { dark: 'rgba(45,212,191,0.08)' } },
  { id: 'activityBar.border', description: 'Activity bar border', defaults: { dark: 'rgba(255,255,255,0.04)' } },
  { id: 'activityBarBadge.background', description: 'Activity bar badge', defaults: { dark: '#2dd4bf' } },
  { id: 'activityBarBadge.foreground', description: 'Activity bar badge text', defaults: { dark: '#0d0d0d' } },

  // === TITLE BAR ===
  { id: 'titleBar.activeBackground', description: 'Title bar active', defaults: { dark: '#0d0d0d' } },
  { id: 'titleBar.inactiveBackground', description: 'Title bar inactive', defaults: { dark: '#0d0d0d' } },
  { id: 'titleBar.activeForeground', description: 'Title bar text', defaults: { dark: '#888888' } },
  { id: 'titleBar.border', description: 'Title bar border', defaults: { dark: 'rgba(255,255,255,0.04)' } },
  { id: 'menu.background', description: 'Menu background', defaults: { dark: '#1a1a1a' } },
  { id: 'menu.foreground', description: 'Menu foreground', defaults: { dark: '#e0e0e0' } },
  { id: 'menu.selectionBackground', description: 'Menu selection', defaults: { dark: 'rgba(45,212,191,0.12)' } },
  { id: 'menu.selectionForeground', description: 'Menu selection text', defaults: { dark: '#2dd4bf' } },
  { id: 'menu.border', description: 'Menu border', defaults: { dark: 'rgba(255,255,255,0.08)' } },

  // === STATUS BAR ===
  { id: 'statusBar.background', description: 'Status bar background', defaults: { dark: '#0d0d0d' } },
  { id: 'statusBar.foreground', description: 'Status bar foreground', defaults: { dark: '#888888' } },
  { id: 'statusBar.border', description: 'Status bar border', defaults: { dark: 'rgba(255,255,255,0.04)' } },
  { id: 'statusBar.debuggingBackground', description: 'Debug status', defaults: { dark: '#ea580c' } },
  { id: 'statusBarItem.remoteBackground', description: 'Remote indicator', defaults: { dark: '#8b5cf6' } },

  // === PANELS ===
  { id: 'panel.background', description: 'Panel background', defaults: { dark: '#0d0d0d' } },
  { id: 'panel.border', description: 'Panel border', defaults: { dark: 'rgba(255,255,255,0.04)' } },
  { id: 'panelTitle.activeBorder', description: 'Panel title active', defaults: { dark: '#2dd4bf' } },
  { id: 'panelTitle.activeForeground', description: 'Panel title text', defaults: { dark: '#e0e0e0' } },
  { id: 'panelTitle.inactiveForeground', description: 'Panel title inactive', defaults: { dark: '#777777' } },

  // === TERMINAL ===
  { id: 'terminal.background', description: 'Terminal background', defaults: { dark: '#0d0d0d' } },
  { id: 'terminal.foreground', description: 'Terminal foreground', defaults: { dark: '#e0e0e0' } },
  { id: 'terminal.border', description: 'Terminal border', defaults: { dark: 'rgba(255,255,255,0.04)' } },

  // === SCROLLBAR ===
  { id: 'scrollbar.shadow', description: 'Scrollbar shadow', defaults: { dark: 'transparent' } },
  { id: 'scrollbarSlider.background', description: 'Scrollbar slider', defaults: { dark: 'rgba(255,255,255,0.08)' } },
  { id: 'scrollbarSlider.hoverBackground', description: 'Scrollbar slider hover', defaults: { dark: 'rgba(255,255,255,0.15)' } },
  { id: 'scrollbarSlider.activeBackground', description: 'Scrollbar slider active', defaults: { dark: 'rgba(255,255,255,0.2)' } },

  // === INPUT / DROPDOWN ===
  { id: 'input.background', description: 'Input background', defaults: { dark: '#1a1a1a' } },
  { id: 'input.foreground', description: 'Input foreground', defaults: { dark: '#e0e0e0' } },
  { id: 'input.border', description: 'Input border', defaults: { dark: 'rgba(255,255,255,0.08)' } },
  { id: 'input.placeholderForeground', description: 'Input placeholder', defaults: { dark: '#555555' } },
  { id: 'inputOption.activeBackground', description: 'Input option active', defaults: { dark: 'rgba(45,212,191,0.08)' } },
  { id: 'inputOption.activeBorder', description: 'Input option border', defaults: { dark: '#2dd4bf' } },
  { id: 'dropdown.background', description: 'Dropdown bg', defaults: { dark: '#1a1a1a' } },
  { id: 'dropdown.foreground', description: 'Dropdown fg', defaults: { dark: '#e0e0e0' } },
  { id: 'dropdown.border', description: 'Dropdown border', defaults: { dark: 'rgba(255,255,255,0.08)' } },

  // === LIST / TREE ===
  { id: 'list.activeSelectionBackground', description: 'List selection', defaults: { dark: 'rgba(45,212,191,0.12)' } },
  { id: 'list.activeSelectionForeground', description: 'List selection text', defaults: { dark: '#e0e0e0' } },
  { id: 'list.hoverBackground', description: 'List hover', defaults: { dark: 'rgba(255,255,255,0.04)' } },
  { id: 'list.inactiveSelectionBackground', description: 'List inactive sel', defaults: { dark: 'rgba(255,255,255,0.04)' } },
  { id: 'list.focusBackground', description: 'List focus', defaults: { dark: 'rgba(45,212,191,0.08)' } },
  { id: 'list.highlightForeground', description: 'List highlight', defaults: { dark: '#2dd4bf' } },

  // === BUTTON ===
  { id: 'button.background', description: 'Button background', defaults: { dark: '#2dd4bf' } },
  { id: 'button.foreground', description: 'Button foreground', defaults: { dark: '#0d0d0d' } },
  { id: 'button.hoverBackground', description: 'Button hover', defaults: { dark: '#36e0cc' } },
  { id: 'button.secondaryBackground', description: 'Button secondary', defaults: { dark: 'rgba(255,255,255,0.06)' } },
  { id: 'button.secondaryForeground', description: 'Button secondary text', defaults: { dark: '#cccccc' } },
  { id: 'button.secondaryHoverBackground', description: 'Button secondary hover', defaults: { dark: 'rgba(255,255,255,0.1)' } },

  // === BADGE ===
  { id: 'badge.background', description: 'Badge background', defaults: { dark: '#2dd4bf' } },
  { id: 'badge.foreground', description: 'Badge foreground', defaults: { dark: '#0d0d0d' } },

  // === NOTIFICATIONS ===
  { id: 'notifications.background', description: 'Notifications bg', defaults: { dark: '#1a1a1a' } },
  { id: 'notifications.foreground', description: 'Notifications fg', defaults: { dark: '#e0e0e0' } },
  { id: 'notifications.border', description: 'Notifications border', defaults: { dark: 'rgba(255,255,255,0.08)' } },

  // === FOCUS ===
  { id: 'focusBorder', description: 'Focus border', defaults: { dark: '#2dd4bf' } },

  // === PROGRESS ===
  { id: 'progressBar.background', description: 'Progress bar', defaults: { dark: '#2dd4bf' } },

  // === WIDGET SHADOW ===
  { id: 'widget.shadow', description: 'Widget shadow', defaults: { dark: '0 2px 8px rgba(0,0,0,0.4)' } },
  { id: 'widget.border', description: 'Widget border', defaults: { dark: 'rgba(255,255,255,0.04)' } },
];

@injectable()
export class IDEIA_ColorContribution implements ColorContribution {
  registerColors(colors: ColorRegistry): void {
    colors.register(...ideiaColors);
  }
}
