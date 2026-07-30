import fs from "node:fs";
import { createLogger } from '@ideia/logger';
import path from "node:path";
import os from "node:os";

/** Interface que define a estrutura de parsed attachment. */
export interface ParsedAttachment {
  filePath: string;
  content: string;
  type: "text" | "json" | "markdown" | "code" | "unknown";
  size: number;
  lines: number;
  valid: boolean;
  error?: string;
}

/** Interface que define a estrutura de attachment parse result. */
export interface AttachmentParseResult {
  attachments: ParsedAttachment[];
  referencedFiles: string[];
  missingFiles: string[];
  summary: string;
}

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB

const FILE_REFERENCE_PATTERNS = [
  /@see\s+(\S+)/gi,
  /conforme\s+(\S+)/gi,
  /arquivo\s+(\S+)/gi,
  /file:\/\/(\S+)/gi,
];

const EXTENSION_PATTERN = /\.(md|json|ts|js|tsx|jsx|py|yaml|yml|txt|csv|log|pdf|xml|toml|ini|cfg|env|sh|bat|ps1|sql|graphql|css|scss|html|vue|svelte|go|rs|rb|php|java|kt|swift|dart)$/i;

function resolvePath(fileRef: string, baseDir: string): string {
  const trimmed = fileRef.trim();

  if (trimmed.startsWith("~")) {
    return path.resolve(os.homedir(), trimmed.slice(1));
  }

  if (path.isAbsolute(trimmed)) {
    return path.normalize(trimmed);
  }

  return path.resolve(baseDir, trimmed);
}

function isBinaryFile(filePath: string): boolean {
  try {
    const fd = fs.openSync(filePath, "r");
    const buffer = Buffer.alloc(512);
    const bytesRead = fs.readSync(fd, buffer, 0, 512, 0);
    fs.closeSync(fd);

    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) {
        return true;
      }
    }
    return false;
  } catch {
    return true;
  }
}

function readFileContent(filePath: string): { content: string; size: number; error?: string } | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return { content: "", size: 0, error: "Not a file" };
    }

    if (stat.size > MAX_FILE_SIZE) {
      return { content: "", size: stat.size, error: `File exceeds 1 MB limit (${(stat.size / 1024 / 1024).toFixed(2)} MB)` };
    }

    if (isBinaryFile(filePath)) {
      return { content: "", size: stat.size, error: "Binary file, content not readable" };
    }

    const content = fs.readFileSync(filePath, "utf8");
    return { content, size: stat.size };
  } catch (_err) {
    const message = _err instanceof Error ? _err.message : String(_err);
    return { content: "", size: 0, error: message };
  }
}

/**
 * Extrai file references.
 * @param text - Valor text.
 * @returns O resultado da operação.
 */
export function extractFileReferences(text: string): string[] {
  const references = new Set<string>();

  for (const pattern of FILE_REFERENCE_PATTERNS) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      const ref = (match[1] ?? '').replace(/[.,;:!?)]+$/, "");
      if (EXTENSION_PATTERN.test(ref)) {
        references.add(ref);
      }
    }
  }

  const inlineRegex = new RegExp(`(?:^|\\s)([\\w./\\\\-]+${EXTENSION_PATTERN.source.slice(1, -1)})`, "gmi");
  let match: RegExpExecArray | null;
  while ((match = inlineRegex.exec(text)) !== null) {
    const ref = (match[1] ?? '').trim().replace(/[.,;:!?)]+$/, "");
    if (!ref.startsWith("@see") && !ref.startsWith("conforme") && !ref.startsWith("arquivo") && !ref.startsWith("file://")) {
      references.add(ref);
    }
  }

  return Array.from(references);
}

/**
 * Detecta file type.
 * @param filePath - Valor path.
 * @returns O resultado da operação.
 */
export function detectFileType(filePath: string): ParsedAttachment["type"] {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case ".md":
    case ".mdx":
      return "markdown";
    case ".json":
      return "json";
    case ".ts":
    case ".tsx":
    case ".js":
    case ".jsx":
    case ".py":
    case ".go":
    case ".rs":
    case ".rb":
    case ".php":
    case ".java":
    case ".kt":
    case ".swift":
    case ".dart":
    case ".sh":
    case ".bat":
    case ".ps1":
    case ".sql":
    case ".graphql":
    case ".css":
    case ".scss":
    case ".html":
    case ".vue":
    case ".svelte":
    case ".yaml":
    case ".yml":
    case ".toml":
    case ".ini":
    case ".cfg":
    case ".env":
    case ".xml":
      return "code";
    case ".txt":
    case ".csv":
    case ".log":
      return "text";
    default:
      return "unknown";
  }
}

/**
 * Analisa attachments from text.
 * @param text - Valor text.
 * @param baseDir - Valor dir.
 * @returns O resultado da operação.
 */
export function parseAttachmentsFromText(
  text: string,
  baseDir: string = process.cwd(),
): AttachmentParseResult {
  const rawRefs = extractFileReferences(text);
  const attachments: ParsedAttachment[] = [];
  const referencedFiles: string[] = [];
  const missingFiles: string[] = [];

  for (const ref of rawRefs) {
    const resolvedPath = resolvePath(ref, baseDir);
    referencedFiles.push(resolvedPath);

    const result = readFileContent(resolvedPath);

    if (result === null) {
      missingFiles.push(resolvedPath);
      attachments.push({
        filePath: resolvedPath,
        content: "",
        type: detectFileType(resolvedPath),
        size: 0,
        lines: 0,
        valid: false,
        error: "File not found",
      });
      continue;
    }

    if (result.error) {
      attachments.push({
        filePath: resolvedPath,
        content: "",
        type: detectFileType(resolvedPath),
        size: result.size,
        lines: 0,
        valid: false,
        error: result.error,
      });
      continue;
    }

    const lines = result.content.split(/\r?\n/).length;

    attachments.push({
      filePath: resolvedPath,
      content: result.content,
      type: detectFileType(resolvedPath),
      size: result.size,
      lines,
      valid: true,
    });
  }

  const summary = formatAttachmentSummary({ attachments, referencedFiles, missingFiles, summary: "" });

  return { attachments, referencedFiles, missingFiles, summary };
}

/**
 * Formata attachment summary.
 * @param result - Valor result.
 * @returns O resultado da operação.
 */
export function formatAttachmentSummary(result: AttachmentParseResult): string {
  const validCount = result.attachments.filter((a) => a.valid).length;
  const invalidCount = result.attachments.length - validCount;
  const missingCount = result.missingFiles.length;
  const totalLines = result.attachments.reduce((acc, a) => acc + a.lines, 0);
  const totalSize = result.attachments.reduce((acc, a) => acc + a.size, 0);

  const parts: string[] = [];
  parts.push(`Found ${result.attachments.length} file(s)`);
  parts.push(`${validCount} valid`);
  if (invalidCount > 0) parts.push(`${invalidCount} with errors`);
  if (missingCount > 0) parts.push(`${missingCount} missing`);
  parts.push(`${totalLines} total lines`);
  parts.push(`(${(totalSize / 1024).toFixed(1)} KB)`);

  return parts.join(", ");
}
