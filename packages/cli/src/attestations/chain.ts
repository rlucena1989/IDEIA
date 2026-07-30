import crypto from 'node:crypto';
import { createLogger } from '@ideia/logger';
import fs from 'node:fs';
import path from 'node:path';

/** Interface que define a estrutura de attestation. */
export interface Attestation {
  id: string;
  timestamp: string;
  check_type: string;
  result: 'pass' | 'fail' | 'warn';
  details?: string;
  signature: string;
  prev_signature: string;
  revoked?: boolean;
  revoke_reason?: string;
}

const SECRET_FILE = '.ai/audit/secret';
const STORAGE_DIR = '.ai/attestations';

function getOrCreateSecret(root: string): string {
  const secretPath = path.join(root, SECRET_FILE);
  const dir = path.dirname(secretPath);

  if (fs.existsSync(secretPath)) {
    return fs.readFileSync(secretPath, 'utf8').trim();
  }

  fs.mkdirSync(dir, { recursive: true });
  const secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(secretPath, secret, { mode: 0o600 });
  return secret;
}

function computeSignature(data: string, key: string): string {
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

function getLastAttestation(root: string): Attestation | null {
  const storagePath = path.join(root, STORAGE_DIR);
  const filePath = path.join(storagePath, 'chain.jsonl');
  if (!fs.existsSync(filePath)) return null;

  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n').filter(Boolean);
  if (lines.length === 0) return null;

  try {
    return JSON.parse(lines[lines.length - 1]) as Attestation;
  } catch {
    return null;
  }
}

function appendAttestation(root: string, attestation: Attestation): void {
  const storagePath = path.join(root, STORAGE_DIR);
  fs.mkdirSync(storagePath, { recursive: true });
  const filePath = path.join(storagePath, 'chain.jsonl');
  fs.appendFileSync(filePath, JSON.stringify(attestation) + '\n');
}

/**
 * Cria attestation.
 * @param root - Valor root.
 * @param checkType - Verifica type.
 * @param result - Valor result.
 * @param details - Valor details.
 * @returns O resultado da operação.
 */
export function createAttestation(
  root: string,
  checkType: string,
  result: 'pass' | 'fail' | 'warn',
  details?: string
): Attestation {
  const secret = getOrCreateSecret(root);
  const last = getLastAttestation(root);
  const prevSignature = last ? last.signature : 'genesis';

  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const payload = JSON.stringify({ id, timestamp, check_type: checkType, result, prev_signature: prevSignature, details });
  const signature = computeSignature(payload, secret);

  const attestation: Attestation = { id, timestamp, check_type: checkType, result, details, signature, prev_signature: prevSignature };
  appendAttestation(root, attestation);
  return attestation;
}

/**
 * Carrega chain.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function loadChain(root: string): Attestation[] {
  const storagePath = path.join(root, STORAGE_DIR);
  const filePath = path.join(storagePath, 'chain.jsonl');
  if (!fs.existsSync(filePath)) return [];

  return fs.readFileSync(filePath, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line) as Attestation);
}

/** Interface que define a estrutura de validation result. */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  attestations: number;
}

/**
 * Valida chain.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function validateChain(root: string): ValidationResult {
  const chain = loadChain(root);
  const errors: string[] = [];
  const secret = getOrCreateSecret(root);

  for (let i = 0; i < chain.length; i++) {
    const att = chain[i];

    const expectedPrev = i === 0 ? 'genesis' : chain[i - 1].signature;
    if (att.prev_signature !== expectedPrev) {
      errors.push(`Atestacao ${att.id}: prev_signature invalida (elo ${i})`);
    }

    const payload = JSON.stringify({ id: att.id, timestamp: att.timestamp, check_type: att.check_type, result: att.result, prev_signature: expectedPrev, details: att.details });
    const expectedSig = computeSignature(payload, secret);
    if (att.signature !== expectedSig) {
      errors.push(`Atestacao ${att.id}: assinatura invalida (elo ${i}) — ATESTACAO ADULTERADA`);
    }
  }

  return { valid: errors.length === 0, errors, attestations: chain.length };
}

/**
 * Processa attestation.
 * @param root - Valor root.
 * @param id - Valor id.
 * @param reason - Valor reason.
 * @returns O resultado da operação.
 */
export function revokeAttestation(root: string, id: string, reason?: string): boolean {
  const chain = loadChain(root);
  const idx = chain.findIndex(a => a.id === id);
  if (idx === -1) return false;

  const entry = chain[idx] as NonNullable<typeof chain[0]>;
  entry.revoked = true;
  entry.revoke_reason = reason || 'Revogado manualmente';

  const storagePath = path.join(root, STORAGE_DIR);
  fs.mkdirSync(storagePath, { recursive: true });
  fs.writeFileSync(path.join(storagePath, 'chain.jsonl'), chain.map(a => JSON.stringify(a)).join('\n') + '\n');
  return true;
}
