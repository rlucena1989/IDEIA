import { spawnSync } from 'node:child_process';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import { LoadedPlugin } from './loader';

/** Tipo que define hook name. */
export type HookName = 'onLoad' | 'onVerify' | 'onAudit' | 'onScaffold';

/** Interface que define a estrutura de hook result. */
export interface HookResult {
  plugin: string;
  hook: HookName;
  success: boolean;
  output?: string;
  error?: string;
}

function runHookScript(pluginDir: string, script: string, context: Record<string, string>): HookResult {
  const scriptPath = path.resolve(pluginDir, script);
  if (!scriptPath.startsWith(path.resolve(pluginDir))) {
    return {
      plugin: path.basename(pluginDir),
      hook: 'onVerify' as HookName,
      success: false,
      error: `Hook script ${script} esta fora do diretorio do plugin`
    };
  }

  const env = { ...process.env, ...context };
  const result = spawnSync(process.execPath, [scriptPath], { env, encoding: 'utf8', timeout: 30000 });

  return {
    plugin: path.basename(pluginDir),
    hook: 'onVerify' as HookName,
    success: result.status === 0,
    output: result.stdout?.slice(0, 1000),
    error: result.stderr?.slice(0, 1000) || (result.status !== 0 ? `exit code ${result.status}` : undefined)
  };
}

/**
 * Executa plugin hook.
 * @param plugin - Valor plugin.
 * @param hook - Valor hook.
 * @param context - Valor context.
 * @returns O resultado da operação.
 */
export function runPluginHook(
  plugin: LoadedPlugin,
  hook: HookName,
  context: Record<string, string> = {}
): HookResult | null {
  const script = plugin.manifest.hooks?.[hook];
  if (!script) return null;
  return runHookScript(plugin.dir, script, context);
}

/**
 * Executa all hooks.
 * @param plugins - Valor plugins.
 * @param hook - Valor hook.
 * @param context - Valor context.
 * @returns O resultado da operação.
 */
export function runAllHooks(
  plugins: LoadedPlugin[],
  hook: HookName,
  context: Record<string, string> = {}
): HookResult[] {
  return plugins
    .map(p => runPluginHook(p, hook, context))
    .filter((r): r is HookResult => r !== null);
}
