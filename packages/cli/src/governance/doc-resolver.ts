import { DOCUMENT_REGISTRY, DocumentRegistryEntry } from './document-registry';

export interface ResolvedDocument {
  primary: DocumentRegistryEntry | null;
  fallbacks: DocumentRegistryEntry[];
  reason: string;
  blocked: boolean;
}

export function resolveDocument(taskType: string): ResolvedDocument {
  const exact = DOCUMENT_REGISTRY.find(doc => doc.id === taskType && doc.active);
  const byTag = !exact
    ? DOCUMENT_REGISTRY.find(doc => doc.tags.includes(taskType) && doc.active)
    : undefined;

  const primary = exact || byTag || null;

  const fallbacks = DOCUMENT_REGISTRY
    .filter(doc => doc.active && doc !== primary)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);

  if (primary) {
    return {
      primary,
      fallbacks,
      reason: `Primary document resolved for task type "${taskType}": ${primary.id} (${primary.path})`,
      blocked: false,
    };
  }

  return {
    primary: null,
    fallbacks,
    reason: `No specific document found for task type "${taskType}". Using fallbacks by priority.`,
    blocked: true,
  };
}

export function resolveByTags(tags: string[]): ResolvedDocument {
  const matches = DOCUMENT_REGISTRY
    .filter(doc => doc.active && tags.some(t => doc.tags.includes(t)))
    .sort((a, b) => b.priority - a.priority);

  const primary = matches[0] || null;
  const fallbacks = matches.slice(1, 4);

  if (primary) {
    return {
      primary,
      fallbacks,
      reason: `Resolved by tags [${tags.join(', ')}]: ${primary.id}`,
      blocked: false,
    };
  }

  return {
    primary: null,
    fallbacks: [],
    reason: `No document matches tags [${tags.join(', ')}]`,
    blocked: true,
  };
}
