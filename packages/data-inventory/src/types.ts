import { z } from 'zod';
import { createLogger } from '@ideia/logger';
const logger = createLogger('types');

export const DataAssetTypeSchema = z.enum(['personal', 'sensitive', 'confidential', 'public']);
export type DataAssetType = z.infer<typeof DataAssetTypeSchema>;

export const DataAssetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: DataAssetTypeSchema,
  location: z.string().min(1),
  retentionDays: z.number().int().positive(),
  owner: z.string().min(1),
  description: z.string().default(''),
  tags: z.array(z.string()).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type DataAsset = z.infer<typeof DataAssetSchema>;

export type DataInventoryReport = {
  totalAssets: number;
  byType: Record<DataAssetType, number>;
  unclassified: number;
  staleAssets: number;
};

export type DataInventoryConfig = {
  autoScan: boolean;
  scanIntervalMs: number;
  alertOnStaleDays: number;
};
