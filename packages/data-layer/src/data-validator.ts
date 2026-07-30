import { z } from 'zod';
import { createLogger } from '@ideia/logger';
const logger = createLogger('data-validator');

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult<T = unknown> {
  valid: boolean;
  data?: T;
  errors: ValidationError[];
}

export interface QuarantineRecord {
  id: string;
  dataType: string;
  data: unknown;
  errors: ValidationError[];
  timestamp: string;
  source: string;
  resolvedAt: string | null;
  resolution: 'fixed' | 'deleted' | 'ignored' | null;
}

export interface RepairReport {
  repaired: number;
  failed: number;
  skipped: number;
}

export interface DataQualityMetrics {
  completeness: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
  uniqueness: number;
  validity: number;
  overall: number;
}

export class DataValidator {
  private schemas = new Map<string, z.ZodSchema>();
  private quarantine: QuarantineRecord[] = [];
  private maxQuarantine = 1000;

  registerSchema(dataType: string, schema: z.ZodSchema): void {
    this.schemas.set(dataType, schema);
  }

  validate<T>(dataType: string, data: unknown): ValidationResult<T> {
    const schema = this.schemas.get(dataType);
    if (!schema) {
      return { valid: false, errors: [{ path: '', message: `No schema registered for type: ${dataType}` }] };
    }

    const result = schema.safeParse(data);

    if (!result.success) {
      const errors: ValidationError[] = result.error.issues.map(i => ({
        path: i.path.join('.'),
        message: i.message,
      }));

      this.addToQuarantine(dataType, data, errors);
      return { valid: false, errors };
    }

    return { valid: true, data: result.data as T, errors: [] };
  }

  private addToQuarantine(dataType: string, data: unknown, errors: ValidationError[]): void {
    const record: QuarantineRecord = {
      id: crypto.randomUUID(),
      dataType,
      data,
      errors,
      timestamp: new Date().toISOString(),
      source: 'validation',
      resolvedAt: null,
      resolution: null,
    };
    this.quarantine.push(record);
    if (this.quarantine.length > this.maxQuarantine) {
      this.quarantine.shift();
    }
  }

  getQuarantine(filters?: { dataType?: string; unresolved?: boolean }): QuarantineRecord[] {
    let results = [...this.quarantine];
    if (filters?.dataType) results = results.filter(r => r.dataType === filters.dataType);
    if (filters?.unresolved) results = results.filter(r => r.resolvedAt === null);
    return results;
  }

  resolveQuarantine(id: string, resolution: QuarantineRecord['resolution'], fix?: unknown): boolean {
    const record = this.quarantine.find(r => r.id === id);
    if (!record) return false;
    record.resolvedAt = new Date().toISOString();
    record.resolution = resolution;
    if (fix !== undefined) record.data = fix;
    return true;
  }

  async autoRepair(dataType: string): Promise<RepairReport> {
    const records = this.quarantine.filter(r => r.dataType === dataType && r.resolvedAt === null);
    const report: RepairReport = { repaired: 0, failed: 0, skipped: 0 };

    for (const record of records) {
      try {
        const schema = this.schemas.get(dataType);
        if (!schema) { report.skipped++; continue; }

        const repaired = this.tryRepair(schema, record.data);
        if (repaired !== null) {
          this.resolveQuarantine(record.id, 'fixed', repaired);
          report.repaired++;
        } else {
          report.failed++;
        }
      } catch {
        report.skipped++;
      }
    }

    return report;
  }

  private tryRepair(schema: z.ZodSchema, data: unknown): unknown | null {
    if (typeof data !== 'object' || data === null) return null;

    const obj = data as Record<string, unknown>;
    const repaired: Record<string, unknown> = {};

    if (schema instanceof z.ZodObject) {
      const shape = schema.shape as Record<string, z.ZodTypeAny>;
      let changed = false;

      for (const [key, fieldSchema] of Object.entries(shape)) {
        const value = obj[key];

        if (value === undefined) {
          if (fieldSchema instanceof z.ZodDefault) {
            repaired[key] = fieldSchema._def.defaultValue();
            changed = true;
          } else if (fieldSchema.isNullable()) {
            repaired[key] = null;
            changed = true;
          }
        } else {
          const result = fieldSchema.safeParse(value);
          if (result.success) {
            repaired[key] = result.data;
          } else {
            if (fieldSchema instanceof z.ZodString && typeof value === 'number') {
              repaired[key] = String(value);
              changed = true;
            } else if (fieldSchema instanceof z.ZodNumber && typeof value === 'string') {
              const num = Number(value);
              if (!isNaN(num)) { repaired[key] = num; changed = true; }
            } else if (fieldSchema instanceof z.ZodArray && !Array.isArray(value)) {
              repaired[key] = [value];
              changed = true;
            } else {
              return null;
            }
          }
        }
      }

      if (changed) return schema.safeParse(repaired).success ? repaired : null;
    }

    return null;
  }

  calculateQualityMetrics(entries: Array<{
    completeness: number;
    accuracy: number;
    timeliness: number;
    uniqueness?: boolean;
    valid: boolean;
  }>): DataQualityMetrics {
    if (entries.length === 0) {
      return { completeness: 0, accuracy: 0, consistency: 0, timeliness: 0, uniqueness: 0, validity: 0, overall: 0 };
    }

    const completeness = entries.reduce((s, e) => s + e.completeness, 0) / entries.length;
    const accuracy = entries.reduce((s, e) => s + e.accuracy, 0) / entries.length;
    const validity = entries.filter(e => e.valid).length / entries.length * 100;
    const timeliness = entries.reduce((s, e) => s + e.timeliness, 0) / entries.length;
    const uniqueness = entries.filter(e => e.uniqueness !== false).length / entries.length * 100;

    const consistency = Math.min(100, (completeness + accuracy + validity) / 3);
    const overall = Math.round(
      completeness * 0.25 + accuracy * 0.25 + consistency * 0.2 + timeliness * 0.15 + uniqueness * 0.1 + validity * 0.05
    );

    return {
      completeness: Math.round(completeness * 10) / 10,
      accuracy: Math.round(accuracy * 10) / 10,
      consistency: Math.round(consistency * 10) / 10,
      timeliness: Math.round(timeliness * 10) / 10,
      uniqueness: Math.round(uniqueness * 10) / 10,
      validity: Math.round(validity * 10) / 10,
      overall,
    };
  }
}

export function createDataValidator(): DataValidator {
  return new DataValidator();
}
