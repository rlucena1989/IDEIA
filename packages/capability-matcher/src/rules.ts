export const KEYWORD_TO_CAPABILITY: Record<string, string[]> = {
  authentication: ['auth-service', 'jwt-handler', 'session-manager'],
  authorization: ['rbac-engine', 'permission-checker', 'policy-enforcer'],
  api: ['rest-builder', 'api-gateway', 'endpoint-generator'],
  crud: ['crud-generator', 'entity-manager', 'repository-pattern'],
  database: ['schema-designer', 'query-optimizer', 'migration-runner'],
  cache: ['cache-layer', 'redis-integration', 'ttl-manager'],
  queue: ['message-broker', 'job-scheduler', 'event-publisher'],
  email: ['mail-service', 'template-renderer', 'smtp-client'],
  notification: ['push-service', 'websocket-hub', 'alert-manager'],
  search: ['search-indexer', 'fulltext-engine', 'filter-builder'],
  analytics: ['analytics-collector', 'dashboard-builder', 'metric-tracker'],
  logging: ['structured-logger', 'log-aggregator', 'audit-trail'],
  monitoring: ['health-checker', 'metrics-exporter', 'alert-rules'],
  testing: ['test-runner', 'mock-generator', 'coverage-reporter'],
  deploy: ['deployment-pipeline', 'container-builder', 'release-manager'],
  security: ['vulnerability-scanner', 'policy-validator', 'secret-manager'],
  docker: ['container-builder', 'docker-compose-gen', 'image-optimizer'],
  kubernetes: ['k8s-manifest-gen', 'helm-chart-gen', 'cluster-manager'],
  ci: ['ci-pipeline', 'github-actions-gen', 'gitlab-ci-gen'],
  cd: ['cd-pipeline', 'rollback-manager', 'canary-deployer'],
  documentation: ['api-docs-gen', 'readme-generator', 'wiki-builder'],
  migration: ['schema-migrator', 'data-migrator', 'adapter-builder'],
};

export const TECHNOLOGY_TO_AGENT: Record<string, string> = {
  typescript: 'Programmer',
  javascript: 'Programmer',
  python: 'Programmer',
  java: 'Programmer',
  rust: 'Programmer',
  go: 'Programmer',
  react: 'Architect',
  angular: 'Architect',
  vue: 'Architect',
  node: 'DevOps',
  docker: 'DevOps',
  kubernetes: 'DevOps',
  postgresql: 'Tester',
  mongodb: 'Tester',
  redis: 'Tester',
  jest: 'Tester',
  cypress: 'Tester',
  eslint: 'Reviewer',
  prettier: 'Reviewer',
  sonarqube: 'Reviewer',
};

export const DOMAIN_TO_WORKFLOW: Record<string, string> = {
  web: 'zero-to-deploy',
  mobile: 'zero-to-deploy',
  api: 'zero-to-deploy',
  backend: 'zero-to-deploy',
  frontend: 'zero-to-deploy',
  data: 'migration',
  ml: 'migration',
  devops: 'deploy',
  security: 'security',
  blockchain: 'migration',
  iot: 'zero-to-deploy',
};

export const COMPLEXITY_TO_CONTEXT_DEPTH: Record<string, number> = {
  simple: 1,
  moderate: 2,
  complex: 3,
};

export const AUTO_INCLUSION_RULES: string[] = [
  'ideia-introduction',
  'ideia-core',
];
