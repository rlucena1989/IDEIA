import { SchemaDefinition, BreakingChange, ExtendedCompatibilityReport } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('schema-compatibility-checker');

export class SchemaCompatibilityChecker {
  extendedCheck(oldSchema: SchemaDefinition, newSchema: SchemaDefinition): ExtendedCompatibilityReport {
    const backward = this._isBackwardCompatibleStrict(oldSchema, newSchema);
    const forward = this._isForwardCompatibleStrict(oldSchema, newSchema);
    const breakingChanges = this._detectAllBreaking(oldSchema, newSchema);

    const backwardScore = this._scoreCompatibility(backward, 'backward');
    const forwardScore = this._scoreCompatibility(forward, 'forward');
    const overallScore = Math.min(backwardScore + forwardScore, 100);

    return {
      overall: backward && forward ? 'FULL' : backward ? 'BACKWARD' : forward ? 'FORWARD' : 'NONE',
      backward: { compatible: backward, score: backwardScore, details: this._backwardDetails(oldSchema, newSchema) },
      forward: { compatible: forward, score: forwardScore, details: this._forwardDetails(oldSchema, newSchema) },
      breakingChanges,
      overallScore,
      recommendation: overallScore >= 90 ? 'safe' : overallScore >= 70 ? 'caution' : 'breaking',
      upgradeDifficulty: breakingChanges.length === 0 ? 'none' : breakingChanges.some(b => b.severity === 'high') ? 'high' : 'medium',
    };
  }

  private _isBackwardCompatibleStrict(oldS: SchemaDefinition, newS: SchemaDefinition): boolean {
    for (const nf of newS.fields) {
      const of = oldS.fields.find(f => f.name === nf.name);
      if (!of) {
        if (nf.required && nf.defaultValue === undefined) return false;
        continue;
      }
      if (nf.type !== of.type) return false;
      if (nf.required && !of.required) return false;
    }
    for (const of of oldS.fields) {
      if (!newS.fields.find(f => f.name === of.name)) return false;
    }
    return true;
  }

  private _isForwardCompatibleStrict(oldS: SchemaDefinition, newS: SchemaDefinition): boolean {
    for (const of of oldS.fields) {
      const nf = newS.fields.find(f => f.name === of.name);
      if (!nf) continue;
      if (nf.type !== of.type) return false;
    }
    for (const nf of newS.fields) {
      const of = oldS.fields.find(f => f.name === nf.name);
      if (!of && nf.required && nf.defaultValue === undefined) return false;
    }
    return true;
  }

  private _detectAllBreaking(oldS: SchemaDefinition, newS: SchemaDefinition): BreakingChange[] {
    const changes: BreakingChange[] = [];
    for (const of of oldS.fields) {
      const nf = newS.fields.find(f => f.name === of.name);
      if (!nf) {
        changes.push({ type: 'field_removed', field: of.name, description: `Field '${of.name}' removed`, severity: 'high' });
      } else if (nf.type !== of.type) {
        changes.push({ type: 'type_changed', field: of.name, description: `Field '${of.name}' ${of.type}→${nf.type}`, severity: 'high' });
      } else if (nf.required && !of.required) {
        changes.push({ type: 'required_added', field: of.name, description: `Field '${of.name}' now required`, severity: 'medium' });
      }
    }
    for (const nf of newS.fields) {
      if (!oldS.fields.find(f => f.name === nf.name) && nf.required && nf.defaultValue === undefined) {
        changes.push({ type: 'default_removed', field: nf.name, description: `New field '${nf.name}' has no default`, severity: 'medium' });
      }
    }
    return changes;
  }

  private _scoreCompatibility(compatible: boolean, _type: string): number {
    if (compatible) return _type === 'backward' ? 60 : 40;
    return 0;
  }

  private _backwardDetails(oldS: SchemaDefinition, newS: SchemaDefinition): string[] {
    const details: string[] = [];
    for (const nf of newS.fields) {
      const of = oldS.fields.find(f => f.name === nf.name);
      if (!of) details.push(`New field '${nf.name}' added ${nf.required ? 'without default' : 'with default'}`);
    }
    return details;
  }

  private _forwardDetails(oldS: SchemaDefinition, newS: SchemaDefinition): string[] {
    const details: string[] = [];
    for (const of of oldS.fields) {
      if (!newS.fields.find(f => f.name === of.name)) details.push(`Field '${of.name}' removed in new schema`);
    }
    return details;
  }
}
