# Eclipse Theia — Comprehensive Research Report

> **Compiled:** July 2026  
> **Sources:** Eclipse Foundation, EclipseSource blog, TypeFox blog, GitHub (eclipse-theia), Google Cloud Blog, SAP Help Portal, InfoQ, DZone, DEV Community, academic repositories, ChooseALicense, electron-builder docs, and others.

---

## Table of Contents

1. [Corporate Case Studies (Real Theia Adopters)](#1-corporate-case-studies)
2. [Academic Papers and Research](#2-academic-papers-and-research)
3. [Performance Benchmarks](#3-performance-benchmarks)
4. [Security Audits / Analyses](#4-security-audits--analyses)
5. [InversifyJS Patterns for Large Projects](#5-inversifyjs-patterns-for-large-projects)
6. [Theia Extension Development Best Practices](#6-theia-extension-development-best-practices)
7. [Theia AI Latest Developments (2025–2026)](#7-theia-ai-latest-developments-2025-2026)
8. [Monaco Editor Advanced Integration](#8-monaco-editor-advanced-integration)
9. [VS Code API Compatibility in Theia](#9-vs-code-api-compatibility-in-theia)
10. [Electron Packaging and Distribution](#10-electron-packaging-and-distribution)

---

## 1. Corporate Case Studies

### Google Cloud Shell Editor

**Source:** https://cloud.google.com/blog/products/application-development/introducing-cloud-shell-editor (2020), InfoQ (2020)

Google Cloud Shell Editor was introduced in October 2020 as a browser-based development environment powered by Eclipse Theia. It replaced a simpler command-line-only Cloud Shell with a full IDE.

**Architecture:**
- Runs as a pre-configured development VM on GCP infrastructure
- Frontend: Eclipse Theia in the browser; Backend: Node.js running in the development VM
- Communication: JSON-RPC over WebSockets
- Includes Cloud Code plugin support (Kubernetes, Cloud Run, Skaffold, minikube, Jib, Buildpacks)
- Pre-installed: Go, Java, .NET, Python, Node.js language support + Git

**Scale:**
- 1+ million monthly active users as of 2023
- Usage grew 500% year-over-year (2022–2023)
- Free tier includes 5 GB persistent storage per user

**Key Customizations:**
- Deep integration with Google Cloud APIs (GKE, Cloud Run, Cloud Storage, BigQuery)
- Custom walkthrough/tutorial platform for onboarding
- Workspace management for multi-project support
- Pre-configured Docker and Kubernetes CLI tools

**Pain Points / Lessons:**
- Browser clipboard limitations require mitigation strategies
- No direct local filesystem access (by design in browser)
- Cold start time: 5–15 seconds for new sessions
- Google PM confirmed on HN: "Cloud Shell Editor is based on the Eclipse Theia IDE Platform, which embraces many of the VS Code design decisions and directly supports VS Code extensions"

---

### GitPod

**Sources:** https://www.gitpod.io, TypeFox blog (2018), Eclipse Foundation press release (2020), GitHub: gitpod-io/theia-app

GitPod was founded by Sven Efftinge and the TypeFox team (original creators of Theia). GitPod provides ephemeral, automated development environments in the cloud.

**Architecture:**
- Each workspace is a Docker container with a Theia-based IDE frontend
- Frontend: Theia IDE; Backend: container running on cloud infrastructure
- "Continuous Development Environments" — one-click from any GitHub branch/PR/issue
- Uses the Gitpod extension for Theia (`gitpod-extension`) which provides:
  - Keep-alive signaling (`GITPOD_HOST`, `GITPOD_WORKSPACE_ID`)
  - Activity reporting
  - Workspace lifecycle management

**Customizations:**
- Theia frontend deeply customized with Gitpod-specific UI
- Pre-built Docker images for >100 languages and frameworks
- Integration with GitHub/GitLab/Bitbucket for auth and repo access
- VS Code extensions available via Open VSX

**Lessons Learned / Evolution:**
- GitPod was originally entirely Theia-based; later they began offering VS Code Desktop as an alternative IDE option
- Key insight: Theia's architecture (client-server) was fundamentally designed for cloud — VS Code was retrofitted
- Theia allowed GitPod to run the same IDE in browser or desktop via Electron
- GitPod's custom extension demonstrates Theia's "contribution point" model

---

### SAP Business Application Studio

**Sources:** SAP Help Portal (architectural overview), SAP Community blog posts, Eclipse Foundation press release (2020)

SAP Business Application Studio (BAS) is SAP's next-generation web-based IDE, replacing the older SAP Web IDE. It is built on Eclipse Theia.

**Architecture:**
- Multi-tenant SaaS on SAP Cloud Foundry (Business Application Pattern)
- Uses "dev spaces" — isolated virtual containers per developer/project type
- Each dev space is pre-configured for specific application types (SAP Fiori, CAP, SAPUI5, etc.)
- Identity & Access Management via SAP Cloud Foundry Authorization and Trust Management
- Theia-based IDE served via browser

**Key Customizations:**
- SAP-specific extensions (Fiori templates, CAP tools, CDS editors, SAP HANA)
- Yeoman-based UI application generators for scaffolding
- Integration with SAP Cloud Platform services and on-premise data sources via OData
- ABAP development tools (ADT) integration
- Prepackaged tools per dev-space type (Maven, npm, Git, CF CLI)

**Extension Model:**
- Uses VS Code extensions for SAP-specific tooling (Cloud Application Programming Model, Fiori tools)
- Extends Theia platform with custom views and commands
- Allows third-party extensions via Open VSX
- SAP actively contributes to Eclipse Theia upstream

**Lessons Learned:**
- Theia's modular extension system allowed SAP to deliver a tailored IDE for each developer persona
- Smooth migration path from Web IDE (proprietary) to BAS (Theia-based)
- Full VS Code extension API support means SAP tooling works in both VS Code and BAS

---

### Arduino Pro IDE (Arduino IDE 2.0)

**Sources:** Eclipse Foundation adopter story (2022), Eclipse Newsletter (Jan 2020), Arduino blog

Arduino IDE 2.0 is built on Eclipse Theia, transitioning from a Java Swing/AWT desktop app to a modern web-based IDE.

**Architecture:**
- Theia platform serving as the IDE shell
- Monaco editor + LSP integration for code editing
- Custom toolbar (Arduino-specific UX, hiding advanced features behind a button)
- Integrated debugger for Arduino controllers
- Supports both desktop (Electron) and browser deployment

**Key Customizations:**
- Massive UI simplification — hiding Theia's complexity behind Arduino's trademark simplicity
- Custom menu layout and toolbar tailored to maker workflow (sketch → verify → upload)
- Arduino board manager and library manager as custom views
- Serial monitor and plotter as custom widgets

**Pain Points / Lessons:**
- Arduino needed to balance modern features with backward compatibility for millions of existing users
- Theia's flexibility allowed them to add advanced features (debugging, LSP) while keeping the simple UX
- Migration from Java Swing → web stack was a significant investment but paid off in modernized architecture
- Theia's "extension first" approach meant Arduino could replace core behaviors without forking

---

### Huawei Cloud IDE (CloudIDE)

**Source:** Eclipse community newsletter references, ecweb.ecer.com

Huawei Cloud CloudIDE chose Eclipse Theia as its base to provide a cloud development experience close to VS Code.

**Architecture:**
- Based on Eclipse Theia + Eclipse Che workspace management
- Cloud-hosted development environments on Huawei Cloud infrastructure
- Pre-configured language support and tooling

**Key Details:**
- Technical selection and optimization led to Theia as the foundation
- Aimed to deliver VS Code-compatible experience in the browser
- Deep integration with Huawei Cloud services

*Detailed architecture and customization specifics not publicly available in English-language sources.*

---

### Arm Keil Studio / Mbed Studio

**Sources:** Eclipse Foundation press release (2020), Arm Mbed Studio website, Eclipse Theia adopters article (2025)

Arm selected Eclipse Theia for both Mbed Studio (for Mbed OS development) and later for Keil Studio (for embedded/Cortex-M development).

**Architecture:**
- Theia platform serving as desktop IDE via Electron
- Pre-configured with Arm toolchains, debug probes (ULINK, DAPLink)
- Integrated project import from existing Keil MDK projects

**Customizations:**
- Embedded development-specific views (peripheral browser, register viewer)
- Custom debug configuration UI for Arm Cortex-M devices
- Device pack management integration (CMSIS-Pack)
- Both browser and desktop deployment from single codebase

**Pain Points:**
- Embedded tooling requires extensive native integration (debug probes, compilers)
- Theia's plugin architecture used to bridge Node.js backend with native tools
*Note: Arm has multiple Theia-based products; some have been consolidated under "Keil Studio Cloud"*

---

### Texas Instruments — Code Composer Studio (CCS)

**Source:** TheiaCon 2024 presentation, Eclipse Theia adopters article (2025)

TI rebuilt their industry-standard embedded IDE on Eclipse Theia, migrating from Eclipse RCP.

**Architecture:**
- Modernization of CCS from Eclipse RCP (desktop-only) to Theia (desktop + cloud-ready)
- Retained focus on TI microcontroller development
- Custom views for TI-specific device configuration and pinmux

**Lessons:**
- Migration path from RCP to Theia was presented at TheiaCon 2024
- Theia's modularity allowed gradual migration from legacy Eclipse plugins
- Cloud deployment option opens new use cases for remote lab access

---

### Other Notable Adopters

| Adopter | Product | Domain |
|---------|---------|--------|
| **Renesas** | QuickConnect Studio | Browser-based hardware prototyping |
| **STMicroelectronics** | STM32CubeMX2 | MCU configuration & code generation |
| **Samsung** | Sokatoa | GPU profiling for Android (Vulkan) |
| **AMD** | Vitis IDE | FPGA/adaptive SoC development |
| **Red Hat** | OpenShift Dev Spaces (formerly CodeReady Workspaces) | Cloud-native Kubernetes IDE |
| **Ericsson** | (various internal tools) | Telecom/5G tooling |
| **EclipseSource** | Consulting + custom tools | Various industries |
| **TypeFox** | Consulting + Theia development | Core Theia maintainers |
| **D-Wave Systems** | Leap IDE | Quantum computing IDE |
| **Lonti** | Martini Designer | API integration + low-code |
| **Neuron Automation** | Neuron Smart Engineer | IEC 61131-3 industrial programming |

---

## 2. Academic Papers and Research

### Found: 2 Theses / Papers

**1. "Implementing a Function Block Network Editor in Eclipse Theia"** — JKU Linz
- URL: https://www.jku.at/fileadmin/gruppen/357/theses/Theia-FBN-Prototype.pdf
- Explores building a domain-specific graphical editor on Theia
- Confirms Theia's flexibility for non-IDE use cases (industrial automation)

**2. "Managing Concurrent Heterogeneous Editing in Web-Based..."** — TU Wien, Nina Doschek (2023)
- URL: https://repositum.tuwien.at/handle/20.500.12708/188866
- Thesis on model server architecture for collaborative editing
- Uses Theia/GLSP/EMF Cloud as implementation platform
- Resulted in open-source Model Server project now used in production

### Gaps in Academic Literature
- **No comprehensive Theia-vs-VS Code academic comparison study found**
- **No formal usability studies of Theia as a platform**
- **No published performance benchmarks from independent academic sources**
- Most research is either industry blog posts or theses on specific Theia-based tools

---

## 3. Performance Benchmarks

### Theia IDE Startup Time (Official Data)

**Source:** Eclipse Foundation blog (Apr 2024): "Eclipse Theia IDE: A Look at Leaps in Performance"
URL: https://blogs.eclipse.org/post/john-kellerman/eclipse-theia-ide-look-leaps-performance
Performance dashboard: https://eclipse-theia.github.io/theia-e2e-test-suite/performance/electron/

Key findings from the official performance tracking:
- **Startup time more than doubled** between Oct 2023 and Apr 2024
- Major improvements from "headless plugins" patch (defers plugin loading)
- Used Eclipse Trace Compass for instrumentation
- Performance tests run on GitHub runners for reproducibility

**Areas of ongoing optimization:**
- ~80% of initialization time is "unknown" (not yet instrumented) — likely lazy plugin loading
- Continuous monitoring at: https://eclipse-theia.github.io/theia-e2e-test-suite/performance/
- Measured metrics: frontend startup, plugin deployment (frontend + backend), shell reveal, contribution start

### Community Benchmarks (from various sources)

| Metric | Eclipse Theia | VS Code | Note |
|--------|--------------|---------|------|
| Base memory (idle, no plugins) | ~150–300 MB | ~200–500 MB | Source: markaicode.com comparison |
| Startup (cold) | ~3–8 seconds | ~2–4 seconds | Theia 1.72+ with esbuild ~2x faster than prior versions |
| Multi-user (cloud) | 1–25 users good w/ 4GB RAM | 1–15 users before latency | Theia's client-server architecture scales better |

### Build Time: webpack → esbuild

- **Theia 1.72** (June 2026) migrated from webpack to esbuild
- Result: significantly faster build times (exact numbers not published)
- Esbuild benefits all Theia adopters building custom products

### Large Workspace Performance
- No official benchmarks for 100k+ file workspaces found
- Theia 1.73 (July 2026) added backend-optimized workspace file tools (`findFilesByPattern`, `getWorkspaceDirectoryStructure`, `getWorkspaceFileList`)
- These moved from per-directory RPC to backend batch execution, reducing full-tree queries "from minutes to tens of milliseconds"

### LSP Performance
- Theia uses standard LSP via VS Code language client library
- No independent LSP latency comparisons between Theia and VS Code found
- Theia's architecture adds one network hop (frontend → backend → LSP) vs VS Code Desktop's direct LSP access

---

## 4. Security Audits / Analyses

### EPL-2.0 License Analysis for Commercial Use

**License:** https://www.eclipse.org/org/documents/epl-2.0/EPL-2.0.html  
**ChooseALicense summary:** https://choosealicense.com/licenses/epl-2.0/

**Key legal characteristics of EPL-2.0:**

1. **Commercial-friendly copyleft**: Allows commercial use, distribution, and modification
2. **File-level copyleft**: Modified files must remain under EPL-2.0, but:
   - New files that are not "Modified Works" (linking/using APIs) can be under other licenses
   - The "Secondary License" clause allows combining EPL code with other licenses in separate files
3. **Patent grant**: Contributors grant royalty-free patent license for their contributions
4. **Commercial distribution clause (Section 4)**: If you include EPL code in a commercial product, you must indemnify other contributors against claims arising from your distribution
5. **No warranty**: Expressly provided "AS IS" without warranty

**Real-world interpretation (dev.to article, 2025):**  
EPL-2.0 is "balanced copyleft" — stricter than MIT/Apache 2.0, less strict than GPL v3.  
Companies can build proprietary plugins/extensions around EPL-2.0 projects *provided modifications to the original code are shared openly*.

**Practical impact for Theia adopters:**
- You can build a proprietary product on Theia without releasing your proprietary extensions
- Changes to Theia core must be contributed back (or at least disclosed to users)
- VS Code extensions running in Theia are NOT subject to EPL (they run in a separate process)
- Many large companies (Google, SAP, Arm, TI) operate commercial products on Theia under EPL-2.0

### Theia Security Advisories

Theia has a security policy (SECURITY.md in repo) and a dedicated security-audit repository:  
https://github.com/eclipse-theia/security-audit

Notable security features:
- Theia ships a **Software Bill of Materials (SBOM)** with every release (supply chain security)
- No automatic telemetry (privacy-focused by default)
- VS Code extensions run in a **separate process** (sandboxed from the core IDE)
- Theia IDE uses Snap confinement for Linux installations

### Node.js Sandboxing for IDE Terminals
- Theia's terminal uses xterm.js on the frontend, connected to a backend PTY
- Backend terminal runs in the Node.js process (not sandboxed beyond OS user permissions)
- In cloud deployments, Docker/Kubernetes provides process isolation per workspace
- Theia AI 1.68+ includes a `shellExecute` tool (alpha) with configurable safety measures

### Monaco Editor Security Considerations
- Monaco editor is derived from VS Code sources with security patches
- Running in browser means CSP (Content Security Policy) protections apply
- No specific Monaco CVEs directly exploited in Theia context were found in search results

---

## 5. InversifyJS Patterns for Large Projects

### How Theia Uses InversifyJS

**Source:** https://eclipsesource.com/blogs/2018/11/28/how-to-inversify-in-eclipse-theia/

Theia uses InversifyJS as its core DI framework. Every extension contributes `ContainerModule` instances that are loaded into the DI container at startup.

**Core Patterns:**

1. **ContainerModule pattern**: Each extension provides one or more `ContainerModule`s that bind services, contributions, and providers
2. **Frontend/backend separation**: Separate DI containers for frontend (browser) and backend (Node.js)
3. **@injectable + @inject decorators**: Services declare their dependencies via constructor injection
4. **ContributionProvider**: Multi-injection pattern for contribution points — consumers get all registered implementations
5. **Symbol-based identifiers**: Services are identified by Symbol, not class references (enables interface-based DI)

### Best Practices for 50+ Services

**From EclipseSource and Theia source code analysis:**

1. **Organize modules by feature/domain**, not by layer:
   ```
   modules/
     features/
       editor/
         editor-frontend-module.ts
         editor-backend-module.ts
       terminal/
         terminal-frontend-module.ts
         terminal-backend-module.ts
   ```

2. **Use `bindContributionProvider`** for extensible contribution points:
   ```typescript
   // In your module
   bindContributionProvider(bind, MyContribution);
   // Consumers inject ContributionProvider<MyContribution>
   ```

3. **Child containers for isolation**: Theia uses child containers for plugin hosts, ensuring plugin DI doesn't pollute the main container. EMF Cloud's theia-tree-editor uses this pattern for multiple editor instances.

4. **AutoBindInjectable**: For simpler services, enable `autoBindInjectable: true` in the container options to avoid explicit binding.

5. **Named bindings**: Use `@named('Identifier')` for multiple bindings of the same interface:
   ```typescript
   bind(MyInterface).to(ImplA).inSingletonScope().whenTargetNamed('A');
   bind(MyInterface).to(ImplB).inSingletonScope().whenTargetNamed('B');
   ```

### Migration Patterns (Manual DI → Inversify)

- Start by identifying "service interfaces" that multiple consumers need
- Replace `new ServiceImpl()` calls with `@inject(ServiceInterface)` 
- Create ContainerModules that bind implementations to interfaces
- Use `rebind()` in application modules to override default bindings (Theia's customization pattern)

### Performance Implications

- Inversify has negligible overhead for singleton services (resolved once)
- Transient services (resolved on each injection) add allocation cost
- Theia's startup performance improvements in 2024 included optimizing DI resolution order
- Key: **Container resolution happens at startup** — lazy/deferred resolution is not automatic; you must design for it

### Testing Strategies

1. **Unit tests**: Create a minimal DI container with only the services under test
2. **Mock injection**: Pass mock implementations directly to constructors (TypeScript allows bypassing DI)
3. **Container recreation**: Each test creates its own container for isolation
4. **Integration tests**: Use the real application container but rebind specific services with test doubles

**EclipseSource recommendation:** "You can just fill in parameters without using dependency injection. In this case, you can simply pass a mock class without having to create a container at all."

---

## 6. Theia Extension Development Best Practices

### Extension Types

Theia supports 4 extension mechanisms (from https://theia-ide.org/docs/extensions/):

| Mechanism | Runtime Installation | API Access | Best For |
|-----------|---------------------|------------|----------|
| VS Code Extension | Yes (runtime) | Restricted (VS Code API) | Adding features, cross-platform compatibility |
| Theia Extension | Compile-time | Full (DI access, all APIs) | Custom products, complex UIs |
| Theia Plugin | Yes (runtime) | VS Code API + Theia-specific | *Deprecated / under discussion* |
| Headless Plugin | Yes (runtime) | Backend-only API | CLI tools, backend services |

### Extension Structure Patterns

**Recommended directory structure** (from Theia docs):
```
my-extension/
  src/
    common/       # code independent of runtime
    browser/      # frontend code (DOM API)
    node/         # backend code (Node.js)
    electron-browser/  # Electron-specific frontend
    node-electron/     # Electron-specific backend
  package.json
  tsconfig.json
```

**Package.json key fields:**
```json
{
  "theiaExtensions": [
    {
      "frontend": "lib/browser/my-extension-frontend-module",
      "backend": "lib/node/my-extension-backend-module"
    }
  ]
}
```

### Testing Extensions

- **Unit tests**: `npm run test` (Jest-based). Run per extension: `npx lerna run test --scope @theia/my-extension`
- **API integration tests**: Documented in `doc/api-testing.md`
- **VS Code extension testing**: https://github.com/eclipse-theia/theia/wiki/Testing-VS-Code-extensions
- **End-to-end**: Theia provides a full e2e test suite: https://github.com/eclipse-theia/theia-e2e-test-suite
- **Playwright-based**: For UI testing of Theia applications

### Debugging Extensions

**Source:** https://github.com/eclipse-theia/theia/blob/master/doc/Developing.md

- Backend: VS Code launch config `Launch Browser Backend`
- Frontend: Start backend, then attach browser debugger
- Plugin host: Pass `--hosted-plugin-inspect` flag to backend
- Profiling: Use Chrome DevTools for frontend, Node.js inspector for backend

### Publishing Extensions

- **VS Code extensions**: Publish to Open VSX Registry (open-vsx.org)
  - For Microsoft Marketplace, only VS Code product is allowed
  - Open VSX is the vendor-neutral alternative
- **Theia extensions**: Published as npm packages
- **CI**: Theia project uses GitHub Actions for CI/CD

### Common Pitfalls (from EclipseSource "Lessons from the Field")

1. **Budget for ramp-up**: DI with Inversify, web technologies, Node.js backend — all have learning curves
2. **Use contribution points, not patches**: Rebinding via DI covers most needs; patching core is almost never necessary
3. **Keep frontend ↔ backend RPC**: Use Theia's built-in JSON-RPC layer, not custom channels
4. **JavaScript is single-threaded**: Heavy backend work can stall the frontend connection
5. **VS Code extension vs Theia extension choice**: VS Code extension = runtime extensibility but delayed startup + webviews are heavy. Theia extension = full API access but compile-time only. You can mix both.
6. **Monorepo recommended** over multi-repo for managing extensions

---

## 7. Theia AI Latest Developments (2025–2026)

### Overview

Theia AI reached **general availability in March 2025** and won the **2025 CODiE Award for Best Open Source Development Tool**. It is a framework for building AI-native capabilities into Theia-based tools and IDEs.

**Source:** https://eclipsesource.com/blogs/2025/03/13/introducing-theia-ai/

### Recent Releases (2025–2026)

| Version | Date | Key AI Features |
|---------|------|----------------|
| **1.73** | Jul 2026 | Faster AI workspace tools (backend batch), PR Review walkthrough, tool confirmation shortcuts |
| **1.72** | Jun 2026 | Esbuild migration, improved AI agent workflows, safer tool confirmations |
| **1.71** | May 2026 | SCM History Graph, Workspace Trust for AI, reasoning controls, token usage warnings, PR Reviewer Agent |
| **1.68** | Feb 2026 | GitHub Copilot integration, Agent Code Next mode, AppTester (DevTools MCP), Todo tool, shellExecute tool |
| **1.67** | Dec 2025 | Native Claude Code IDE integration, persistent AI chat sessions, new GitHub & Project Info agents |
| **1.60–1.66** | 2025 | Plan Mode, Architect agent, prompt template files, custom LLM request settings, interactive AI flows |
| **1.59** | Feb 2025 | Theia Coder AI assistant, AI Features alpha, LLM providers (Anthropic, HuggingFace, LlamaFile, Ollama, OpenAI) |

### Key Features

**1. Theia Coder** — Built-in AI assistant with capabilities:
- Generate applications from prompts
- Modify existing code with review
- Inline code completion
- Chat agent for questions about application structure
- Terminal command assistance
- Agent mode (autonomous task execution)

**2. Custom Agent Framework:**
- Create agents on-the-fly for testing, documentation, code review
- Sub-agents and multi-agent workflows
- `createTaskContext`, `getTaskContext`, `editTaskContext`, `listTaskContexts` APIs
- Multiple plans per session

**3. MCP (Model Context Protocol) Support:**
- Added in late 2024 — ahead of broader industry adoption
- Integrates with third-party services via Anthropic's MCP
- AppTester now supports DevTools MCP server for testing
- MCP servers listed alongside VS Code extensions in the AI Registry

**4. Interactive AI Flows** (https://eclipsesource.com/blogs/2025/02/13/introducing-interactive-ai-flows-in-theia-ai/):
- Custom UI in LLM responses
- Modal/popup interactions from the AI
- Guided workflows, confirmations, decision trees
- Multi-step interactions within a single conversation

**5. Multi-Agent Workflows:**
- PR Reviewer Agent (introduced 1.71)
- GitHub Agent + Project Info Agent (1.67)
- AppTester Agent (automated testing)
- Architect Agent (plan mode)
- `/with-apptester` command for automated implement-and-test

### Custom Agent Best Practices

From Theia AI documentation and OCX 2026 talk "10 Practical Learnings":

1. **Use contribution points** for agent registration (like any Theia extension)
2. **Implement custom LLM response content rendering** for rich interactions
3. **Design for safety**: prompt/response filtering, zero-retention configs, audit logging
4. **Workspace Trust** for AI (since 1.71) — users control which workspaces grant AI permissions
5. **Start simple**: a chat agent is ~50 lines; add tools incrementally

### LangChain / LlamaIndex Integration
- Theia AI is **provider-agnostic** — adapter pattern for any LLM backend
- Supports OpenAI, Anthropic, Ollama, LlamaFile, HuggingFace out of the box
- **No native LangChain/LlamaIndex integration found** — but adapter API allows custom implementations
- Theia AI focuses on IDE integration (tools, workspace access, file operations) rather than ML pipeline orchestration

### Streaming Token-by-Token
- Full streaming support in chat UI
- AI History view (1.56+) supports streaming display
- Uses standard SSE (Server-Sent Events) and async generator patterns
- Implementation detail: Theia AI streams through the JSON-RPC layer from backend LLM calls to frontend

---

## 8. Monaco Editor Advanced Integration

### Monaco Editor vs VS Code Editor Differences

Monaco Editor is derived from VS Code's source but is **NOT the same** as VS Code's editor:
- Monaco is a **standalone library** for embedding in web apps
- VS Code uses the same core editor but with VS Code-specific service integrations
- Monaco has no VS Code extension support (that's Theia's job in the Theia context)
- Theia wraps Monaco with its own service layer to provide VS Code API compatibility

### Custom Languages in Monaco

Theia recommends using **VS Code extensions** for language support (TextMate grammars + LSP):
https://theia-ide.org/docs/language_support/

For Monaco directly:
- Register languages via `monaco.languages.register()`
- Provide tokens via `monaco.languages.setMonarchTokensProvider()`
- Provide completions via `monaco.languages.registerCompletionItemProvider()`
- In Theia, this is typically done through VS Code extension API, not direct Monaco calls

### Monaco Worker Configuration

Theia uses a custom Monaco distribution (`@typefox/monaco-editor-core`) that:
- Excludes language grammars (handled by TextMate through VS Code extension API)
- Excludes tree-shaking (needs more than Monaco core for VS Code API compatibility)
- Includes only the editor core — all language features come via LSP

**Theia's architecture** (from Wiki: https://github.com/eclipse-theia/theia/wiki/LSP-and-Monaco-Integration):

| Layer | API | Uses |
|-------|-----|------|
| `@theia/plugin-ext` | VS Code ↔ LSP / VS Code ↔ Monaco | `vscode-languageserver-protocol` |
| `@theia/editor` | LSP | `vscode-languageserver-protocol` |
| `@theia/monaco` | LSP ↔ Monaco | `@theia/editor`, `monaco-editor-core`, `monaco-languageclient` |
| Monaco language client | Monaco ↔ LSP | `vscode`, `monaco-editor-core` |

### Diff Editor Advanced Usage

Theia wraps Monaco's diff editor in `@theia/monaco/src/browser/monaco-diff-editor.ts`:
- Supports side-by-side compare with syntax highlighting
- `DiffNavigator` for stepping through changes
- Theia's `DiffUris` for creating diff views from two URIs
- Embedded diff widget support (for inline diffs in SCM views)

### Monaco Theming

- Theia uses Monaco themes converted from VS Code theme format
- Theme management via `@theia/monaco` (theme registry service)
- VS Code Color Theme extensions work in Theia
- Custom theming: Theia's CSS variables map to Monaco editor colors

---

## 9. VS Code API Compatibility in Theia

### Current Compatibility Status

**Official compatibility report:** https://eclipse-theia.github.io/vscode-theia-comparator/status.html  
**Tool source:** https://github.com/eclipse-theia/vscode-theia-comparator

As of Theia 1.73 (July 2026), Theia supports **VS Code API version 1.125.0**.

The compatibility matrix tracks thousands of API symbols across:
- `Supported` — fully implemented
- `Partial` — partially implemented  
- `Stubbed` — declared but not functional
- `Unsupported` — no implementation

Most commonly used APIs (namespace/root, window, workspace, languages, commands, etc.) are marked **Supported**.

### Most Commonly Unsupported/Stubbed APIs

From GitHub epic issues: https://github.com/eclipse-theia/theia/issues/13051, https://github.com/eclipse-theia/theia/issues/15932

**Declarative API (package.json contribution points) gaps:**
- `comments/commentThread/title`
- `extension/context`
- `interactive/toolbar`, `interactive/cell/title`
- `issue/reporter`
- `multiDiffEditor/resource/title`
- `timeline/title`
- `scm/change/title`, `scm/sourceControl`, `scm/sourceControl/title`
- `scm/history/title`, `scm/historyItemChanges/title`
- `terminal/context`, `terminal/title/context`
- `testing/item/gutter`
- `touchbar` (macOS)
- `webview/context`
- `walkthroughs` (partially supported as of 2025)
- `testing/message/content` (since VS Code 1.84)

**Runtime API issues with specific extensions:**
- GitLens: `command:` URIs (command links) not fully supported
- AWS Toolkit, Python extensions may have issues with unsupported menu contribution points

### Workarounds for Unsupported APIs

1. **Check the compatibility report** before selecting extensions
2. **Install via VSIX** for manual testing (Open VSX filters by compatibility)
3. **Report issues** to the Theia project — they have a fast API compatibility cadence (usually 1 month behind VS Code)
4. **Theia extensions** can fill gaps — if an API is missing, implement the feature as a Theia extension

### Open VSX vs VS Code Marketplace

| Aspect | Open VSX | VS Code Marketplace |
|--------|----------|-------------------|
| **License** | Open source (MIT) | Proprietary |
| **Access** | Any tool (Theia, VS Code OSS, etc.) | VS Code product only |
| **Extensions** | ~15,000+ | ~50,000+ |
| **Hosting** | Public registry + self-hosted | Microsoft-only |
| **Governance** | Eclipse Foundation (vendor-neutral) | Microsoft |

**Key restriction:** Microsoft's Terms of Use for the VS Code Marketplace explicitly prohibit use by non-Microsoft products. Theia cannot legally use it.

### Compatibility Roadmap

- Theia 1.73: VS Code API 1.125.0
- Theia 1.72-1.71: API 1.121.0–1.124.x
- Theia targets being "compatible with the VS Code release one month before" (EclipseSource blog)
- "Theia maintains continuous VS Code compatibility with every release for years" (March 2026 newsletter)

---

## 10. Electron Packaging and Distribution

### Theia Blueprint / Theia IDE Packaging

**Official documentation:** https://theia-ide.org/docs/blueprint_documentation/  
**Source code:** https://github.com/eclipse-theia/theia-blueprint

The Theia IDE uses **electron-builder** for packaging. Key files:
- `applications/electron/electron-builder.yml`
- `applications/electron/scripts/after-pack.js` (code signing)

### electron-builder Best Practices

**From documentation and theia-blueprint reference implementation:**

1. **Two-package structure** recommended:
   - `package.json` for development dependencies
   - Build-time bundling for production

2. **Multi-platform builds**: 
   - Build for current OS only (cross-compilation limited)
   - Use CI matrix (GitHub Actions) for all platforms
   - Targets: `.AppImage` (Linux), `.exe` NSIS installer (Windows), `.dmg` (macOS)

3. **Build commands**:
   ```bash
   yarn electron start        # run unpackaged
   yarn electron package      # package for current OS
   yarn electron package:preview  # unpackaged content only (faster)
   yarn electron deploy       # package + publish
   ```

### Auto-Update Configuration

electron-builder integrates with `electron-updater`:
- **Providers**: GitHub Releases, S3, generic HTTP(S), GitLab, Bitbucket
- **Differential updates**: Only changed files between versions
- **Channels**: stable, beta, alpha
- **Forced updates**: Mandatory enforcement with version ranges
- **Integrity**: SHA checksum verification

Theia IDE's publish config (from builder config):
- Publishes to GitHub Releases
- `electron-updater` handles version comparison and download
- Snap package gets automatic updates via Snap Store

### Code Signing

**Windows:**
- Authenticode certificate (OV or EV)
- Environment variables: `WIN_CSC_LINK` + `WIN_CSC_KEY_PASSWORD`
- Azure Trusted Signing supported
- EV certificates skip SmartScreen reputation period

**macOS:**
- Developer ID Application certificate
- Notarization via `altool` or `notarytool`
- Environment variables: `CSC_LINK` + `CSC_KEY_PASSWORD`
- Hardened Runtime entitlements
- Bundled certificate keychain for CI

**CI configuration:**
```yaml
env:
  CSC_LINK: ${{ secrets.MACOS_CSC_LINK }}
  CSC_KEY_PASSWORD: ${{ secrets.MACOS_CSC_KEY_PASSWORD }}
  WIN_CSC_LINK: ${{ secrets.WIN_CSC_LINK }}
  WIN_CSC_KEY_PASSWORD: ${{ secrets.WIN_CSC_KEY_PASSWORD }}
```

**Troubleshooting** (from electron-builder docs):
- "No identity found" (macOS): No valid Developer ID certificate in keychain
- SmartScreen warning (Windows): Normal for OV certificates; trust builds over time
- Set `forceCodeSigning: true` to make signing failure a build error

### Reducing Bundle Size

- **esbuild** (Theia 1.72+) significantly reduces build output vs webpack
- Exclude unnecessary Monaco languages (use `@typefox/monaco-editor-core`)
- Theia packages support tree-shaking for unused extensions
- Native modules should be production-only (not devDependencies)

### Performance Profiling Electron Apps

- Theia developing.md provides profiler guides for frontend, backend, IPC servers, plugin host
- Use Chrome DevTools for frontend profiling
- Use Node.js `--inspect` for backend profiling  
- Pass `--hosted-plugin-inspect` for plugin host debugging
- Eclipse Trace Compass used for startup performance tracing
- Dedicated performance dashboard: https://eclipse-theia.github.io/theia-e2e-test-suite/performance/

---

## Summary of Key Sources

| Topic | Primary Source(s) |
|-------|-------------------|
| Corporate adopters | https://www.eclipse.org/topics/ide/articles/the-active-ecosystem-of-eclipse-theia-adopters/ |
| Google Cloud Shell | https://cloud.google.com/blog/products/application-development/introducing-cloud-shell-editor |
| Arduino IDE 2.0 | https://blogs.eclipse.org/post/john-kellerman/theia-adopter-story-new-arduino-ide-20 |
| SAP BAS | https://help.sap.com/docs/bas/sap-business-application-studio/architectural-overview |
| Performance | https://blogs.eclipse.org/post/john-kellerman/eclipse-theia-ide-look-leaps-performance |
| Inversify in Theia | https://eclipsesource.com/blogs/2018/11/28/how-to-inversify-in-eclipse-theia/ |
| Extension mechanisms | https://theia-ide.org/docs/extensions/ |
| Theia AI | https://eclipsesource.com/blogs/2025/03/13/introducing-theia-ai/ |
| VS Code compatibility | https://eclipse-theia.github.io/vscode-theia-comparator/status.html |
| Theia IDE vs VS Code | https://eclipsesource.com/blogs/2024/07/12/vs-code-vs-theia-ide/ |
| Electron packaging | https://theia-ide.org/docs/blueprint_documentation/ |
| Theia architecture | https://theia-ide.org/docs/architecture/ |
| EPL-2.0 | https://choosealicense.com/licenses/epl-2.0/ |
| Theia AI interactive flows | https://eclipsesource.com/blogs/2025/02/13/introducing-interactive-ai-flows-in-theia-ai/ |
| Theia 1.73 release | https://eclipsesource.com/blogs/2026/07/07/eclipse-theia-1-73-release-news-and-noteworthy |
| 2026 state of Theia | https://newsroom.eclipse.org/eclipse-newsletter/2026/march/eclipse-theia-eclipse-foundation-tool-platform-production |
| Migrating Eclipse plugins | https://eclipsesource.com/blogs/2021/05/27/migrating-eclipse-plugins-to-eclipse-theia-or-vs-code |
