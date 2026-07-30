import { StylingParticipant, ColorTheme, CssStyleCollector } from '@theia/core/lib/browser/styling-service';
import { createLogger } from '@ideia/logger';

export class IdeiaStylingParticipant implements StylingParticipant {
  registerThemeStyle(theme: ColorTheme, collector: CssStyleCollector): void {
    if (theme.type !== 'dark') return;

    const _C = (id: string) => `var(--theia-${id.replace(/\./g, '-')})`;

    collector.addRule(`
      /* ── TITLE BAR ── */
      #theia-top-panel {
        height: 36px !important; min-height: 36px !important; max-height: 36px !important;
        background: #0d0d0d !important;
        border-bottom: 1px solid rgba(255,255,255,0.04) !important;
      }
      #theia-top-panel > * { padding: 0 10px; }

      /* ── ACTIVITY BAR ── */
      .p-TabBar.theia-app-left { background: #0d0d0d !important; }
      .p-TabBar.theia-app-left .p-TabBar-content { gap: 0 !important; }
      .p-TabBar.theia-app-left .p-TabBar-tab {
        width: 44px !important; min-width: 44px !important; max-width: 44px !important;
        height: 40px !important; min-height: 40px !important;
        color: #555 !important; border: none !important; background: transparent !important;
        transition: color 0.12s, opacity 0.12s !important;
      }
      .p-TabBar.theia-app-left .p-TabBar-tab:hover { color: #999 !important; background: transparent !important; }
      .p-TabBar.theia-app-left .p-TabBar-tab.p-mod-current {
        color: #e0e0e0 !important; background: transparent !important;
      }
      .p-TabBar.theia-app-left .p-TabBar-tab.p-mod-current::before {
        content: '' !important; position: absolute !important;
        left: 0 !important; top: 6px !important; bottom: 6px !important;
        width: 2px !important; border-radius: 0 2px 2px 0 !important;
        background: #2dd4bf !important;
      }
      .p-TabBar.theia-app-left .p-TabBar-tabIcon { opacity: 0.6 !important; }
      .p-TabBar.theia-app-left .p-TabBar-tab.p-mod-current .p-TabBar-tabIcon { opacity: 1 !important; }
      .p-TabBar.theia-app-left .p-TabBar-tabLabel { display: none !important; }

      /* ── SIDEBAR ── */
      .p-TabBar.theia-app-right .p-TabBar-content { gap: 0 !important; }
      .p-TabBar.theia-app-right .p-TabBar-tab {
        width: 44px !important; min-width: 44px !important; max-width: 44px !important;
        height: 40px !important; min-height: 40px !important;
        color: #555 !important; border: none !important;
      }
      .p-TabBar.theia-app-right .p-TabBar-tab:hover { color: #999 !important; background: transparent !important; }
      .p-TabBar.theia-app-right .p-TabBar-tab.p-mod-current { color: #e0e0e0 !important; }
      .p-TabBar.theia-app-right .p-TabBar-tabIcon { opacity: 0.6 !important; }
      .p-TabBar.theia-app-right .p-TabBar-tab.p-mod-current .p-TabBar-tabIcon { opacity: 1 !important; }
      .p-TabBar.theia-app-right .p-TabBar-tabLabel { display: none !important; }

      /* ── EDITOR TABS ── */
      .p-TabBar.theia-app-centers .p-TabBar-tab {
        height: 32px !important; line-height: 32px !important;
        font-size: 11.5px !important; color: #777 !important;
        background: transparent !important;
        border-right: 1px solid rgba(255,255,255,0.04) !important;
        border-bottom: none !important;
      }
      .p-TabBar.theia-app-centers .p-TabBar-tab:hover { color: #bbb !important; background: transparent !important; }
      .p-TabBar.theia-app-centers .p-TabBar-tab.p-mod-current {
        color: #e0e0e0 !important; background: #0d0d0d !important;
      }
      .p-TabBar.theia-app-centers .p-TabBar-tab.p-mod-current::after {
        content: '' !important; position: absolute !important;
        bottom: 0 !important; left: 8px !important; right: 8px !important;
        height: 1.5px !important; border-radius: 1px !important;
        background: #2dd4bf !important;
      }
      .p-TabBar.theia-app-centers .p-TabBar-tab.p-mod-dirty .p-TabBar-tabCloseIcon::before {
        content: '\\25CF' !important; color: #2dd4bf !important; font-size: 8px !important;
      }

      /* ── SPLITTERS ── */
      .p-SplitPanel-handle { background: rgba(255,255,255,0.04) !important; }
      .p-SplitPanel-handle:hover { background: rgba(255,255,255,0.12) !important; }

      /* ── BOTTOM PANEL (Terminal) ── */
      #theia-bottom-content-panel {
        background: rgba(20,20,20,0.85) !important;
        backdrop-filter: blur(24px) !important; -webkit-backdrop-filter: blur(24px) !important;
        border: none !important;
        border-top: 1px solid rgba(255,255,255,0.04) !important;
      }

      /* ── STATUS BAR ── */
      #theia-statusBar {
        height: 22px !important; min-height: 22px !important; max-height: 22px !important;
        background: #0d0d0d !important;
        font-size: 11px !important; color: #888 !important;
        border-top: 1px solid rgba(255,255,255,0.04) !important;
      }

      /* ── SCROLLBARS ── */
      ::-webkit-scrollbar { width: 4px !important; height: 4px !important; }
      ::-webkit-scrollbar-track { background: transparent !important; }
      ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08) !important; border-radius: 2px !important; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15) !important; }

      /* ── ANIMAÇÕES ── */
      @keyframes ideia-fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes ideia-blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }

      /* ── GLOBAL BODY ── */
      body { background: #0d0d0d !important; }

      /* ── DISABLE INLINE TITLE TEXT ── */
      #theia-custom-title, .p-DockPanel-title, .p-TabBar-tabLabel { display: none !important; }

      /* ── REMOVE EXTRA BORDERS ── */
      .p-DockPanel-widget, .p-Widget { outline: none !important; box-shadow: none !important; }
    `);
  }
}
