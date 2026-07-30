# ADR-019: Theia IDE with 10 Widgets + TitleBar + Overlay

- **Status:** Implementado
- **Data:** 2026-07-24 (convertido de 0006-theia para ADR-XXX)
- **Decisão:** Theia plugin com 10 widgets + TitleBar contribution + Search Overlay

## Contexto
A interface grafica da IDEIA e construida sobre Theia Platform.

## Decisao
- 10 widgets: Chat, Dashboard, Diff, Approval, File, Studies, Suggestions, Search, Audit, Security
- TitleBar customizado
- SearchOverlay com Ctrl+Shift+F
- Lazy loading via WidgetLoader
- 10 servicos backend (Chat, Task, Agent, Memory, Dashboard, ProviderRouter, OutputValidator, DAPSetup, StatusBar, Lifecycle)
