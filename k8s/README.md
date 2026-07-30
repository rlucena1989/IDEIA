# Kubernetes Manifests for IDEIA

This directory contains Kubernetes manifests for deploying IDEIA across environments.

## Environments

- **ideia**: Production namespace
- **ideia-staging**: Staging namespace
- **ideia-dev**: Development namespace

## Components

### Core Services
- `ideia-backend`: Main backend service with HPA (3-10 replicas)
- `ideia-postgres`: PostgreSQL with pgvector extension
- `ideia-nats`: NATS JetStream messaging (3 replicas)

### Infrastructure
- `namespace.yaml`: Namespace definitions
- `configmap.yaml`: Configuration per environment
- `deployment.yaml`: Backend deployment with HPA
- `service.yaml`: Services and Ingress
- `postgres.yaml`: PostgreSQL StatefulSet
- `nats.yaml`: NATS JetStream StatefulSet
- `poddisruptionbudget.yaml`: PDB for high availability

## Deployment

### Apply to Production
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/postgres.yaml -n ideia
kubectl apply -f k8s/nats.yaml -n ideia
kubectl apply -f k8s/deployment.yaml -n ideia
kubectl apply -f k8s/service.yaml -n ideia
kubectl apply -f k8s/poddisruptionbudget.yaml -n ideia
```

### Apply to Staging
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/postgres.yaml -n ideia-staging
kubectl apply -f k8s/nats.yaml -n ideia-staging
kubectl apply -f k8s/deployment.yaml -n ideia-staging
kubectl apply -f k8s/service.yaml -n ideia-staging
kubectl apply -f k8s/poddisruptionbudget.yaml -n ideia-staging
```

## Horizontal Pod Autoscaler

The backend deployment is configured with HPA:
- **Min replicas**: 3
- **Max replicas**: 10
- **CPU target**: 70% utilization
- **Memory target**: 80% utilization
- **Scale down**: 50% every 60s (after 300s stabilization)
- **Scale up**: 100% or 2 pods every 30s

## High Availability

- **Pod Anti-Affinity**: Pods spread across nodes
- **Pod Disruption Budget**: Minimum 2 pods available during maintenance
- **Rolling Update**: Max surge 1, max unavailable 0
- **Health Checks**: Liveness and readiness probes configured

## Secrets Management

Before deploying, create secrets:
```bash
kubectl create secret generic ideia-secrets \
  --from-literal=postgres-password=YOUR_PASSWORD \
  -n ideia
```

## Monitoring

All pods are configured for Prometheus scraping:
- Backend: `/metrics` on port 3001
- NATS: Monitoring on port 8222
- PostgreSQL: Exporter sidecar (add as needed)
