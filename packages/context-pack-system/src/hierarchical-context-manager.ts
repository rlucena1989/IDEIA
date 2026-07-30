import { ContextPack, HierarchicalPackNode, HierarchicalContextConfig, MergedContextPack, HierarchyLevel } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('hierarchical-context-manager');

export class HierarchicalContextManager {
  private _hierarchy: Map<string, HierarchicalPackNode[]> = new Map();
  private _config: HierarchicalContextConfig;

  constructor(config: Partial<HierarchicalContextConfig> = {}) {
    this._config = {
      mergeStrategy: 'most_specific',
      allowOverrideSections: true,
      allowOverrideVariables: true,
      maxDepth: 4,
      ...config,
    };
  }

  register(
    pack: ContextPack,
    level: HierarchyLevel,
    parent?: ContextPack
  ): void {
    if (!this._hierarchy.has(pack.name)) {
      this._hierarchy.set(pack.name, []);
    }
    const priorityMap: Record<HierarchyLevel, number> = {
      project: 0,
      team: 1,
      personal: 2,
      task: 3,
    };
    const node: HierarchicalPackNode = {
      pack,
      level,
      priority: priorityMap[level],
      inherited: false,
      parent: parent ? this._findNode(parent.name, parent.version) : undefined,
    };
    const nodes = this._hierarchy.get(pack.name);
    if (nodes) {
      nodes.push(node);
      nodes.sort((a, b) => b.priority - a.priority);
    }
  }

  private _findNode(
    name: string,
    version: string
  ): HierarchicalPackNode | undefined {
    const nodes = this._hierarchy.get(name);
    return nodes?.find(n => n.pack.version === version);
  }

  resolve(packName: string, baseVersion: string = 'latest'): MergedContextPack {
    const nodes = this._hierarchy.get(packName);
    if (!nodes || nodes.length === 0) {
      throw new Error(`Pack "${packName}" not found in hierarchy`);
    }

    const baseNode =
      nodes.find(n => n.pack.version === baseVersion) ||
      nodes[nodes.length - 1];
    const effectiveNodes: HierarchicalPackNode[] = [baseNode];

    const visited = new Set<string>();
    let current: HierarchicalPackNode | undefined = baseNode;
    while (current.parent && effectiveNodes.length < this._config.maxDepth) {
      const parentKey = `${current.parent.pack.name}@${current.parent.pack.version}`;
      if (visited.has(parentKey)) break;
      visited.add(parentKey);
      effectiveNodes.push(current.parent);
      current = current.parent;
    }

    effectiveNodes.reverse();

    const hierarchyInfo = effectiveNodes.map(n => ({
      name: n.pack.name,
      version: n.pack.version,
      level: n.level,
    }));

    const mergeWarnings: string[] = [];

    const mergedSections = new Map<string, ContextPack['sections'][0]>();
    const seenSectionIds = new Set<string>();

    for (const node of effectiveNodes) {
      for (const section of node.pack.sections) {
        if (!seenSectionIds.has(section.id)) {
          mergedSections.set(section.id, { ...section });
          seenSectionIds.add(section.id);
        } else if (this._config.allowOverrideSections) {
          const newPriority = this._priorityFromLevel(node.level);
          const existing = mergedSections.get(section.id);
          if (existing) {
            const existingPriority = this._priorityFromLevel(
              effectiveNodes.find(en =>
                en.pack.sections.some(s => s.id === section.id)
              )?.level || node.level
            );
            if (newPriority >= existingPriority) {
              mergeWarnings.push(
                `Section "${section.id}" overridden by ${node.pack.name}@${node.level}`
              );
              mergedSections.set(section.id, { ...section });
            }
          }
        }
      }
    }

    const mergedVariables = new Map<string, ContextPack['variables'][0]>();
    for (const node of effectiveNodes) {
      for (const variable of node.pack.variables || []) {
        const existing = mergedVariables.get(variable.name);
        if (!existing) {
          mergedVariables.set(variable.name, { ...variable });
        } else if (this._config.allowOverrideVariables) {
          if (variable.required || !existing.required) {
            mergedVariables.set(variable.name, { ...variable });
          }
        }
      }
    }

    const allSlicing: ContextPack['slicing'] = [];
    const seenSlicing = new Set<number>();
    for (const node of effectiveNodes) {
      for (const rule of node.pack.slicing || []) {
        if (!seenSlicing.has(rule.maxTokens)) {
          allSlicing.push(rule);
          seenSlicing.add(rule.maxTokens);
        }
      }
    }

    const allDeps = new Map<string, ContextPack['dependencies'][0]>();
    for (const node of effectiveNodes) {
      for (const dep of node.pack.dependencies || []) {
        if (!allDeps.has(dep.pack)) {
          allDeps.set(dep.pack, dep);
        }
      }
    }

    const allTags = new Set<string>();
    for (const node of effectiveNodes) {
      for (const tag of node.pack.tags || []) allTags.add(tag);
    }

    const allCategories = new Set<string>();
    for (const node of effectiveNodes) {
      for (const cat of node.pack.categories || []) allCategories.add(cat);
    }

    const totalTokens = Array.from(mergedSections.values()).reduce(
      (s, sec) => s + Math.ceil((sec.content?.length || 0) / 4),
      0
    );

    const merged: MergedContextPack = {
      name: packName,
      version: `${baseNode.pack.version}-hierarchical`,
      displayName: `${baseNode.pack.displayName || packName} (Hierarchical)`,
      description: `Hierarchical merge of ${effectiveNodes
        .map(n => `${n.pack.name}@${n.level}`)
        .join(' → ')}`,
      tags: Array.from(allTags),
      categories: Array.from(allCategories),
      level: effectiveNodes[0]?.pack.level || 'intermediate',
      variables: Array.from(mergedVariables.values()),
      sections: Array.from(mergedSections.values()),
      dependencies: Array.from(allDeps.values()),
      slicing: allSlicing,
      hooks: [],
      examples: [],
      totalTokens,
      hierarchy: hierarchyInfo,
      mergeWarnings,
    };

    return merged;
  }

  private _priorityFromLevel(level: HierarchyLevel): number {
    const map: Record<HierarchyLevel, number> = {
      project: 0,
      team: 1,
      personal: 2,
      task: 3,
    };
    return map[level] ?? 0;
  }

  async walkHierarchy(
    packName: string,
    callback: (node: HierarchicalPackNode, depth: number) => Promise<void>
  ): Promise<void> {
    const nodes = this._hierarchy.get(packName);
    if (!nodes) return;

    const visited = new Set<string>();
    const queue: { node: HierarchicalPackNode; depth: number }[] = [];

    for (const n of nodes) queue.push({ node: n, depth: 0 });

    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) continue;
      const { node, depth } = item;
      const key = `${node.pack.name}@${node.pack.version}`;
      if (visited.has(key)) continue;
      visited.add(key);

      await callback(node, depth);

      if (node.parent && depth < this._config.maxDepth) {
        queue.push({ node: node.parent, depth: depth + 1 });
      }
    }
  }
}
