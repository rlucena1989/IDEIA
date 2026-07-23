# ESTUDO S53 -- MCP Ecosystem & Integration Marketplace

> **Competitive analysis vs Devin/Cursor/Claude + IDEIA implementation strategy for MCP ecosystem with 40+ pre-configured tools, marketplace, auto-discovery, and agent-tool integration**
> Data: 2026-07-22

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versao inicial -- MCP ecosystem analysis, competitive landscape, 4-phase implementation roadmap |
| 2.0 | 2026-07-22 | IDEIA Architecture Team | Expanded: offline installation, permission tiers, tool scoring, community pipeline |

---

## Sumario

1. [Competitive Landscape](#1-competitive-landscape)
2. [IDEIA Current State](#2-ideia-current-state)
3. [Architecture: IDEIA MCP Ecosystem](#3-architecture-ideia-mcp-ecosystem)
4. [MCP Server (IDEIA as Provider)](#4-mcp-server-ideia-as-provider)
5. [MCP Client (IDEIA as Consumer)](#5-mcp-client-ideia-as-consumer)
6. [Marketplace Architecture](#6-marketplace-architecture)
7. [Pre-configured Tool Catalog](#7-pre-configured-tool-catalog)
8. [Zero-Config Setup](#8-zero-config-setup)
9. [Tool Security](#9-tool-security)
10. [Integration with IDEIA Agents](#10-integration-with-ideia-agents)
11. [Plugin System Bridge](#11-plugin-system-bridge)
12. [Code Examples](#12-code-examples)
13. [Implementation Roadmap](#13-implementation-roadmap)
14. [Offline Installation & Air-Gapped Deployment](#14-offline-installation--air-gapped-deployment)
15. [Permission Tiers & Access Control](#15-permission-tiers--access-control)
16. [Tool Scoring & Quality Metrics](#16-tool-scoring--quality-metrics)
17. [Community Pipeline & Contribution Workflow](#17-community-pipeline--contribution-workflow)
18. [Implementation Roadmap (Expanded)](#18-implementation-roadmap-expanded)
19. [Conexoes](#19-conexoes)

---

## 1. Competitive Landscape

### 1.1 Devin: 40+ Pre-configured MCP Tools

Devin (Cognition) leads the market with the largest pre-configured MCP tool ecosystem. Every workspace comes with 40+ tools auto-configured and ready to use.

Devin Tool Ecosystem:

| Category | Tools | Config |
|----------|-------|--------|
| Communication | Slack, Discord, Email | Auto-configured |
| Project Management | Jira, Linear, Notion, Asana | Auto-configured |
| Code & VCS | GitHub, GitLab, Bitbucket | Auto-configured |
| CI/CD | GitHub Actions, Vercel, Railway | Auto-configured |
| Monitoring | Sentry, Datadog, PagerDuty, Grafana | Auto-configured |
| Cloud | AWS, GCP, Azure, Cloudflare | Auto-configured |
| Database | PostgreSQL, Supabase, Redis | Auto-configured |

**Key strengths:**
- Tools auto-installed when first needed (lazy loading)
- Zero configuration for popular tools
- Tool usage analytics to recommend relevant tools
- Tool execution sandboxed with timeout limits
- API credential management built-in

**Weaknesses:**
- Proprietary format (not standard MCP)
- Limited to Devin sandbox environment
- No marketplace for community tools
- Tool version pinned to Devin release cycle


### 1.2 Cursor: MCP Support with Tool Marketplace

Cursor integrates MCP with a tool marketplace pattern, allowing users to install tools from registries.

**Key strengths:**
- Standard MCP protocol (interoperable)
- Marketplace with community contributions
- Agent automatically selects appropriate tools
- Tool chaining (multi-step workflows)
- Tool execution visible in chat

**Weaknesses:**
- Marketplace still small (50-80 tools)
- Limited security model (no permission tiers)
- No read-only vs read-write distinction
- API keys stored in plain text config

### 1.3 Claude Desktop: MCP Client with Default Tools

Claude Desktop ships with built-in MCP support and three default tools (filesystem, brave-search, puppeteer) plus extensibility via ~/.claude/mcp.json.

**Key strengths:**
- Simple config file approach
- npm-based server discovery
- Drop-dead simple to add third-party tools
- Works with any MCP-compliant server

**Weaknesses:**
- No built-in marketplace
- No GUI for tool management
- Manual config file editing required
- No credential management UI
- No permission model

### 1.4 Open-Source MCP Ecosystem

The open-source community has produced 200+ MCP servers on GitHub.

| Category | Count | Examples |
|----------|-------|----------|
| Communication | 15 | Slack, Discord |
| Project Management | 12 | Jira, Linear |
| Code/VCS | 25 | GitHub, GitLab |
| CI/CD | 10 | GitHub Actions, Jenkins |
| Monitoring | 8 | Sentry, Datadog |
| Cloud | 20 | AWS, GCP, Azure |
| Database | 18 | PostgreSQL, MySQL, Redis |
| AI/LLM | 15 | OpenAI, Anthropic, Ollama |
| Browser/Tools | 10 | Puppeteer, Playwright |
| Other | 67 | Various |
| **Total** | **200+** | github.com/modelcontextprotocol/servers |

**Key strengths:**
- Rapid community innovation
- Standard MCP protocol fully respected
- npm package distribution model

**Weaknesses:**
- Quality varies significantly
- No central quality control
- Security audits rare
- Version compatibility issues

### 1.5 Comparative Table

| Dimension | Devin | Cursor | Claude Desktop | Open-Source | IDEIA (Proposed) |
|-----------|-------|--------|----------------|-------------|------------------|
| Pre-configured tools | 40+ | 0 (marketplace) | 3 | N/A | 40+ |
| MCP standard | Proprietary | Standard MCP | Standard MCP | Standard MCP | Standard MCP + extensions |
| Marketplace | None | Built-in | None | None | Built-in |
| Zero-config setup | Auto-detect | Manual install | Manual config | Manual setup | Auto-detect + one-click |
| Permission model | Basic | None | None | None | 3-tier (read/read-write/admin) |
| API key management | Built-in | Plain text | Plain text | Manual | Encrypted vault + rotation |
| Tool analytics | Yes | Basic | No | No | Full (usage, success, latency) |
| Agent tool selection | Automatic | Automatic | Claude selects | N/A | Agent router + scoring |
| Tool chaining | Sequential | Sequential | Claude plans | N/A | DAG-based orchestration |
| Community tools | No | Yes | Via config | 200+ | Yes (curated + community) |
| Theia integration | No | No | No | No | Native (widgets, commands) |
| Auto-discovery | Lazy loading | On startup | Manual | Manual | Project context detection |
| Tool sandboxing | Full | Basic | None | None | VM isolation + timeout |

---

## 2. IDEIA Current State

### 2.1 What Exists

The current @ideia/mcp package has:

| Component | Status | LOC | Description |
|-----------|--------|-----|-------------|
| MCPRegistry | Operational | 98 lines | Server/tool/resource/prompt registry with CRUD |
| MCPTool interface | Defined | 6 lines | name, description, inputSchema, handler |
| MCPServer interface | Defined | 5 lines | name, version, tools, resources, prompts |
| createFileSystemTools | Operational | 74 lines | read_file, write_file, list_files, search_files, execute_command |
| McpHttpServer | Operational | 96 lines | HTTP endpoints (tools, resources, prompts, manifest, call, read) |
| ToolRegistry | Operational | 59 lines | Tool registration with source tracking and search |
| CLI MCP commands | Operational | 14 commands | status, verify, doctor, detect, mode, hook, adapter, ci, context, retrospective |

### 2.2 What is Missing

| Gap | Impact | Priority |
|-----|--------|----------|
| No pre-configured tool integrations | Agents cannot interact with external services | Critical |
| No MCP client (connect to external MCP servers) | Cannot use community MCP servers | Critical |
| No marketplace/registry | Users cannot discover or install tools | High |
| No auto-discovery | Users must manually configure tools | High |
| No tool permission model | Security risk from tool execution | Critical |
| No API key management | Keys exposed in code/config | Critical |
| No Theia tool widgets | Tools only accessible via CLI | High |
| No tool orchestrator | No tool chaining or parallelism | Medium |

---

## 3. Architecture: IDEIA MCP Ecosystem

### 3.1 Hybrid Approach

Combines best of Devin (pre-configured), Cursor (marketplace), Claude (MCP client), and open-source (community).

Architecture layers:

| Layer | Responsibility | Technology |
|-------|---------------|------------|
| L5: Presentation | Tool widgets, config panels, marketplace UI | Theia Widgets, React |
| L4: Orchestration | Tool chaining, agent routing, parallel execution | Orchestrator, LangGraph |
| L3: Core MCP | Registry, protocol, server, client, transports | @ideia/mcp |
| L2: Pre-configured | 40+ tool adapters, auto-detect, credential mgmt | @ideia/tools-* |
| L1: Marketplace | Tool registry, versioning, install/uninstall | @ideia/market |
| L0: Security | Permission model, sandbox, audit, vault | @ideia/security |

### 3.2 Data Flow

Agent requests tool execution: Agent Runtime -> ToolRouter -> MCPClient -> External MCP Server -> Response

IDEIA exposes tools: External MCP Client -> IDEIA MCPServer (HTTP) -> IDEIA Capability Executor

---

## 4. MCP Server (IDEIA as Provider)

### 4.1 Exposed Tools

| Tool Name | Category | Description | Permission |
|-----------|----------|-------------|------------|
| read_file | Filesystem | Read file content | read |
| write_file | Filesystem | Write content to file | write |
| list_files | Filesystem | List directory contents | read |
| search_files | Filesystem | Search files by pattern | read |
| execute_command | Filesystem | Execute shell command | admin |
| search_code | Search | Semantic code search | read |
| generate_code | CodeGen | Generate code from spec | write |
| explain_code | Analysis | Explain selected code | read |
| review_code | Analysis | Review code for issues | read |
| refactor_code | CodeGen | Apply refactoring pattern | write |
| generate_test | CodeGen | Generate unit tests | write |
| agent_execute | Agent | Execute agent task | admin |
| agent_plan | Agent | Generate execution plan | read |
| diagnose_project | Diagnostics | Analyze project health | read |
| detect_stack | Diagnostics | Detect tech stack | read |
| query_memory | Memory | Query IDEIA memory | read |
| store_memory | Memory | Store in IDEIA memory | write |
| run_audit | Audit | Run security audit | admin |

### 4.2 Tool Grouping by Category

| Category | Tools |
|----------|-------|
| Filesystem | read_file, write_file, list_files, search_files, execute_command, create_directory, rename_file, delete_file |
| CodeGen | generate_code, generate_test, refactor_code, fix_code, optimize_code, document_code |
| Analysis | explain_code, review_code, diagnose_project, detect_stack, analyze_dependencies |
| Search | search_code, search_files, search_memory, search_workspace, search_documentation |
| Agent | agent_execute, agent_plan, agent_status, agent_approve, agent_reject, agent_list |
| Workspace | get_workspace_info, list_dependencies, get_project_config, set_config |
| Memory | query_memory, store_memory, search_memory, delete_memory, list_memory_tags |

---

## 5. MCP Client (IDEIA as Consumer)

### 5.1 Client Architecture

MCPClientManager manages connection pool (stdio/HTTP transports), tool cache (LRU with TTL), and tool executor (timeout, retry with exponential backoff, rate limiting, result validation).

### 5.2 Connection Management

- stdio transport: spawn process, JSON-RPC over stdin/stdout
- HTTP transport: REST endpoints with JSON body
- WebSocket transport: bidirectional streaming (future)
- Auto-reconnection with exponential backoff
- Health checking with heartbeat

### 5.3 Tool Discovery

On connection, client calls tools/list to discover available tools. Results are cached with configurable TTL. Cache is invalidated on reconnection.

### 5.4 Execution with Timeout and Retry

- Exponential backoff retry (1s, 2s, 4s, 8s)
- Configurable timeout per tool (default 30s)
- Fatal errors (unauthorized, forbidden) are not retried
- Result validation against output schema

---

## 6. Marketplace Architecture

### 6.1 Data Model

| Field | Type | Description |
|-------|------|-------------|
| id | string | npm-style package ID (@ideia/mcp-slack) |
| name | string | Human-readable name |
| version | string | Semver |
| description | string | Tool description |
| category | string | Classification |
| tags | string[] | Search tags |
| tools | ServerToolDef[] | Tool definitions |
| configSchema | Record | Configuration schema |
| permissions | string[] | Required permissions |
| source | string | pre-installed, official, community |
| verified | boolean | Security verified |
| downloads | number | Install count |
| rating | number | 0-5 user rating |

### 6.2 Version Management

- Semver-based version resolution
- Breaking change detection (major version bump)
- Auto-update for non-breaking changes (configurable)
- Rollback support to previous version
- Changelog display per version

---

## 7. Pre-configured Tool Catalog

### 7.1 Communication (4 packages)

| Package | Tools | Permission | Config |
|---------|-------|------------|--------|
| @ideia/mcp-slack | slack_post_message, slack_search_messages, slack_list_channels, slack_get_channel_history | write | SLACK_BOT_TOKEN |
| @ideia/mcp-discord | discord_send_message, discord_get_messages, discord_list_channels, discord_create_thread | write | DISCORD_BOT_TOKEN |
| @ideia/mcp-email | email_send, email_list_inbox, email_search, email_get_thread | write | SMTP config |
| @ideia/mcp-teams | teams_send_message, teams_list_channels, teams_search | write | TEAMS_WEBHOOK_URL |

### 7.2 Project Management (5 packages)

| Package | Tools | Permission | Config |
|---------|-------|------------|--------|
| @ideia/mcp-jira | jira_create_issue, jira_search, jira_transition, jira_get_issue, jira_add_comment | write | JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN |
| @ideia/mcp-linear | linear_create_issue, linear_search, linear_update, linear_get_issue, linear_list_projects | write | LINEAR_API_KEY |
| @ideia/mcp-trello | trello_create_card, trello_list_boards, trello_list_lists, trello_move_card | write | TRELLO_API_KEY, TRELLO_TOKEN |
| @ideia/mcp-asana | asana_create_task, asana_search, asana_list_projects, asana_update_task | write | ASANA_ACCESS_TOKEN |
| @ideia/mcp-notion | notion_query_database, notion_create_page, notion_update_page, notion_search | write | NOTION_API_KEY |

### 7.3 CI/CD (4 packages)

| Package | Tools | Permission | Config |
|---------|-------|------------|--------|
| @ideia/mcp-github-actions | actions_list_workflows, actions_trigger, actions_get_run, actions_list_runs | write | GITHUB_TOKEN |
| @ideia/mcp-jenkins | jenkins_list_jobs, jenkins_trigger_build, jenkins_get_build, jenkins_list_builds | write | JENKINS_URL, JENKINS_USER, JENKINS_TOKEN |
| @ideia/mcp-circleci | circleci_list_pipelines, circleci_trigger, circleci_get_workflow, circleci_list_jobs | write | CIRCLECI_TOKEN |
| @ideia/mcp-gitlab-ci | gitlabci_list_pipelines, gitlabci_trigger, gitlabci_get_job, gitlabci_list_jobs | write | GITLAB_TOKEN |

### 7.4 Monitoring (5 packages)

| Package | Tools | Permission | Config |
|---------|-------|------------|--------|
| @ideia/mcp-sentry | sentry_list_issues, sentry_get_event, sentry_search_issues, sentry_create_alert | read | SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT |
| @ideia/mcp-datadog | datadog_query_metrics, datadog_search_monitors, datadog_get_dashboard, datadog_list_events | read | DATADOG_API_KEY, DATADOG_APP_KEY |
| @ideia/mcp-newrelic | newrelic_query_metrics, newrelic_list_alerts, newrelic_get_entity, newrelic_search | read | NEWRELIC_API_KEY, NEWRELIC_ACCOUNT_ID |
| @ideia/mcp-grafana | grafana_query_datasource, grafana_list_dashboards, grafana_get_dashboard, grafana_annotate | read | GRAFANA_URL, GRAFANA_API_KEY |
| @ideia/mcp-pagerduty | pagerduty_list_incidents, pagerduty_acknowledge, pagerduty_resolve, pagerduty_get_oncall | write | PAGERDUTY_API_KEY |

### 7.5 Cloud & Infrastructure (6 packages)

| Package | Tools | Permission | Config |
|---------|-------|------------|--------|
| @ideia/mcp-aws | aws_list_s3, aws_s3_upload, aws_list_lambdas, aws_invoke_lambda, aws_describe_ec2 | read | AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION |
| @ideia/mcp-gcp | gcp_list_buckets, gcp_upload_file, gcp_list_cloud_run, gcp_query_bigquery | read | GCP_SERVICE_ACCOUNT_JSON |
| @ideia/mcp-azure | azure_list_blobs, azure_upload_blob, azure_list_functions | read | AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET |
| @ideia/mcp-cloudflare | cf_list_workers, cf_deploy_worker, cf_purge_cache, cf_list_dns | write | CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID |
| @ideia/mcp-vercel | vercel_list_projects, vercel_list_deployments, vercel_deploy, vercel_get_logs | write | VERCEL_TOKEN |
| @ideia/mcp-railway | railway_list_projects, railway_list_services, railway_get_logs, railway_deploy | write | RAILWAY_TOKEN |

### 7.6 Database (5 packages)

| Package | Tools | Permission | Config |
|---------|-------|------------|--------|
| @ideia/mcp-postgres | pg_query, pg_list_tables, pg_describe_table, pg_list_databases | read | PG_CONNECTION_STRING |
| @ideia/mcp-mysql | mysql_query, mysql_list_tables, mysql_describe_table | read | MYSQL_CONNECTION_STRING |
| @ideia/mcp-mongodb | mongodb_find, mongodb_aggregate, mongodb_list_collections | read | MONGODB_URI |
| @ideia/mcp-redis | redis_get, redis_set, redis_delete, redis_keys | read | REDIS_URL |
| @ideia/mcp-supabase | supabase_query, supabase_insert, supabase_update, supabase_list_tables | write | SUPABASE_URL, SUPABASE_SERVICE_KEY |

### 7.7 AI/LLM (4 packages)

| Package | Tools | Permission | Config |
|---------|-------|------------|--------|
| @ideia/mcp-openai | openai_chat, openai_embed, openai_list_models, openai_image_generate | write | OPENAI_API_KEY |
| @ideia/mcp-anthropic | anthropic_chat, anthropic_list_models, anthropic_count_tokens | write | ANTHROPIC_API_KEY |
| @ideia/mcp-ollama | ollama_chat, ollama_list_models, ollama_pull_model, ollama_embed | write | OLLAMA_HOST |
| @ideia/mcp-huggingface | huggingface_inference, huggingface_list_models, huggingface_query_dataset | read | HUGGINGFACE_TOKEN |

### 7.8 Code & VCS (4 packages)

| Package | Tools | Permission | Config |
|---------|-------|------------|--------|
| @ideia/mcp-github | github_create_pr, github_search_issues, github_list_prs, github_merge_pr, github_create_issue, github_search_code | write | GITHUB_TOKEN |
| @ideia/mcp-gitlab | gitlab_create_mr, gitlab_search_issues, gitlab_list_mrs, gitlab_merge_mr | write | GITLAB_TOKEN |
| @ideia/mcp-bitbucket | bitbucket_create_pr, bitbucket_list_repos, bitbucket_search_code | write | BITBUCKET_USERNAME, BITBUCKET_APP_PASSWORD |
| @ideia/mcp-sonarqube | sonarqube_list_issues, sonarqube_get_quality_gate, sonarqube_list_projects, sonarqube_get_metrics | read | SONARQUBE_URL, SONARQUBE_TOKEN |

### 7.9 Browser & Automation (2 packages)

| Package | Tools | Permission | Config |
|---------|-------|------------|--------|
| @ideia/mcp-playwright | pw_navigate, pw_click, pw_fill, pw_screenshot, pw_get_text | write | None (local) |
| @ideia/mcp-puppeteer | pptr_navigate, pptr_click, pptr_type, pptr_screenshot | write | None (local) |

### 7.10 Summary

| Category | Packages | Tools Total |
|----------|----------|-------------|
| Communication | 4 | 15 |
| Project Management | 5 | 21 |
| CI/CD | 4 | 16 |
| Monitoring | 5 | 19 |
| Cloud & Infrastructure | 6 | 26 |
| Database | 5 | 21 |
| AI/LLM | 4 | 16 |
| Code & VCS | 4 | 20 |
| Browser & Automation | 2 | 10 |
| **Total** | **39** | **164** |

---

## 8. Zero-Config Setup

### 8.1 Auto-Detection Strategy

| Source | What it detects | Confidence |
|--------|-----------------|------------|
| package.json dependencies | Slack SDK, Octokit, Prisma, Sentry, OpenAI | 0.7 |
| docker-compose.yml | PostgreSQL, MySQL, MongoDB, Redis services | 0.8 |
| CI config files | GitHub Actions, GitLab CI, CircleCI, Jenkins | 0.6 |
| Git remote | GitHub, GitLab, Bitbucket | 0.9 |
| .env files | API keys and connection strings | 0.95 |
| Framework detection | Next.js, NestJS, Express, Fastify | 0.5 |

### 8.2 Auto-Detect Flow

User opens workspace -> AutoDetector scans project context -> Tool suggestion panel appears -> User reviews suggestions -> One-click install -> Tool ready for agent use

### 8.3 Secret Detection

Detects API keys from .env files and environment variables. Maps detected keys to MCP tool packages. Shows missing keys that need to be configured.

---

## 9. Tool Security

### 9.1 Permission Tiers

| Tier | Capabilities |
|------|-------------|
| READ | Query data, list resources, read-only operations |
| WRITE | Create, update, delete resources. Execute commands. Includes READ |
| ADMIN | Configure integrations, manage API keys, change permissions. Includes WRITE |

### 9.2 Scope-Based Access

- PROJECT: Only current workspace/project
- WORKSPACE: Current IDEIA workspace
- GLOBAL: All workspaces, system-wide

### 9.3 API Key Management

EncryptedVault with AES-256-GCM encryption. Keys stored encrypted at rest, decrypted only at time of use. Master key derived from workspace configuration. Masked display (last 4 chars). Automatic detection from .env files.

### 9.4 Tool Sandboxing

- Timeout per tool execution (configurable, default 30s)
- Filesystem path restriction (path traversal prevention)
- Outbound network restriction to allowed hosts
- Rate limiting per tool and per server

---

## 10. Integration with IDEIA Agents

### 10.1 Agent Tool Selection

The ToolSelector scores tools based on:
- Name and description match against task text
- Category match against agent role (analyst -> search, programmer -> codegen)
- Usage history (frequently used tools score higher)
- Success rate (reliable tools score higher)
- Permission level (agent must have sufficient permission)

### 10.2 Tool Orchestration

DAG-based execution plan with dependency resolution:
1. Build dependency graph from plan steps
2. Execute independent steps in parallel
3. Propagate results between dependent steps via input mapping
4. Handle failures per step (abort, skip, or retry)

### 10.3 Integration Flow

User Request -> Agent Runtime -> Tool Selector -> ToolRouter (permission/scope check) -> ToolOrchestrator (build DAG) -> Execute Plan -> Result Processor + Analytics -> Agent Response

---

## 11. Plugin System Bridge

### 11.1 Theia Contributions

MCP tools are exposed as Theia contributions:

| Contribution | Description |
|-------------|-------------|
| MCPToolCommands | 7 commands (install, list, search, marketplace, analytics, auto-detect, secrets) |
| MCPToolWidget | React widget with tabs for installed tools, marketplace, auto-detect, secrets, analytics |
| MCPToolResultService | Renders tool results in Theia output channel and notifications |
| MCP preference schema | 8 preferences (enabled tools, auto-detect, auto-update, permissions, timeout, cache, marketplace URL) |

### 11.2 Commands Registered

- ideia.mcp.installTool: Install MCP Tool
- ideia.mcp.listTools: List Installed Tools
- ideia.mcp.searchTools: Search MCP Tools
- ideia.mcp.marketplace: Open Tool Marketplace
- ideia.mcp.analytics: Tool Usage Analytics
- ideia.mcp.autoDetect: Auto-Detect Tools from Project
- ideia.mcp.manageSecrets: Manage API Keys

### 11.3 Preferences

- ideia.mcp.tools.enabled: List of enabled MCP tool packages
- ideia.mcp.tools.autoDetect: Auto-detect on workspace open
- ideia.mcp.tools.autoUpdate: Auto-update non-breaking versions
- ideia.mcp.security.defaultPermission: Default permission for new tools
- ideia.mcp.security.sandboxTimeout: Tool execution timeout
- ideia.mcp.cache.ttl: Tool definition cache TTL
- ideia.mcp.marketplace.url: Marketplace registry URL
- ideia.mcp.marketplace.offlineMode: Disable marketplace connectivity

---

## 12. Code Examples

### 12.1 MCPServer: Exposing IDEIA Tools

type: code
file: packages/mcp-server/src/ideia-mcp-server.ts
content:
- IDEIAMCPServer class wrapping MCPRegistry with Express HTTP server
- registerTool(name, description, category, inputSchema, permission, handler)
- Routes: GET /mcp/tools, GET /mcp/manifest, POST /mcp/call, GET /health
- JSON-RPC compliant response format

### 12.2 MCPClient: Connecting to External Servers

type: code
file: packages/mcp-client/src/mcp-client.ts
content:
- MCPClient class with stdio transport
- JSON-RPC messaging over stdin/stdout
- connect() -> tools/list -> discover tools
- callTool(name, args) -> tools/call method
- Timeout handling per request
- Reconnection on process exit

### 12.3 MarketplaceRegistry: Catalog with Versioning

type: code
file: packages/marketplace/src/marketplace-registry.ts
content:
- MarketplaceRegistry class with pre-loaded packages
- search(), installPackage(), uninstallPackage(), getInstalledPackages()
- Semver comparison and version resolution
- Auto-update detection

### 12.4 ToolOrchestrator: Chaining Tools

type: code
file: packages/mcp-orchestrator/src/tool-orchestrator.ts
content:
- ToolOrchestrator with DAG-based execution
- Dependency resolution via topological sort
- Input mapping between steps (stepId.field -> argName)
- Retry with exponential backoff
- Failure propagation to dependents

### 12.5 SlackMCPServer: Pre-configured Integration

type: code
file: packages/tools/slack/src/slack-mcp-server.ts
content:
- SlackMCPServer with 3 tools: slack_post_message, slack_search_messages, slack_list_channels
- REST API calls to Slack Web API
- Bearer token authentication
- Error handling for Slack API errors

### 12.6 Auto-Detection from Project Context

type: code
file: packages/mcp-auto-detect/src/auto-detector.ts
content:
- ProjectContextDetector scanning package.json, .git/config, .env
- Dependency-based detection (pg -> PostgreSQL, openai -> OpenAI)
- Git remote detection (github.com, gitlab.com)
- Environment variable detection (SLACK_BOT_TOKEN, GITHUB_TOKEN, etc.)
- Confidence scoring per detection
- Suggests tools with evidence and missing keys

---

## 13. Implementation Roadmap

### 13.1 Phase 1: Core MCP Enhancements (2 weeks, 76h)

| Task | Description | Effort |
|------|-------------|--------|
| S53-T1 | Extend MCPTool with permission, category, timeout | 4h |
| S53-T2 | Implement MCPClient with stdio and HTTP transports | 16h |
| S53-T3 | JSON-RPC over stdio for MCP protocol | 8h |
| S53-T4 | Tool caching with LRU eviction and TTL | 6h |
| S53-T5 | Tool discovery (tools/list, manifest) | 4h |
| S53-T6 | Rate limiting per tool and per server | 4h |
| S53-T7 | EncryptedVault for API key storage | 8h |
| S53-T8 | ToolSandbox with timeout and path restriction | 8h |
| S53-T9 | Execution telemetry (latency, success/fail) | 6h |
| S53-T10 | Unit and integration tests | 12h |

### 13.2 Phase 2: Pre-configured Tools (3 weeks, 188h)

| Task | Description | Effort |
|------|-------------|--------|
| S53-T11 | Slack MCP server | 8h |
| S53-T12 | GitHub MCP server | 8h |
| S53-T13 | Jira MCP server | 8h |
| S53-T14 | PostgreSQL MCP server | 6h |
| S53-T15 | Sentry MCP server | 6h |
| S53-T16 | OpenAI MCP server | 4h |
| S53-T17 | AWS MCP server | 8h |
| S53-T18 | Remaining tool packages (~32) | 80h |
| S53-T19 | AutoDetector implementation | 12h |
| S53-T20 | Config UI for tool setup | 8h |
| S53-T21 | Tests for pre-configured tools | 40h |

### 13.3 Phase 3: Marketplace (2 weeks, 94h)

| Task | Description | Effort |
|------|-------------|--------|
| S53-T22 | MarketplaceRegistry with catalog | 12h |
| S53-T23 | Install/uninstall/update lifecycle | 8h |
| S53-T24 | Version management with semver | 8h |
| S53-T25 | Auto-update mechanism | 6h |
| S53-T26 | Marketplace UI in Theia widget | 16h |
| S53-T27 | Tool search and filtering | 6h |
| S53-T28 | Tool ratings and analytics display | 6h |
| S53-T29 | Offline mode for marketplace | 4h |
| S53-T30 | Community contribution pipeline | 12h |
| S53-T31 | Tests for marketplace (50+) | 16h |

### 13.4 Phase 4: Production Hardening (2 weeks, 96h)

| Task | Description | Effort |
|------|-------------|--------|
| S53-T32 | Tool orchestrator with DAG execution | 12h |
| S53-T33 | Agent tool selection with scoring | 8h |
| S53-T34 | Tool permission enforcement in agent runtime | 6h |
| S53-T35 | Theia tool result rendering | 12h |
| S53-T36 | Theia command palette integration | 6h |
| S53-T37 | Performance optimization | 8h |
| S53-T38 | Security audit of all tool packages | 16h |
| S53-T39 | Documentation (API, usage, dev guide) | 12h |
| S53-T40 | End-to-end testing | 16h |

### 13.5 Total Effort

| Phase | Hours | Weeks | Tasks |
|-------|-------|-------|-------|
| P1: Core MCP | 76h | 2 | 10 |
| P2: Pre-configured Tools | 188h | 3 | 11 |
| P3: Marketplace | 94h | 2 | 10 |
| P4: Production | 96h | 2 | 9 |
| **Total** | **454h** | **9** | **40** |

### 13.6 Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| MCP protocol spec changes | Medium | Use stable spec version, abstract protocol layer |
| API key security in transit | Critical | Encrypt all secrets at rest, use env vars, never log keys |
| Tool quality variability | Medium | Curated verification, automated security scanning |
| Rate limiting from external APIs | Medium | Client-side rate limiting, queuing, backoff |
| Theia compatibility changes | Medium | Isolate widget code with adapter interfaces |

### 13.7 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Tools available in marketplace | 40+ | Pre-configured count |
| Install rate of detected tools | >60% | Auto-detect suggestions accepted |
| Tool usage in agent workflows | >50% of tasks use tools | Telemetry |
| Agent success rate with tools | >85% | Tool call success / total |
| Average tool latency | <2s | Telemetry p50 |
| Community tool contributions | >10 in 3 months | Marketplace registry |

---

## 14. Offline Installation & Air-Gapped Deployment

Enterprise environments often require air-gapped or offline deployment of MCP tools. This section covers the packaging, distribution, and validation strategies for such scenarios.

### 14.1 MCP Server Packaging for Offline

Each MCP server package is bundled as a self-contained archive with all dependencies resolved:

| Component | Description |
|-----------|-------------|
| Source code | Compiled JavaScript (CommonJS/ESM) |
| Dependencies | node_modules included, resolved offline |
| Configuration | Default config with placeholder values |
| Schema | JSON Schema for tool configuration |
| Checksums | SHA-256 hashes of all files |
| Signature | GPG or Ed25519 signature for integrity |

### 14.2 Docker Image Bundling

For containerized environments, MCP servers are distributed as Docker images:

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
EXPOSE 3100
CMD ["node", "dist/mcp-server.js"]
```

Multi-stage builds ensure minimal image size. Images are tagged with semantic version and SHA digest for air-gapped registry mirroring.

### 14.3 npm Package Caching Strategies

Offline npm installation requires cached packages:

**.npmrc for offline mode:**
```
cache=/opt/ideia/mcp-cache
prefer-offline=true
offline=true
registry=https://registry.ideia.local/
```

**Offline mirror setup (Verdaccio):**
```bash
npm install -g verdaccio
verdaccio --config /etc/verdaccio/config.yaml
```

**Verdaccio config with upstream proxy and caching:**
```yaml
packages:
  '@ideia/*':
    access: $all
    publish: $authenticated
    proxy: npmjs
  '**':
    access: $all
    publish: $authenticated
    proxy: npmjs

storage: /opt/ideia/npm-storage
uplinks:
  npmjs:
    url: https://registry.npmjs.org/
    cache: true
    max_fails: 40
    maxage: 30m
    timeout: 60s
```

**Sync script for air-gapped registries:**
```bash
# npm-offline-sync.sh (requires connectivity)
# Sync all @ideia packages and their dependencies
PACKAGES=(
  "@ideia/mcp-slack"
  "@ideia/mcp-github"
  "@ideia/mcp-jira"
  "@ideia/mcp-postgres"
  "@ideia/mcp-sentry"
  "@ideia/mcp-openai"
)

for pkg in "${PACKAGES[@]}"; do
  npm pack "$pkg" --pack-destination /opt/ideia/mcp-offline-packages/
done

# Generate dependency lockfile
npx npm-lockfile-generator --dir /opt/ideia/mcp-offline-packages \
  --output /opt/ideia/mcp-offline-packages/lockfile.json
```

### 14.4 Registry Mirror Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌────────────────┐
│  Internet     │     │  DMZ / Bastion   │     │  Air-Gapped    │
│  npm registry │────▶│  Pull-Through    │────▶│  Internal      │
│  Docker Hub   │     │  Cache (Verdaccio│     │  Registry      │
│  GitHub       │     │   + Docker reg)  │     │  (Verdaccio    │
└──────────────┘     └──────────────────┘     │   + Harbor)    │
                                              └────────────────┘
                                                       │
                                              ┌────────▼────────┐
                                              │  IDEIA CLI      │
                                              │  mcp install    │
                                              │  --offline      │
                                              └─────────────────┘
```

Pull-through cache sits in DMZ, populated during sync windows. Air-gapped internal registry is updated via portable media (USB drive) with signed manifests.

### 14.5 Bundle Format: .mcpbundle

The `.mcpbundle` format packages MCP servers for physical transport:

**manifest.json structure:**
```json
{
  "formatVersion": "1.0",
  "packageName": "@ideia/mcp-postgres",
  "version": "1.2.3",
  "createdAt": "2026-07-22T10:00:00Z",
  "files": [
    {
      "path": "dist/mcp-server.js",
      "size": 24576,
      "sha256": "a1b2c3d4e5f6..."
    },
    {
      "path": "dist/schema.json",
      "size": 1024,
      "sha256": "b2c3d4e5f6a7..."
    }
  ],
  "dependencies": [
    {
      "name": "pg",
      "version": "8.12.0",
      "sha256": "c3d4e5f6a7b8..."
    }
  ],
  "signature": {
    "algorithm": "ed25519",
    "value": "d4e5f6a7b8c9...",
    "keyId": "ideia-mcp-releases@ideia.ai"
  }
}
```

**Bundle creation tool:**
```typescript
// packages/mcp-bundler/src/bundler.ts

interface BundleManifest {
  formatVersion: string;
  packageName: string;
  version: string;
  createdAt: string;
  files: BundleFileEntry[];
  dependencies: BundleDependency[];
  signature?: BundleSignature;
}

interface BundleFileEntry {
  path: string;
  size: number;
  sha256: string;
}

interface BundleDependency {
  name: string;
  version: string;
  sha256: string;
}

interface BundleSignature {
  algorithm: 'ed25519' | 'gpg';
  value: string;
  keyId: string;
}

class McpBundleCreator {
  async createBundle(
    packageDir: string,
    outputPath: string,
    signKey?: string,
  ): Promise<void> {
    const manifest: BundleManifest = {
      formatVersion: '1.0',
      packageName: await this.readPackageName(packageDir),
      version: await this.readPackageVersion(packageDir),
      createdAt: new Date().toISOString(),
      files: [],
      dependencies: [],
    };

    const files = await this.walkDirectory(packageDir);
    for (const file of files) {
      const content = await fs.promises.readFile(file);
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      manifest.files.push({
        path: path.relative(packageDir, file).replace(/\\/g, '/'),
        size: content.length,
        sha256: hash,
      });
    }

    const deps = await this.resolveDependencies(packageDir);
    for (const dep of deps) {
      const depContent = await fs.promises.readFile(dep.path);
      manifest.dependencies.push({
        name: dep.name,
        version: dep.version,
        sha256: crypto.createHash('sha256').update(depContent).digest('hex'),
      });
    }

    if (signKey) {
      const signer = crypto.createSign('sha256');
      signer.update(JSON.stringify(manifest, null, 2));
      manifest.signature = {
        algorithm: 'ed25519',
        value: signer.sign(signKey, 'hex'),
        keyId: signKey,
      };
    }

    const tarStream = tar.pack();
    tarStream.entry(
      { name: 'manifest.json' },
      JSON.stringify(manifest, null, 2),
    );
    for (const file of manifest.files) {
      const content = await fs.promises.readFile(
        path.join(packageDir, file.path),
      );
      tarStream.entry({ name: file.path }, content);
    }

    const writer = fs.createWriteStream(outputPath);
    tarStream.pipe(zlib.createGzip()).pipe(writer);
  }

  private async readPackageName(dir: string): Promise<string> {
    const pkg = JSON.parse(
      await fs.promises.readFile(path.join(dir, 'package.json'), 'utf-8'),
    );
    return pkg.name;
  }

  private async readPackageVersion(dir: string): Promise<string> {
    const pkg = JSON.parse(
      await fs.promises.readFile(path.join(dir, 'package.json'), 'utf-8'),
    );
    return pkg.version;
  }

  private async walkDirectory(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git') {
          files.push(...(await this.walkDirectory(fullPath)));
        }
      } else {
        files.push(fullPath);
      }
    }
    return files;
  }

  private async resolveDependencies(
    dir: string,
  ): Promise<Array<{ name: string; version: string; path: string }>> {
    const pkg = JSON.parse(
      await fs.promises.readFile(path.join(dir, 'package.json'), 'utf-8'),
    );
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const result = [];
    for (const [name, version] of Object.entries(deps)) {
      const depPkgPath = path.join(
        dir,
        'node_modules',
        name,
        'package.json',
      );
      if (await this.fileExists(depPkgPath)) {
        const depPkg = JSON.parse(
          await fs.promises.readFile(depPkgPath, 'utf-8'),
        );
        result.push({
          name,
          version: depPkg.version,
          path: depPkgPath,
        });
      }
    }
    return result;
  }
}
```

### 14.6 Offline Validation & Integrity Checks

```typescript
// packages/mcp-validator/src/integrity-validator.ts

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  manifest?: BundleManifest;
}

interface ValidationError {
  file: string;
  error: string;
}

class IntegrityValidator {
  async validateBundle(bundlePath: string): Promise<ValidationResult> {
    const extractDir = await fs.mkdtemp('mcp-validate-');
    const errors: ValidationError[] = [];

    try {
      await this.extractBundle(bundlePath, extractDir);
      const manifestPath = path.join(extractDir, 'manifest.json');
      const manifest: BundleManifest = JSON.parse(
        await fs.promises.readFile(manifestPath, 'utf-8'),
      );

      for (const entry of manifest.files) {
        const filePath = path.join(extractDir, entry.path);
        if (!(await this.fileExists(filePath))) {
          errors.push({ file: entry.path, error: 'Missing file' });
          continue;
        }
        const content = await fs.promises.readFile(filePath);
        const hash = crypto
          .createHash('sha256')
          .update(content)
          .digest('hex');
        if (hash !== entry.sha256) {
          errors.push({
            file: entry.path,
            error: `Checksum mismatch: expected ${entry.sha256}, got ${hash}`,
          });
        }
      }

      for (const dep of manifest.dependencies) {
        const depPath = path.join(
          extractDir,
          'node_modules',
          dep.name,
          'package.json',
        );
        if (!(await this.fileExists(depPath))) {
          errors.push({
            file: `node_modules/${dep.name}`,
            error: 'Missing dependency',
          });
        }
      }

      if (manifest.signature) {
        const isValid = await this.verifySignature(manifest);
        if (!isValid) {
          errors.push({ file: 'manifest.json', error: 'Invalid signature' });
        }
      }

      return { valid: errors.length === 0, errors, manifest };
    } finally {
      await fs.promises.rm(extractDir, {
        recursive: true,
        force: true,
      });
    }
  }

  private async extractBundle(
    bundlePath: string,
    dest: string,
  ): Promise<void> {
    const readStream = fs
      .createReadStream(bundlePath)
      .pipe(zlib.createGunzip())
      .pipe(tar.extract({ cwd: dest }));
    return new Promise((resolve, reject) => {
      readStream.on('finish', resolve);
      readStream.on('error', reject);
    });
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async verifySignature(
    manifest: BundleManifest,
  ): Promise<boolean> {
    if (!manifest.signature) return false;
    const verify = crypto.createVerify('sha256');
    const manifestCopy = { ...manifest, signature: undefined };
    verify.update(JSON.stringify(manifestCopy, null, 2));
    return verify.verify(
      manifest.signature.keyId,
      manifest.signature.value,
      'hex',
    );
  }
}
```

### 14.7 USB/Sneakernet Deployment Patterns

For maximum-security environments, MCP tools are deployed via portable media:

```
1. Export Phase (connected environment):
   ideia mcp export --format bundle --output /media/usb/mcp-bundles/
   Creates .mcpbundle files with full dependency trees

2. Transport Phase:
   Physically move USB drive to air-gapped machine
   Bundle includes manifest, checksums, signatures

3. Import Phase (air-gapped environment):
   ideia mcp import --source /media/usb/mcp-bundles/
   Integrity validation runs before installation
   Failed validation blocks installation, logs to audit trail

4. Verification Phase:
   ideia mcp verify --all
   Periodic re-validation of installed bundles
   Drift detection against stored checksums
```

**USB deployment script:**
```bash
#!/bin/bash
# export-mcp-bundles.sh
USB_MOUNT="/mnt/usb/mcp-bundles"
MCP_DIR="/opt/ideia/mcp/packages"

rm -rf "$USB_MOUNT"
mkdir -p "$USB_MOUNT"

for pkg_dir in "$MCP_DIR"/*/; do
  pkg_name=$(basename "$pkg_dir")
  echo "Exporting $pkg_name..."
  npx tsx packages/mcp-bundler/src/cli.ts create \
    --input "$pkg_dir" \
    --output "$USB_MOUNT/$pkg_name.mcpbundle" \
    --sign /etc/ideia/keys/mcp-sign.key
done

sha256sum "$USB_MOUNT"/*.mcpbundle > "$USB_MOUNT/CHECKSUMS"
echo "Export complete. Bundles at $USB_MOUNT"
```

---

## 15. Permission Tiers & Access Control

MCP tools operate with varying levels of access to system resources. A granular permission model ensures that tools only access what they need, preventing accidental or malicious damage.

### 15.1 Four-Tier Permission Model

| Tier | Label | Description | Examples | Approval Required |
|------|-------|-------------|----------|-------------------|
| T1 | Browse | Read-only operations with no side effects | `search_code`, `list_files`, `query_memory` | None (auto) |
| T2 | Standard | Operations with confirmed side effects | `write_file`, `create_issue`, `send_message` | User confirm |
| T3 | Elevated | Destructive or high-impact operations | `delete_file`, `refactor_code`, `execute_command` | Admin approve |
| T4 | Admin | System-level configuration changes | `install_tool`, `configure_server`, `manage_keys` | Multi-party approval |

**Tier inheritance:**
- T4 includes all lower tiers
- T3 includes T2 and T1
- T2 includes T1
- T1 is standalone (read-only)

### 15.2 Implementation via MCP Annotations

MCP protocol supports tool-level annotations for metadata. The permission tier is declared via the `annotations.audience` array:

```typescript
// packages/mcp-core/src/permissions.ts

type PermissionTier = 'T1' | 'T2' | 'T3' | 'T4';

interface ToolPermissionAnnotation {
  audience: PermissionTier[];
  description: string;
  justification: string;
}

const deleteFileTool = {
  name: 'delete_file',
  description: 'Permanently delete a file from the filesystem',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Absolute path to the file to delete',
      },
    },
    required: ['path'],
  },
  annotations: {
    audience: ['T3'],
    description: 'Destructive filesystem operation',
    justification:
      'delete_file can permanently remove files from disk',
  },
};
```

### 15.3 Hierarchical Permission Inheritance

Permissions flow from workspace to user to tool, with more specific scopes overriding broader ones:

```
Workspace Default (T1)
  +-- User Override (T2)
      +-- Tool Override (T4)
```

**Permission resolution algorithm:**
```typescript
// packages/mcp-security/src/permission-resolver.ts

class PermissionResolver {
  resolveToolPermission(
    tool: string,
    workspaceConfig: WorkspaceConfig,
    userConfig: UserConfig,
  ): PermissionTier {
    const toolOverride =
      userConfig.toolPermissions[tool] ??
      workspaceConfig.toolPermissions[tool];
    if (toolOverride) return toolOverride;

    if (userConfig.defaultTier) return userConfig.defaultTier;
    if (workspaceConfig.defaultTier) return workspaceConfig.defaultTier;

    return 'T1';
  }
}
```

### 15.4 Approval Flows Per Tier

| Tier | Flow | UI Component | Timeout |
|------|------|-------------|---------|
| T1 | Auto-execute | None (transparent) | Instant |
| T2 | User confirmation dialog | ConfirmDialog | 60s |
| T3 | Admin approval request | ApprovalWidget + notification | 5min |
| T4 | Multi-party approval (2 of 3 admins) | ApprovalWidget + escalation | 30min |

**Approval middleware implementation:**
```typescript
// packages/mcp-security/src/approval-middleware.ts

interface ApprovalRequest {
  tool: string;
  args: Record<string, unknown>;
  tier: PermissionTier;
  user: string;
  workspace: string;
  timestamp: Date;
}

class PermissionMiddleware {
  constructor(
    private policyEngine: PolicyEngine,
    private approvalService: ApprovalService,
    private vault: EncryptedVault,
  ) {}

  async checkPermission(
    toolName: string,
    args: Record<string, unknown>,
    user: string,
    workspace: string,
  ): Promise<PermissionCheck> {
    const toolDef = await this.getToolDefinition(toolName);
    const tier = this.resolveTier(toolDef);
    const userTier = await this.policyEngine.evaluate({
      principal: user,
      action: toolName,
      resource: workspace,
      context: { toolTier: tier },
    });

    switch (userTier) {
      case 'T1':
        return { allowed: true, tier: 'T1', approvalRequired: false };
      case 'T2':
        return {
          allowed: true,
          tier: 'T2',
          approvalRequired: true,
          approvalStrategy: 'user-confirm',
        };
      case 'T3':
        return {
          allowed: true,
          tier: 'T3',
          approvalRequired: true,
          approvalStrategy: 'admin-approve',
        };
      case 'T4':
        return {
          allowed: true,
          tier: 'T4',
          approvalRequired: true,
          approvalStrategy: 'multi-party',
          requiredApprovals: 2,
          approverPool: ['admin-role'],
        };
      default:
        return { allowed: false, reason: 'Insufficient permissions' };
    }
  }

  async executeWithApproval(
    request: ApprovalRequest,
    handler: () => Promise<unknown>,
  ): Promise<ExecutionResult> {
    const check = await this.checkPermission(
      request.tool,
      request.args,
      request.user,
      request.workspace,
    );

    if (!check.allowed) {
      return { success: false, error: check.reason };
    }

    if (check.approvalRequired) {
      const approval = await this.approvalService.requestApproval({
        ...request,
        strategy: check.approvalStrategy,
        requiredApprovals: check.requiredApprovals,
        approverPool: check.approverPool,
        timeout: this.getTimeoutForTier(request.tier),
      });
      if (!approval.granted) {
        return { success: false, error: 'Approval denied' };
      }
    }

    const result = await handler();
    return { success: true, result };
  }

  private getTimeoutForTier(tier: PermissionTier): number {
    switch (tier) {
      case 'T2': return 60_000;
      case 'T3': return 300_000;
      case 'T4': return 1_800_000;
      default: return 0;
    }
  }
}
```

### 15.5 Integration with IDEIA Policy Engine

The permission tier system integrates with IDEIA's Cedar-based Policy Engine (S4):

```cedar
// policies/mcp-tools.cedar

permit (
  principal in [IDEIA::Role::User],
  action in [IDEIA::Action::MCP::Browse],
  resource
) when { resource.tier == "T1" };

permit (
  principal in [IDEIA::Role::User],
  action in [IDEIA::Action::MCP::Standard],
  resource
) when {
  resource.tier == "T2" &&
  context.approval_status == "confirmed"
};

permit (
  principal in [IDEIA::Role::Admin],
  action in [IDEIA::Action::MCP::Elevated],
  resource
) when {
  resource.tier == "T3" &&
  context.approval_status == "approved"
};

permit (
  principal in [IDEIA::Role::Admin],
  action in [IDEIA::Action::MCP::Admin],
  resource
) when {
  resource.tier == "T4" &&
  context.approval_count >= 2
};

forbid (
  principal,
  action in [IDEIA::Action::MCP],
  resource
);
```

### 15.6 Configuration Schema

```typescript
// packages/mcp-security/src/config-schema.ts

const permissionConfigSchema = {
  type: 'object',
  properties: {
    defaultTier: {
      type: 'string',
      enum: ['T1', 'T2', 'T3', 'T4'],
      default: 'T1',
      description:
        'Default permission tier for tools without explicit tier',
    },
    toolOverrides: {
      type: 'object',
      additionalProperties: {
        type: 'string',
        enum: ['T1', 'T2', 'T3', 'T4'],
      },
      description: 'Per-tool permission tier overrides',
    },
    userOverrides: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          defaultTier: {
            type: 'string',
            enum: ['T1', 'T2', 'T3', 'T4'],
          },
          toolPermissions: {
            type: 'object',
            additionalProperties: {
              type: 'string',
              enum: ['T1', 'T2', 'T3', 'T4'],
            },
          },
        },
      },
      description: 'Per-user permission overrides',
    },
    approvalConfig: {
      type: 'object',
      properties: {
        t2Timeout: {
          type: 'number',
          default: 60,
          description: 'T2 approval timeout in seconds',
        },
        t3Timeout: {
          type: 'number',
          default: 300,
          description: 'T3 approval timeout in seconds',
        },
        t4Timeout: {
          type: 'number',
          default: 1800,
          description: 'T4 approval timeout in seconds',
        },
        t4RequiredApprovals: { type: 'number', default: 2 },
        t4ApproverRoles: {
          type: 'array',
          items: { type: 'string' },
          default: ['admin'],
        },
      },
    },
  },
};
```

---

## 16. Tool Scoring & Quality Metrics

To ensure a high-quality MCP ecosystem, each tool is scored automatically on five dimensions. Scores help users choose reliable tools and incentivize developers to improve quality.

### 16.1 Scoring Dimensions

| Dimension | Weight | Max Score | Criteria |
|-----------|--------|-----------|----------|
| Schema Quality | 25% | 25 | Input/output schema completeness, descriptions, examples |
| Documentation | 20% | 20 | README quality, JSDoc coverage, usage examples |
| Test Coverage | 20% | 20 | Unit test presence, integration tests, CI status |
| Security | 20% | 20 | No dangerous patterns, input validation, rate limiting |
| Popularity | 15% | 15 | Downloads, GitHub stars, community usage, contributor count |
| **Total** | **100%** | **100** | |

### 16.2 Scoring Algorithm

```typescript
// packages/mcp-scoring/src/scoring-engine.ts

interface ToolScore {
  total: number;
  dimensions: {
    schemaQuality: number;
    documentation: number;
    testCoverage: number;
    security: number;
    popularity: number;
  };
  breakdown: {
    schemaQuality: ScoreBreakdown;
    documentation: ScoreBreakdown;
    testCoverage: ScoreBreakdown;
    security: ScoreBreakdown;
    popularity: ScoreBreakdown;
  };
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

interface ScoreBreakdown {
  score: number;
  maxScore: number;
  checks: ScoreCheck[];
}

interface ScoreCheck {
  check: string;
  passed: boolean;
  weight: number;
}

class ScoringEngine {
  async scoreTool(toolPackage: ToolPackage): Promise<ToolScore> {
    const schemaQuality = await this.scoreSchemaQuality(toolPackage);
    const documentation = await this.scoreDocumentation(toolPackage);
    const testCoverage = await this.scoreTestCoverage(toolPackage);
    const security = await this.scoreSecurity(toolPackage);
    const popularity = await this.scorePopularity(toolPackage);

    const total = Math.round(
      schemaQuality.score +
        documentation.score +
        testCoverage.score +
        security.score +
        popularity.score,
    );

    const tier =
      total <= 40
        ? 'bronze'
        : total <= 70
          ? 'silver'
          : total <= 90
            ? 'gold'
            : 'platinum';

    return {
      total,
      dimensions: {
        schemaQuality: schemaQuality.score,
        documentation: documentation.score,
        testCoverage: testCoverage.score,
        security: security.score,
        popularity: popularity.score,
      },
      breakdown: {
        schemaQuality,
        documentation,
        testCoverage,
        security,
        popularity,
      },
      tier,
    };
  }

  private async scoreSchemaQuality(
    toolPackage: ToolPackage,
  ): Promise<ScoreBreakdown> {
    const checks: ScoreCheck[] = [];
    let passedScore = 0;

    const hasInputSchema = toolPackage.tools.every(
      t => t.inputSchema?.properties,
    );
    checks.push({
      check: 'All tools have input schemas with properties',
      passed: hasInputSchema,
      weight: 5,
    });
    if (hasInputSchema) passedScore += 5;

    const hasOutputSchema = toolPackage.tools.every(t => t.outputSchema);
    checks.push({
      check: 'All tools define output schemas',
      passed: hasOutputSchema,
      weight: 5,
    });
    if (hasOutputSchema) passedScore += 5;

    const hasDescriptions = toolPackage.tools.every(t =>
      Object.values(t.inputSchema?.properties ?? {}).every(
        (p: any) =>
          typeof p.description === 'string' && p.description.length > 0,
      ),
    );
    checks.push({
      check: 'All parameters have descriptions',
      passed: hasDescriptions,
      weight: 5,
    });
    if (hasDescriptions) passedScore += 5;

    const hasExamples = toolPackage.tools.every(t =>
      Object.values(t.inputSchema?.properties ?? {}).some(
        (p: any) => p.examples || p.default,
      ),
    );
    checks.push({
      check: 'Parameters include examples or defaults',
      passed: hasExamples,
      weight: 5,
    });
    if (hasExamples) passedScore += 5;

    const hasRequired = toolPackage.tools.every(t =>
      Array.isArray(t.inputSchema?.required),
    );
    checks.push({
      check: 'Required fields explicitly specified',
      passed: hasRequired,
      weight: 5,
    });
    if (hasRequired) passedScore += 5;

    return { score: passedScore, maxScore: 25, checks };
  }

  private async scoreDocumentation(
    toolPackage: ToolPackage,
  ): Promise<ScoreBreakdown> {
    const checks: ScoreCheck[] = [];
    let passedScore = 0;

    const hasReadme = await this.fileExists(
      toolPackage.path,
      'README.md',
    );
    checks.push({
      check: 'README.md exists',
      passed: hasReadme,
      weight: 5,
    });
    if (hasReadme) passedScore += 5;

    const jsdocCoverage = await this.computeJsdocCoverage(
      toolPackage.path,
    );
    const hasGoodJsdoc = jsdocCoverage >= 0.8;
    checks.push({
      check: `JSDoc coverage >= 80% (${Math.round(jsdocCoverage * 100)}%)`,
      passed: hasGoodJsdoc,
      weight: 5,
    });
    if (hasGoodJsdoc) passedScore += 5;

    const readmeContent = hasReadme
      ? await fs.promises.readFile(
          path.join(toolPackage.path, 'README.md'),
          'utf-8',
        )
      : '';
    const hasExamples = /```(?:typescript|js|bash)/.test(readmeContent);
    checks.push({
      check: 'Usage examples in README',
      passed: hasExamples,
      weight: 5,
    });
    if (hasExamples) passedScore += 5;

    const hasChangelog = await this.fileExists(
      toolPackage.path,
      'CHANGELOG.md',
    );
    checks.push({
      check: 'CHANGELOG.md exists',
      passed: hasChangelog,
      weight: 5,
    });
    if (hasChangelog) passedScore += 5;

    return { score: passedScore, maxScore: 20, checks };
  }

  private async scoreTestCoverage(
    toolPackage: ToolPackage,
  ): Promise<ScoreBreakdown> {
    const checks: ScoreCheck[] = [];
    let passedScore = 0;

    const hasTestDir =
      (await this.dirExists(toolPackage.path, 'tests')) ||
      (await this.dirExists(toolPackage.path, '__tests__'));
    checks.push({
      check: 'Test directory exists',
      passed: hasTestDir,
      weight: 5,
    });
    if (hasTestDir) passedScore += 5;

    const testFiles = hasTestDir
      ? await this.globFiles(toolPackage.path, '**/*.test.ts')
      : [];
    const hasUnitTests = testFiles.length > 0;
    checks.push({
      check: `Unit tests present (${testFiles.length} files)`,
      passed: hasUnitTests,
      weight: 5,
    });
    if (hasUnitTests) passedScore += 5;

    const intTestFiles = hasTestDir
      ? await this.globFiles(toolPackage.path, '**/*.integration.test.ts')
      : [];
    const hasIntTests = intTestFiles.length > 0;
    checks.push({
      check: `Integration tests present (${intTestFiles.length} files)`,
      passed: hasIntTests,
      weight: 5,
    });
    if (hasIntTests) passedScore += 5;

    const hasCi =
      (await this.fileExists(
        toolPackage.path,
        '.github/workflows',
      )) ||
      (await this.fileExists(toolPackage.path, 'Jenkinsfile'));
    checks.push({
      check: 'CI configuration present',
      passed: hasCi,
      weight: 5,
    });
    if (hasCi) passedScore += 5;

    return { score: passedScore, maxScore: 20, checks };
  }

  private async scoreSecurity(
    toolPackage: ToolPackage,
  ): Promise<ScoreBreakdown> {
    const checks: ScoreCheck[] = [];
    let passedScore = 0;

    const sourceFiles = await this.globFiles(
      toolPackage.path,
      'src/**/*.ts',
    );
    let hasDangerousPatterns = false;
    for (const file of sourceFiles) {
      const content = await fs.promises.readFile(file, 'utf-8');
      if (/\b(eval|exec|Function)\s*\(/.test(content)) {
        hasDangerousPatterns = true;
        break;
      }
    }
    checks.push({
      check: 'No eval/exec/Function usage',
      passed: !hasDangerousPatterns,
      weight: 5,
    });
    if (!hasDangerousPatterns) passedScore += 5;

    const hasValidation = sourceFiles.some(
      f => f.includes('validation') || f.includes('sanitize'),
    );
    checks.push({
      check: 'Input validation present',
      passed: hasValidation,
      weight: 5,
    });
    if (hasValidation) passedScore += 5;

    const hasRateLimit = sourceFiles.some(
      f => f.includes('rate-limit') || f.includes('throttle'),
    );
    checks.push({
      check: 'Rate limiting implemented',
      passed: hasRateLimit,
      weight: 5,
    });
    if (hasRateLimit) passedScore += 5;

    let hasHardcodedSecrets = false;
    for (const file of sourceFiles) {
      const content = await fs.promises.readFile(file, 'utf-8');
      if (
        /(?:api_key|apiKey|secret|password|token)\s*[:=]\s*['"][^'"]+['"]/i.test(
          content,
        )
      ) {
        hasHardcodedSecrets = true;
        break;
      }
    }
    checks.push({
      check: 'No hardcoded secrets in source',
      passed: !hasHardcodedSecrets,
      weight: 5,
    });
    if (!hasHardcodedSecrets) passedScore += 5;

    return { score: passedScore, maxScore: 20, checks };
  }

  private async scorePopularity(
    toolPackage: ToolPackage,
  ): Promise<ScoreBreakdown> {
    const checks: ScoreCheck[] = [];
    let passedScore = 0;

    const downloads = await this.fetchNpmDownloads(toolPackage.name);
    const downloadsScore =
      downloads > 10000 ? 5 : downloads > 1000 ? 3 : downloads > 100 ? 1 : 0;
    checks.push({
      check: `npm downloads: ${downloads.toLocaleString()}`,
      passed: downloadsScore > 0,
      weight: 5,
    });
    passedScore += downloadsScore;

    const stars = await this.fetchGithubStars(toolPackage.repository);
    const starsScore =
      stars > 100 ? 5 : stars > 10 ? 3 : stars > 0 ? 1 : 0;
    checks.push({
      check: `GitHub stars: ${stars}`,
      passed: starsScore > 0,
      weight: 5,
    });
    passedScore += starsScore;

    const lastUpdate = await this.fetchLastUpdate(toolPackage.repository);
    const daysSinceUpdate =
      (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    const recentScore =
      daysSinceUpdate < 30
        ? 5
        : daysSinceUpdate < 90
          ? 3
          : daysSinceUpdate < 365
            ? 1
            : 0;
    checks.push({
      check: `Last update: ${Math.round(daysSinceUpdate)} days ago`,
      passed: recentScore > 0,
      weight: 5,
    });
    passedScore += recentScore;

    return { score: passedScore, maxScore: 15, checks };
  }
}
```

### 16.3 Score Tiers & Badges

| Tier | Score Range | Badge | Color | Description |
|------|-------------|-------|-------|-------------|
| Bronze | 0-40 | bronze | #cd7f32 | Early stage, may lack documentation or tests |
| Silver | 41-70 | silver | #c0c0c0 | Functional, reasonably well-documented |
| Gold | 71-90 | gold | #ffd700 | High quality, well-tested, secure |
| Platinum | 91-100 | platinum | #b9f2ff | Exceptional quality, production-ready |

### 16.4 Integration with IDEIA Tool Registry

```typescript
// packages/mcp-registry/src/scored-registry.ts

class ScoredRegistry extends MCPRegistry {
  private scoringEngine = new ScoringEngine();

  override async registerPackage(pkg: ToolPackage): Promise<void> {
    const score = await this.scoringEngine.scoreTool(pkg);
    pkg.metadata = pkg.metadata ?? {};
    pkg.metadata.score = score.total;
    pkg.metadata.scoreTier = score.tier;
    pkg.metadata.scoreBreakdown = score.breakdown;
    await super.registerPackage(pkg);
    await this.storeScore(pkg.name, pkg.version, score);
  }

  async searchByQuality(
    query: string,
    minTier?: string,
  ): Promise<ToolPackage[]> {
    const results = await this.search(query);
    if (minTier) {
      const tierOrder = ['bronze', 'silver', 'gold', 'platinum'];
      const minIndex = tierOrder.indexOf(minTier);
      return results
        .filter(pkg => {
          const pkgIndex = tierOrder.indexOf(
            pkg.metadata?.scoreTier ?? 'bronze',
          );
          return pkgIndex >= minIndex;
        })
        .sort(
          (a, b) =>
            (b.metadata?.score ?? 0) - (a.metadata?.score ?? 0),
        );
    }
    return results.sort(
      (a, b) => (b.metadata?.score ?? 0) - (a.metadata?.score ?? 0),
    );
  }
}
```

### 16.5 Quality Dashboard Widget

```
+-----------------------------------------------------------+
|  MCP Tool Quality Dashboard                  [Refresh]    |
+-----------------------------------------------------------+
|  +-----------------------------------------------------+  |
|  | Overall Ecosystem Score: 72/100   Gold               |  |
|  | Tools scored: 39/39    Tools passing: 32/39          |  |
|  +-----------------------------------------------------+  |
|                                                           |
|  Tool                  Score  Tier    Schema  Docs        |
|  --------------------  -----  ------  ------  ----        |
|  @ideia/mcp-slack      85     gold    22/25   18/20      |
|  @ideia/mcp-github     92     plat    24/25   19/20      |
|  @ideia/mcp-postgres   78     gold    20/25   16/20      |
|  @ideia/mcp-newrelic   45     silv    15/25   10/20      |
|  @ideia/mcp-mongodb    35     bron    12/25    8/20      |
+-----------------------------------------------------------+
```

**Widget component structure:**
```typescript
// packages/ideia-plugin/src/browser/mcp-quality-widget.tsx

interface QualityDashboardState {
  tools: ScoredTool[];
  ecosystemScore: number;
  loading: boolean;
  filterTier?: string;
}

class MCPQualityWidget extends ReactWidget {
  static ID = 'ideia:mcp-quality-dashboard';
  static LABEL = 'MCP Tool Quality';

  protected state: QualityDashboardState = {
    tools: [],
    ecosystemScore: 0,
    loading: true,
  };

  async onOpenRequest(msg: Message): Promise<void> {
    await this.refreshScores();
    super.onOpenRequest(msg);
  }

  private async refreshScores(): Promise<void> {
    this.state.loading = true;
    this.update();
    const registry = this.getService(MCPRegistry);
    const tools = await registry.listAll();
    const scored = await Promise.all(
      tools.map(async t => ({
        ...t,
        score: await this.scoringEngine.scoreTool(t),
      })),
    );
    this.state.tools = scored;
    this.state.ecosystemScore = Math.round(
      scored.reduce((sum, t) => sum + t.score.total, 0) / scored.length,
    );
    this.state.loading = false;
    this.update();
  }

  protected render(): React.ReactNode {
    if (this.state.loading) return <div>Loading quality scores...</div>;
    return (
      <div className='mcp-quality-dashboard'>
        <div className='ecosystem-summary'>
          <h3>
            Overall Ecosystem Score: {this.state.ecosystemScore}/100
          </h3>
        </div>
        <table className='tool-scores'>
          <thead>
            <tr>
              <th>Tool</th>
              <th>Score</th>
              <th>Tier</th>
              <th>Schema</th>
              <th>Docs</th>
              <th>Tests</th>
              <th>Security</th>
              <th>Popularity</th>
            </tr>
          </thead>
          <tbody>
            {this.state.tools
              .filter(
                t =>
                  !this.state.filterTier ||
                  t.score.tier === this.state.filterTier,
              )
              .sort((a, b) => b.score.total - a.score.total)
              .map(tool => (
                <tr key={tool.name}>
                  <td>{tool.name}</td>
                  <td>{tool.score.total}</td>
                  <td>{tool.score.tier}</td>
                  <td>{tool.score.dimensions.schemaQuality}/25</td>
                  <td>{tool.score.dimensions.documentation}/20</td>
                  <td>{tool.score.dimensions.testCoverage}/20</td>
                  <td>{tool.score.dimensions.security}/20</td>
                  <td>{tool.score.dimensions.popularity}/15</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    );
  }
}
```

---

## 17. Community Pipeline & Contribution Workflow

A thriving MCP ecosystem depends on community contributions. This section defines the pipeline for submitting, reviewing, and publishing community MCP servers.

### 17.1 Contribution Pipeline Overview

```
Developer creates MCP server
         |
         v
+-----------------------+
|  PR Submission        |
|  (PR template)        |
+-----------+-----------+
            |
            v
+-----------------------+
|  Automated Checks     |
|  1. Security scan     |
|  2. Schema validate   |
|  3. Score calc        |
|  4. Auto-label        |
+-----------+-----------+
            |
            v
+-----------------------+
|  Maintainer Review    |
|  (CODEOWNERS)         |
+-----------+-----------+
            |
            v
+-----------------------+
|  Registry Publish     |
|  (npm + marketplace)  |
+-----------------------+
```

### 17.2 PR Template for MCP Servers

```markdown
---
name: MCP Server Contribution
about: Submit a new MCP server for the IDEIA marketplace
title: '[MCP] '
labels: 'mcp-server'
assignees: ''
---

## MCP Server Information

**Package name:** @ideia/mcp-{service}
**Version:** 0.1.0
**Description:** {brief description}
**Category:** {communication | project-management | ci-cd | monitoring | cloud | database | ai-llm | code-vcs | browser | other}

## Tools Provided

| Tool Name | Description | Permission Tier |
|-----------|-------------|-----------------|
| {tool1}   | {desc}      | {T1/T2/T3/T4}  |
| {tool2}   | {desc}      | {T1/T2/T3/T4}  |

## Checklist

### Schema Quality
- [ ] All tools have inputSchema with properties
- [ ] All parameters have descriptions
- [ ] Minimum one example per tool
- [ ] Output schema defined for each tool
- [ ] Required fields marked

### Documentation
- [ ] README.md with installation and usage
- [ ] JSDoc comments on all exported functions
- [ ] At least 2 usage examples
- [ ] Configuration documentation

### Test Coverage
- [ ] Unit tests for each tool (>80% coverage)
- [ ] Integration tests with real API calls
- [ ] Tests pass on CI

### Security
- [ ] No eval/exec/Function usage
- [ ] Input validation implemented
- [ ] Rate limiting added
- [ ] No hardcoded credentials
- [ ] API keys from environment/config only

### Configuration
- [ ] configSchema defined
- [ ] Default values documented
- [ ] Required vs optional fields specified

## Additional Information

**Dependencies:** {list of npm packages}
**API documentation:** {link to external API docs}
**Testing instructions:** {how to test locally}
```

### 17.3 Automated CI Pipeline

```yaml
# .github/workflows/mcp-server-submission.yml

name: MCP Server Submission Pipeline

on:
  pull_request:
    types: [opened, synchronize, labeled]
    paths:
      - 'packages/community/**'

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
      - uses: github/codeql-action/analyze@v3
      - name: Secret scan
        run: npx talisman --pattern '**/*.ts'
      - name: Dangerous patterns check
        run: |
          if grep -r "\beval\b\|\bexec\b\|\bFunction\b" \
            packages/community/ --include="*.ts"; then
            echo "::error::Found dangerous patterns"
            exit 1
          fi

  schema-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Validate schemas
        run: |
          node scripts/validate-mcp-schemas.mjs \
            --dir packages/community/${{ github.head_ref }}
      - name: Check tool permissions
        run: |
          node scripts/check-permission-tiers.mjs \
            --dir packages/community/${{ github.head_ref }}

  quality-scoring:
    runs-on: ubuntu-latest
    needs: [security-scan, schema-validation]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Calculate score
        id: score
        run: |
          SCORE=$(node scripts/score-mcp-server.mjs \
            --dir packages/community/${{ github.head_ref }} \
            --json)
          echo "score=$SCORE" >> $GITHUB_OUTPUT
      - name: Determine tier
        id: tier
        run: |
          SCORE=${{ steps.score.outputs.score }}
          if [ $SCORE -ge 91 ]; then echo "tier=platinum" >> $GITHUB_OUTPUT
          elif [ $SCORE -ge 71 ]; then echo "tier=gold" >> $GITHUB_OUTPUT
          elif [ $SCORE -ge 41 ]; then echo "tier=silver" >> $GITHUB_OUTPUT
          else echo "tier=bronze" >> $GITHUB_OUTPUT
          fi

  auto-label:
    runs-on: ubuntu-latest
    needs: quality-scoring
    steps:
      - name: Apply quality label
        uses: actions/github-script@v7
        with:
          script: |
            const tier = '${{ needs.quality-scoring.outputs.tier }}';
            const labels = ['mcp-server', 'quality-' + tier];
            if (tier === 'bronze') labels.push('needs-improvement');
            if (tier === 'platinum' || tier === 'gold') {
              labels.push('ready-for-review');
            }
            await github.rest.issues.addLabels({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              labels: labels,
            });

  registry-update:
    runs-on: ubuntu-latest
    needs: [quality-scoring, auto-label]
    if: github.event.pull_request.merged == true
    steps:
      - uses: actions/checkout@v4
      - name: Publish to registry
        run: |
          node scripts/publish-to-registry.mjs \
            --package packages/community/${{ github.head_ref }} \
            --score ${{ needs.quality-scoring.outputs.score }} \
            --tier ${{ needs.quality-scoring.outputs.tier }}
```

### 17.4 Community Guidelines Template

```markdown
# MCP Server Community Guidelines

## Quality Standards

All community MCP servers must meet minimum quality thresholds:

1. **Security:** Zero critical vulnerabilities. No eval/exec/Function.
2. **Schema:** All tools must have complete input and output schemas.
3. **Documentation:** README with installation, configuration, examples.
4. **Testing:** Minimum 80% test coverage for all tool handlers.
5. **Maintenance:** Servers inactive for >12 months may be deprecated.

## Submission Process

1. Fork the IDEIA repository
2. Create a new package under packages/community/mcp-{service}
3. Use the PR template (.github/PULL_REQUEST_TEMPLATE/mcp-server.md)
4. Submit PR with mcp-server label
5. Automated checks run within 5 minutes
6. Maintainer review within 48 hours
7. Community voting period (optional, 7 days for gold/platinum)
8. Merge and publish to registry

## Deprecation Policy

- Tools with unaddressed security issues are immediately deprecated
- Tools inactive for >12 months receive a deprecation warning
- Deprecated tools remain in registry but are marked accordingly
- Users are notified of deprecation via Theia notification

## Code of Conduct

All contributors must adhere to the IDEIA Code of Conduct.
```

### 17.5 Governance Model

```
Governance Structure:

+---------------------------------------------------+
|            MCP Steering Committee                  |
|   (3 IDEIA core maintainers + 2 community          |
|    representatives)                                |
+---------------------------------------------------+
|  Responsibilities:                                 |
|  * Approve new tool categories                     |
|  * Resolve disputes                                |
|  * Define deprecation policy                       |
|  * Review security-critical changes                |
+---------------------------------------------------+
         |
         v
+---------------------------------------------------+
|              CODEOWNERS                            |
+---------------------------------------------------+
|  * @ideia/mcp-* -> @ideia-core                    |
|  * packages/community/* -> @community-reviewers    |
|  * packages/tools/* -> @ideia-core                 |
|  * packages/marketplace/* -> @ideia-core           |
|  * *.md -> @docs-maintainers                      |
+---------------------------------------------------+
```

**CODEOWNERS file:**
```
# .github/CODEOWNERS
packages/tools/* @ideia-core
packages/mcp-* @ideia-core
packages/community/* @community-reviewers
packages/marketplace/* @ideia-core
docs/* @docs-maintainers
*.md @docs-maintainers
```

### 17.6 Registry Publication API

```typescript
// packages/marketplace/src/registry-api.ts

class CommunityRegistryAPI {
  constructor(
    private registry: MarketplaceRegistry,
    private scoring: ScoringEngine,
    private audit: AuditService,
    private eventBus: IEventBus,
  ) {}

  async submitForReview(pkg: ToolPackage): Promise<SubmissionResult> {
    const validation = await this.validatePackage(pkg);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const score = await this.scoring.scoreTool(pkg);

    const submission = await this.audit.record({
      action: 'mcp.submit',
      package: pkg.name,
      version: pkg.version,
      score: score.total,
      tier: score.tier,
      status: 'pending_review',
      timestamp: new Date().toISOString(),
    });

    await this.eventBus.publish('mcp.submission.created', {
      submissionId: submission.id,
      packageName: pkg.name,
      repository: pkg.repository,
      branch: `mcp-submit/${pkg.name}`,
    });

    return {
      success: true,
      submissionId: submission.id,
      score: score.total,
      tier: score.tier,
    };
  }

  async approveSubmission(
    submissionId: string,
    reviewer: string,
  ): Promise<void> {
    await this.audit.record({
      action: 'mcp.approve',
      submissionId,
      reviewer,
      timestamp: new Date().toISOString(),
    });

    await this.publishToNpm(submissionId);
    await this.registry.addPackage(submissionId);

    await this.eventBus.publish('mcp.submission.approved', {
      submissionId,
      approvedBy: reviewer,
    });
  }

  async rejectSubmission(
    submissionId: string,
    reviewer: string,
    reason: string,
  ): Promise<void> {
    await this.audit.record({
      action: 'mcp.reject',
      submissionId,
      reviewer,
      reason,
      timestamp: new Date().toISOString(),
    });

    await this.eventBus.publish('mcp.submission.rejected', {
      submissionId,
      reason,
    });
  }
}
```

---

## 18. Implementation Roadmap (Expanded)

This expanded roadmap adds five new areas (offline installation, permission tiers, tool scoring, community pipeline, marketplace UI) to the existing implementation plan.

### 18.1 Phase 1 (Week 1-2): Permission Tiers + Policy Engine Integration

| Task | Description | Effort | Depends On |
|------|-------------|--------|------------|
| S53-T41 | Define 4-tier permission model (T1-T4) with annotations schema | 4h | S4 (Policy Engine) |
| S53-T42 | Implement PermissionMiddleware for MCP server | 8h | S53-T41 |
| S53-T43 | Implement PermissionResolver with hierarchical inheritance | 6h | S53-T41 |
| S53-T44 | Write Cedar policies for MCP permission tiers | 8h | S4, S53-T41 |
| S53-T45 | Implement approval flows per tier (confirm, admin, multi-party) | 12h | S53-T42 |
| S53-T46 | Approval UI components (ConfirmDialog, ApprovalWidget) | 8h | S53-T45 |
| S53-T47 | Policy evaluation caching with configurable TTL | 4h | S53-T44 |
| S53-T48 | Integration tests for permission flows | 8h | S53-T42, S53-T45 |
| | **Phase 1 Total** | **58h** | |

### 18.2 Phase 2 (Week 3-4): Tool Scoring Engine + Quality Dashboard

| Task | Description | Effort | Depends On |
|------|-------------|--------|------------|
| S53-T49 | ScoringEngine: schema quality dimension | 6h | - |
| S53-T50 | ScoringEngine: documentation dimension | 4h | - |
| S53-T51 | ScoringEngine: test coverage dimension | 6h | - |
| S53-T52 | ScoringEngine: security dimension | 8h | - |
| S53-T53 | ScoringEngine: popularity dimension | 4h | - |
| S53-T54 | Score consolidation and tier assignment | 4h | S53-T49..T53 |
| S53-T55 | ScoredRegistry with quality-based search sorting | 6h | S53-T54 |
| S53-T56 | MCPQualityDashboard Theia widget | 12h | S53-T55, S20 |
| S53-T57 | Badge generation for marketplace display | 4h | S53-T54 |
| S53-T58 | Integration tests for scoring engine | 8h | S53-T54 |
| | **Phase 2 Total** | **62h** | |

### 18.3 Phase 3 (Week 5-6): Offline Installation + Bundle Format

| Task | Description | Effort | Depends On |
|------|-------------|--------|------------|
| S53-T59 | .mcpbundle format specification and manifest schema | 6h | - |
| S53-T60 | McpBundleCreator: bundle creation CLI | 12h | S53-T59 |
| S53-T61 | IntegrityValidator: SHA-256 checksum verification | 8h | S53-T60 |
| S53-T62 | Signature verification (Ed25519/GPG) | 6h | S53-T61 |
| S53-T63 | Docker image bundling patterns and multi-stage Dockerfile | 4h | - |
| S53-T64 | npm offline cache configuration (Verdaccio pull-through) | 8h | - |
| S53-T65 | USB/sneakernet deployment scripts | 6h | S53-T60 |
| S53-T66 | ideia mcp export and ideia mcp import CLI commands | 8h | S53-T60 |
| S53-T67 | Offline mode detection and registry fallback | 4h | S53-T64 |
| S53-T68 | Integration tests for bundle/offline flow | 10h | S53-T60..T66 |
| | **Phase 3 Total** | **72h** | |

### 18.4 Phase 4 (Week 7-8): Community Pipeline + CI Automation

| Task | Description | Effort | Depends On |
|------|-------------|--------|------------|
| S53-T69 | PR template for MCP server contributions | 4h | - |
| S53-T70 | Community guidelines document | 4h | - |
| S53-T71 | CI workflow for MCP server submissions | 12h | S53-T69 |
| S53-T72 | Security scan job (CodeQL + secrets) | 6h | S53-T71 |
| S53-T73 | Schema validation job in CI | 4h | S53-T71 |
| S53-T74 | Quality scoring job in CI | 6h | S53-T71, S53-T54 |
| S53-T75 | Auto-labeler based on quality tier | 4h | S53-T74 |
| S53-T76 | CommunityRegistryAPI with submit/approve/reject flows | 12h | S53-T71 |
| S53-T77 | Governance: CODEOWNERS + steering committee docs | 4h | - |
| S53-T78 | Community voting mechanism (optional phase) | 8h | S53-T76 |
| S53-T79 | Integration tests for community pipeline | 10h | S53-T71..T76 |
| | **Phase 4 Total** | **74h** | |

### 18.5 Phase 5 (Week 9-10): Marketplace UI + Registry API

| Task | Description | Effort | Depends On |
|------|-------------|--------|------------|
| S53-T80 | Marketplace API design and OpenAPI spec | 8h | - |
| S53-T81 | Marketplace REST API implementation | 16h | S53-T80 |
| S53-T82 | Marketplace Theia widget (browse, search, install) | 16h | S11, S20 |
| S53-T83 | Tool detail view with score, tier, and reviews | 8h | S53-T82, S53-T55 |
| S53-T84 | One-click install from marketplace | 6h | S53-T82, S53-T23 |
| S53-T85 | Category browsing and filtering | 6h | S53-T82 |
| S53-T86 | Tool version history and changelog display | 6h | S53-T82, S53-T24 |
| S53-T87 | Marketplace search with quality ranking | 8h | S53-T82, S53-T55 |
| S53-T88 | Analytics display (downloads, ratings, usage) | 6h | S53-T82 |
| S53-T89 | End-to-end tests for marketplace | 12h | S53-T81..T88 |
| | **Phase 5 Total** | **92h** | |

### 18.6 Consolidated Timeline

| Phase | Weeks | Hours | Tasks | Key Deliverable |
|-------|-------|-------|-------|-----------------|
| P1: Permission Tiers | 1-2 | 58h | 8 | PermissionMiddleware + Cedar policies |
| P2: Scoring Engine | 3-4 | 62h | 10 | ScoringEngine + Quality Dashboard |
| P3: Offline Bundle | 5-6 | 72h | 10 | .mcpbundle format + offline CLI |
| P4: Community Pipeline | 7-8 | 74h | 11 | CI workflow + CommunityRegistryAPI |
| P5: Marketplace UI | 9-10 | 92h | 10 | Marketplace widget + REST API |
| **Total** | **10 weeks** | **358h** | **49** | |

### 18.7 Dependencies

| Dependency | Phase | Description |
|------------|-------|-------------|
| S4 (Seguranca e Governanca) | P1 | Cedar Policy Engine for permission evaluation |
| S20 (Plugins e Ecossistema) | P2, P5 | Plugin bridge for quality dashboard and marketplace widgets |
| S11 (Theia Integration) | P2, P5 | Theia widget patterns for dashboard and marketplace |
| S53-T1..T10 (Core MCP) | All | Foundational MCP registry, client, server |
| S53-T11..T21 (Pre-configured Tools) | P2, P5 | Tool packages for scoring population |
| S35 (Filesystem/Workspace) | P3 | Workspace service for offline bundle paths |
| S3 (Intent-to-Plan) | P5 | Tool search ranking based on intent analysis |

### 18.8 Risk Assessment

| Risk | Probability | Impact | Phase | Mitigation |
|------|-------------|--------|-------|------------|
| Cedar policy complexity for multi-tier | Medium | High | P1 | Extensive testing matrix for all 4 tiers |
| Offline dependency resolution complexity | High | Medium | P3 | Leverage existing npm offline tooling (Verdaccio) |
| Community pipeline adoption | Medium | Medium | P4 | Start with internal contributions, open gradually |
| Marketplace UI performance with 200+ tools | Low | Medium | P5 | Virtual scrolling, lazy loading, pagination |
| Scoring engine false positives/negatives | Medium | Low | P2 | Allow manual score overrides, periodic recalibration |
| Permission model disrupts existing workflows | Medium | High | P1 | Backward-compatible default (T1 for all) with opt-in upgrade |
| Bundle format compatibility across platforms | Low | High | P3 | Cross-platform CI testing (Windows, Linux, macOS) |

---

## 19. Conexoes

| Estudo | Conexao com S53 |
|--------|-----------------|
| **S20** (Plugins/Ecosystem) | MCP tools are a new class of plugin. Marketplace architecture extends the plugin system. Tool contributions follow same patterns as Theia extensions. Quality dashboard and marketplace widgets use the plugin bridge. |
| **S6** (Pipeline/Verification) | Tool quality gates in CI/CD pipeline. Security scanning of community tool submissions. Automated test harness for all pre-configured MCP servers. |
| **S16** (Deploy/CD) | Tool version management ties into release pipeline. Canary deployment of tool updates. Auto-update mechanism for installed tools. |
| **S51** (Parallel Agents) | Tool orchestrator enables parallel tool execution across agents. DAG-based dependency resolution for multi-agent tool workflows. |
| **S52** (PR Automation) | GitHub/GitLab MCP tools enable automated PR creation, review assignment, and merge. Tool chaining from issue detection to PR merge. |
| **S31** (LLM Integration) | AI/LLM tool packages (OpenAI, Anthropic, Ollama) for agent-mediated LLM calls. Tool selection algorithm uses LLM for task-to-tool matching. |
| **S47** (Theia AI Agents) | MCP tools power Theia agent commands. Tool results rendered in Theia widgets. Agent runtime selects and executes MCP tools via ToolRouter. |
| **S42** (DI/Contributions) | MCP services registered via Inversify DI. Tool contribution points follow S42 patterns. MCP commands registered via CommandContribution. |
| **S11** (Theia Integration) | MCPToolWidget as Theia widget. Marketplace UI in Theia shell. Tool configuration via Theia preferences. |
| **S3** (Intent-to-Plan) | Tool orchestration plans generated from user intent. Tool selection based on task analysis from intent classifier. |
| **S35** (Filesystem/Workspace) | File system tools depend on workspace service. Auto-detection scans workspace files for tool configuration. Offline bundle paths resolved via workspace service. |
| **S39** (Settings/Keybindings) | MCP preferences integrated into Theia settings. Keybindings for marketplace, auto-detect, and tool commands. |
| **S49** (Theia Preferences) | Tool configuration via Theia preference system. MCP preference schema registered with PreferenceContribution. Permission config schema extends preference system. |
| **S4** (Seguranca e Governanca) | Permission tiers (T1-T4) built on Cedar Policy Engine. Approval flows integrate with existing policy evaluation. Multi-party approval extends existing approval service. |
| **S55** (Resiliencia) | Air-gapped deployment patterns and offline bundle validation follow resilience patterns. Registry mirror with pull-through cache supports disaster recovery. |
| **GAPS-PRODUCAO-IDE.md** | Offline installation gap addressed by .mcpbundle format and USB/sneakernet deployment. Permission model gap addressed by 4-tier T1-T4 system. Quality scoring gap addressed by automated scoring engine. Community pipeline gap addressed by CI workflow and contribution template. |

---

> **Fim do Estudo S53 -- MCP Ecosystem & Integration Marketplace**
