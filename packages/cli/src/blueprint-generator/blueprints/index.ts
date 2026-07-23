import type { BlueprintManifest } from '../types';
import nodeApiBlueprint from './node-api.yaml';
import nextFullstackBlueprint from './next-fullstack.yaml';

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
    const value: unknown = content.slice(colonIdx + 1).trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const currentObj = stack[stack.length - 1].obj;

    if (value === '' || value === '|') {
      const newObj: Record<string, unknown> = {};
      currentObj[key] = newObj;
      stack.push({ indent, key, obj: newObj });
    } else if (value.startsWith('- ')) {
      const arr = value.slice(2).trim();
      if (!currentObj[key]) currentObj[key] = [];
      (currentObj[key] as unknown[]).push(arr);
    } else if (value.startsWith('[') && value.endsWith(']')) {
      currentObj[key] = value.slice(1, -1).split(',').map(s => s.trim().replace(/['"]/g, ''));
    } else if (value === 'true') {
      currentObj[key] = true;
    } else if (value === 'false') {
      currentObj[key] = false;
    } else if (/^\d+$/.test(value)) {
      currentObj[key] = parseInt(value as string, 10);
    } else if (/^\d+\.\d+$/.test(value as string)) {
      currentObj[key] = parseFloat(value as string);
    } else {
      currentObj[key] = (value as string).replace(/^['"]|['"]$/g, '');
    }
  }

  return obj;
}

function loadBlueprint(yamlContent: string): BlueprintManifest {
  const raw = parseYamlBasic(yamlContent) as BlueprintManifest;
  return raw;
}

const nodeApi = loadBlueprint(nodeApiBlueprint);
const nextFullstack = loadBlueprint(nextFullstackBlueprint);

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
