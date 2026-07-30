import { ExtensionManifest, ExtensionContribution } from './types';
import { createLogger } from '@ideia/logger';
import { z } from 'zod';

const ExtensionManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  engineVersion: z.string(),
  contributes: z.array(z.object({
    type: z.string(),
    value: z.unknown(),
  })).optional(),
  activationEvents: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
});

export class ExtensionManifestParser {
  parse(raw: string): ExtensionManifest {
    const data = JSON.parse(raw);
    return ExtensionManifestSchema.parse(data) as ExtensionManifest;
  }

  validate(raw: string): boolean {
    try {
      const data = JSON.parse(raw);
      ExtensionManifestSchema.parse(data);
      return true;
    } catch {
      return false;
    }
  }
}
