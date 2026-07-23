export interface PublicationTarget {
  kind: 'cli' | 'extension' | 'file' | 'json';
  path?: string;
  channel?: string;
}

export interface PublicationPayload {
  title: string;
  summary: string;
  content: string;
  metadata: Record<string, string | number | boolean>;
}

export interface PublicationPlan {
  target: PublicationTarget;
  payload: PublicationPayload;
  validated: boolean;
}

export interface PublicationResult {
  plan: PublicationPlan;
  publishedAt: string;
  ok: boolean;
  target: string;
}
