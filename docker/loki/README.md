# Structured Logging with Loki

This directory contains the Loki + Promtail + Grafana stack for structured logging.

## Components

- **Loki**: Log aggregation system (lightweight alternative to ELK)
- **Promtail**: Log agent for collecting logs
- **Grafana**: Visualization and query interface

## Quick Start

```bash
cd docker/loki
docker-compose up -d
```

Access Grafana at http://localhost:3000 (admin/admin)

## Configuration

### Loki Configuration
- Retention: 7 days (168h)
- Ingestion rate: 16MB/s
- Storage: filesystem

### Promtail Configuration
- Docker container logs
- System logs
- IDEIA application logs (JSON format)

### Log Format

IDEIA applications should log in JSON format:
```json
{
  "level": "info",
  "message": "User logged in",
  "timestamp": "2024-01-01T00:00:00Z",
  "service": "auth-service",
  "trace_id": "abc123",
  "span_id": "def456",
  "user_id": "user-123"
}
```

## LogQL Queries

### All logs from a service
```
{job="ideia-app", service="auth-service"}
```

### Error logs only
```
{job="ideia-app", level="error"}
```

### Logs with specific trace ID
```
{job="ideia-app"} |= `trace_id=abc123`
```

### Rate of logs by level
```
sum(rate({job="ideia-app"} |= `` [5m])) by (level)
```

### Error count over time
```
sum(count_over_time({job="ideia-app", level="error"} [5m]))
```

## Integration with IDEIA

Add to `packages/*/src/logger.ts`:
```typescript
import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  },
  timestamp: pino.stdTimeFunctions.isoTime
})

export default logger
```

Set environment variables:
```bash
LOG_LEVEL=debug
LOG_FORMAT=json
```

## Kubernetes Deployment

See `k8s/loki.yaml` for Kubernetes manifests.

## Monitoring

- Loki metrics: http://localhost:3100/metrics
- Grafana dashboards: Pre-configured for IDEIA logs
- Alert rules: Configure in Loki ruler

## Maintenance

### Backup logs
```bash
docker cp ideia-loki:/loki ./backup-loki
```

### Clear old logs
```bash
docker exec ideia-loki loki-cli clean --retention=168h
```

### View logs
```bash
docker-compose logs -f loki
docker-compose logs -f promtail
```

## Troubleshooting

### Logs not appearing
- Check Promtail is running: `docker-compose ps`
- Verify Promtail config: `docker exec ideia-promtail promtail -config.file=/etc/promtail/config.yml -dry-run`
- Check Loki is accessible: `curl http://localhost:3100/ready`

### High memory usage
- Reduce retention period in `loki-config.yaml`
- Limit ingestion rate in `limits_config`
- Add more memory to Loki container
