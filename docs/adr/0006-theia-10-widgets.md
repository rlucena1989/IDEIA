# ADR-0006: Theia IDE with 10 Widgets

**Status:** Approved  
**Date:** 2026-07-22  
**Author:** Architecture Team

## Context

The IDEIA plugin for Theia provides the graphical interface for interacting with IDEIA agents, approvals, diffs, dashboard, security, studies, suggestions, file management, audit, and search. The plugin registers 10 widgets (Chat, Dashboard, Diff, Approval, File, Studies, Suggestions, Search, Audit, Security) plus TitleBar and SearchOverlay.

## Decision

Use the following architecture for Theia integration:

- **Frontend:** 10 widgets in `packages/ideia-plugin/src/browser/`, all extending `BaseWidget` or `Widget`, using `@injectable()` for DI
- **Backend:** 10 services in `packages/ideia-plugin/src/node/`, connected via JSON-RPC
- **Theme:** Custom IDEIA dark theme registered via `ColorContribution`
- **Lazy loading:** WidgetLoader supports dynamic registration with async `load()` — widgets register via `register()` for deferred initialization
- **Styling:** `StylingParticipant` for CSS variables, `ideia-styles.ts` for themed styles

## Consequences

- Positive: All widgets are independently testable and injectable
- Positive: WidgetLoader enables lazy loading to reduce initial bundle size
- Negative: 3 widgets (Studies, Suggestions, Search) still use mock data — pending real backend connection
- Negative: Theia's Inversify DI requires binding each widget in the ContainerModule explicitly
