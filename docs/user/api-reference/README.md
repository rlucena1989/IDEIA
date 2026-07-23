# API Reference — IDEIA

## CLI

```
ideia init <project>           # Create new project
ideia start                    # Start IDE
ideia build                    # Build project
ideia test                     # Run tests

ideia generate <type>          # Generate code (model, controller, etc)
ideia audit                    # Run security/compliance audit
ideia verify                   # Verify project integrity
ideia drift                    # Check configuration drift

ideia policy apply             # Apply security policies
ideia policy check <file>      # Check file against policies
ideia compliance check         # Run compliance checks (LGPD, HIPAA)

ideia docs generate            # Generate documentation
ideia docs audit               # Audit documentation completeness

ideia workflow run <name>      # Execute workflow
ideia workflow list            # List available workflows

ideia report <type>            # Generate report (coverage, security, etc)
ideia memory store <k> <v>     # Store value in memory
ideia memory get <k>           # Retrieve value from memory
ideia memory search <q>        # Search memory

ideia evolution suggest        # Get evolution suggestions
ideia optimize <target>        # Optimize code/dependencies
ideia coverage                 # Code coverage report
ideia agents list              # List available agents

ideia stream sse --port 3001   # Start SSE streaming server
ideia stream ws --port 3002    # Start WebSocket streaming server
ideia prompt <input>           # Run prompt pipeline

ideia context                  # Project context
ideia context search <term>    # Search project context
```

## HTTP API

### Chat

```
POST /api/chat/completions
Content-Type: application/json

{
  "messages": [{ "role": "user", "content": "..." }],
  "config": { "model": "gpt-4o", "temperature": 0.7 }
}
```

### SSE Streaming

```
POST /api/chat/completions
Accept: text/event-stream

Events:
  event: delta    — streaming token
  event: tool_call  — tool invocation
  event: done    — completion
  event: error   — error
```

### Events

```
GET /api/events                          # List events
POST /api/events                         # Publish event
GET /api/events/stream                   # SSE stream of events
```

### Health

```
GET /health                              # Health check (all components)
GET /health/process                      # Process health
GET /health/memory                       # Memory usage
GET /health/event-bus                    # Event bus health
```

### Metrics

```
GET /metrics                             # Prometheus metrics
```

### DAP (Debug)

```
WebSocket /dap                           # Debug Adapter Protocol
```

## Package API

```typescript
import { AgentRuntime } from '@ideia/agent-runtime';
import { EventBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import { PolicyEngine } from '@ideia/policy-engine';
import { CacheLayer } from '@ideia/cache';
import { OpenTelemetry, getTelemetry } from '@ideia/telemetry';
import { SafetyRouter } from '@ideia/llm-provider';
import { JailbreakDetector, BiasDetector } from '@ideia/cli';
import { BrowserAgent } from '@ideia/browser-agent';
import { SurfaceRouter } from '@ideia/multi-surface';
```
