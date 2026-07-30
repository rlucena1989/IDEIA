import type { BlueprintManifest } from '../types';
import { createLogger } from '@ideia/logger';
import nodeApiBlueprint from './node-api.yaml';
import nextFullstackBlueprint from './next-fullstack.yaml';
const logger = createLogger('index');

function parseYamlBasic(yaml: string): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  const lines = yaml.split('\n');
  const stack: { indent: number; key: string; obj: Record<string, unknown> }[] = [
    { indent: -1, key: 'root', obj },
  ];

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const indent = line.search(/\S/);
    const content = line.trim();
    const colonIdx = content.indexOf(':');

    if (colonIdx === -1) continue;

    const key = content.slice(0, colonIdx).trim();
    const valueRaw = content.slice(colonIdx + 1).trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const currentObj = stack[stack.length - 1].obj;

    if (valueRaw === '' || valueRaw === '|') {
      const newObj: Record<string, unknown> = {};
      currentObj[key] = newObj;
      stack.push({ indent, key, obj: newObj });
    } else if (valueRaw.startsWith('- ')) {
      const arrItem = valueRaw.slice(2).trim();
      if (!currentObj[key]) currentObj[key] = [];
      (currentObj[key] as unknown[]).push(arrItem);
    } else if (valueRaw.startsWith('[') && valueRaw.endsWith(']')) {
      currentObj[key] = valueRaw.slice(1, -1).split(',').map((s: string) => s.trim().replace(/['"]/g, ''));
    } else if (valueRaw === 'true') {
      currentObj[key] = true;
    } else if (valueRaw === 'false') {
      currentObj[key] = false;
    } else if (/^\d+$/.test(valueRaw)) {
      currentObj[key] = parseInt(valueRaw, 10);
    } else if (/^\d+\.\d+$/.test(valueRaw)) {
      currentObj[key] = parseFloat(valueRaw);
    } else {
      currentObj[key] = valueRaw.replace(/^['"]|['"]$/g, '');
    }
  }

  return obj;
}

function loadBlueprint(yamlContent: string | Record<string, unknown>): BlueprintManifest {
  const raw = typeof yamlContent === "string" ? parseYamlBasic(yamlContent) : yamlContent as unknown as BlueprintManifest;
  return raw as BlueprintManifest;
}

const nodeApi = loadBlueprint(nodeApiBlueprint );
const nextFullstack = loadBlueprint(nextFullstackBlueprint );

export const builtInBlueprints: Record<string, BlueprintManifest> = {
  'node-api': nodeApi,
  'next-fullstack': nextFullstack,
};

export function getBlueprint(name: string): BlueprintManifest | undefined {
  return builtInBlueprints[name];
}

export function listBlueprints(): { name: string; description: string; tags: string[]; version: string }[] {
  return Object.entries(builtInBlueprints).map(([name, bp]) => ({
    name,
    description: bp.description,
    tags: bp.tags || [],
    version: bp.version,
  }));
}



