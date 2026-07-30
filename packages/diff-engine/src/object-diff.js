"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepDiff = deepDiff;
exports.diffSpecs = diffSpecs;
const node_fs_1 = __importDefault(require("node:fs"));
const logger_1 = require("@ideia/logger");
const node_path_1 = __importDefault(require("node:path"));
const yaml_1 = require("yaml");
const logger = (0, logger_1.createLogger)('object-diff');
function loadSpec(filePath) {
    const ext = node_path_1.default.extname(filePath).toLowerCase();
    const raw = node_fs_1.default.readFileSync(filePath, 'utf-8');
    if (ext === '.json')
        return JSON.parse(raw);
    if (ext === '.yaml' || ext === '.yml')
        return (0, yaml_1.parse)(raw);
    try {
        return JSON.parse(raw);
    }
    catch {
        return (0, yaml_1.parse)(raw);
    }
}
function detectSpecType(spec) {
    if (spec.openapi)
        return 'openapi';
    if (spec.swagger)
        return 'swagger';
    if (spec.asyncapi)
        return 'asyncapi';
    if (spec.components || spec.paths)
        return 'openapi-like';
    return 'unknown';
}
const BREAKING_FIELDS = new Set(['required', 'minimum', 'maximum', 'minLength', 'maxLength', 'pattern', 'type']);
function deepDiff(oldObj, newObj, basePath = '') {
    const results = [];
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    for (const key of allKeys) {
        const currentPath = basePath ? `${basePath}.${key}` : key;
        const oldVal = oldObj[key];
        const newVal = newObj[key];
        if (key === 'description' || key === 'summary')
            continue;
        if (oldVal === undefined && newVal !== undefined) {
            results.push({ type: 'non-breaking', path: basePath, field: currentPath, change: 'adicionado', newValue: newVal });
        }
        else if (oldVal !== undefined && newVal === undefined) {
            results.push({
                type: BREAKING_FIELDS.has(key) ? 'breaking' : 'non-breaking',
                path: basePath, field: currentPath, change: 'removido', oldValue: oldVal,
            });
        }
        else if (typeof oldVal === 'object' && typeof newVal === 'object' &&
            oldVal !== null && newVal !== null &&
            !Array.isArray(oldVal) && !Array.isArray(newVal)) {
            results.push(...deepDiff(oldVal, newVal, currentPath));
        }
        else if (Array.isArray(oldVal) && Array.isArray(newVal)) {
            if (newVal.length < oldVal.length && basePath.includes('required')) {
                results.push({ type: 'breaking', path: basePath, field: currentPath, change: 'campo obrigatorio removido', oldValue: oldVal, newValue: newVal });
            }
            else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                results.push({ type: 'non-breaking', path: basePath, field: currentPath, change: 'lista modificada', oldValue: oldVal, newValue: newVal });
            }
        }
        else if (oldVal !== newVal) {
            const isBreaking = key === 'type' || key === 'required';
            results.push({
                type: isBreaking ? 'breaking' : 'non-breaking',
                path: basePath, field: currentPath,
                change: `modificado: ${String(oldVal)} → ${String(newVal)}`,
                oldValue: oldVal, newValue: newVal,
            });
        }
    }
    return results;
}
function diffSpecs(oldFile, newFile) {
    const oldSpec = loadSpec(oldFile);
    const newSpec = loadSpec(newFile);
    const specType = detectSpecType(oldSpec);
    const specTypeNew = detectSpecType(newSpec);
    if (specType !== specTypeNew) {
        return {
            specType: `${specType} → ${specTypeNew}`,
            breaking: [],
            nonBreaking: [{
                    type: 'non-breaking', path: '', field: 'specType',
                    change: `Tipo alterado: ${specType} → ${specTypeNew}`,
                    oldValue: specType, newValue: specTypeNew,
                }],
            total: 1,
        };
    }
    const allChanges = deepDiff(oldSpec, newSpec);
    const breaking = allChanges.filter(e => e.type === 'breaking');
    const nonBreaking = allChanges.filter(e => e.type === 'non-breaking');
    return { specType, breaking, nonBreaking, total: allChanges.length };
}
//# sourceMappingURL=object-diff.js.map