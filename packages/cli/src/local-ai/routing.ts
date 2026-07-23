import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

/** Interface que define a estrutura de route config. */
export interface RouteConfig {
  model: string;
  allow_write: boolean;
  timeout_secs: number;
}

/** Interface que define a estrutura de routing config. */
export interface RoutingConfig {
  classify_task: RouteConfig;
  summarize_file: RouteConfig;
  generate_code: { enabled: false };
  explain_violation: RouteConfig;
  suggest_context: RouteConfig;
  extract_entities: RouteConfig;
}

const DEFAULT_ROUTING: RoutingConfig = {
  classify_task: { model: 'local-small', allow_write: false, timeout_secs: 30 },
  summarize_file: { model: 'local-small', allow_write: false, timeout_secs: 30 },
  generate_code: { enabled: false },
  explain_violation: { model: 'local-small', allow_write: false, timeout_secs: 30 },
  suggest_context: { model: 'local-small', allow_write: false, timeout_secs: 30 },
  extract_entities: { model: 'local-small', allow_write: false, timeout_secs: 30 },
};

const ROUTING_PATH = '.ai/local-ai/routing.yaml';

/**
 * Carrega routing.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function loadRouting(root: string): RoutingConfig {
  const filePath = path.join(root, ROUTING_PATH);
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, YAML.stringify(DEFAULT_ROUTING));
    return DEFAULT_ROUTING;
  }
  try {
    const data = YAML.parse(fs.readFileSync(filePath, 'utf8')) as RoutingConfig;
    return { ...DEFAULT_ROUTING, ...data };
  } catch {
    return DEFAULT_ROUTING;
  }
}

/**
 * Obtém route for.
 * @param key - Valor key.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function getRouteFor(key: string, root: string): RouteConfig | { enabled: false } | null {
  const routing = loadRouting(root);
  const k = key as keyof RoutingConfig;
  if (k in routing) return routing[k];
  return null;
}
