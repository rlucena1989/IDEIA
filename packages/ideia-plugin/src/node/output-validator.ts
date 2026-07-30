import { FileChange } from '../common/ideia-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('output-validator');

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  file: string;
  line?: number;
  severity: 'error' | 'warning';
  rule: string;
  message: string;
}

export interface ValidationWarning {
  file: string;
  message: string;
}

const SECRET_PATTERNS = [
  /(?:API_KEY|API_SECRET|ACCESS_TOKEN|PRIVATE_KEY|PASSWORD|SECRET|TOKEN|CREDENTIALS)\s*=\s*['"][^'"]+['"]/i,
  /(?:sk-[A-Za-z0-9]{20,})/,
  /(?:ghp_[A-Za-z0-9]{36})/,
  /(?:gho_[A-Za-z0-9]{36})/,
  /(?:ghu_[A-Za-z0-9]{36})/,
  /(?:ghb_[A-Za-z0-9]{36})/,
  /(?:-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----)/,
  /(?:-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----)/,
  /(?:-----BEGIN\s+EC\s+PRIVATE\s+KEY-----)/,
  /(?:mongodb(?:\+srv)?:\/\/[^\s]+)/,
  /(?:postgresql:\/\/[^\s]+)/,
  /(?:mysql:\/\/[^\s]+)/,
  /(?:redis:\/\/[^\s]+)/,
  /(?:AKIA[0-9A-Z]{16})/,
  /(?:eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})/,
  /(?:ghr_[A-Za-z0-9]{36})/,
  /(?:ghs_[A-Za-z0-9]{36})/,
  /(?:xox[baprs]-[A-Za-z0-9-]{10,})/,
  /(?:pk_[A-Za-z0-9]{30,})/,
  /(?:sk_live_[A-Za-z0-9]{30,})/,
  /(?:whsec_[A-Za-z0-9]{30,})/,
  /(?:AC[a-f0-9]{32})/,
  /(?:arn:aws:iam::\d{12}:)/,
  /(?:-----BEGIN\s+CERTIFICATE-----)/,
  /(?:cloudinary:\/\/[^\s]+)/,
];

const DANGEROUS_PATTERNS = [
  { pattern: /eval\s*\(/, message: 'Use of eval() allows arbitrary code execution' },
  { pattern: /new\s+Function\s*\(/, message: 'Use of new Function() allows arbitrary code execution' },
  { pattern: /exec(?:Sync)?\s*\(/, message: 'Use of exec() can lead to command injection' },
  { pattern: /innerHTML\s*=/, message: 'Use of innerHTML can lead to XSS' },
  { pattern: /dangerouslySetInnerHTML/, message: 'Use of dangerouslySetInnerHTML can lead to XSS' },
  { pattern: /\.escape\s*=\s*false/, message: 'Disabling escape can lead to XSS' },
  { pattern: /process\.env\./, message: 'Hardcoding process.env access may leak secrets in client code' },
];

const FILE_EXTENSION_ALLOWLIST = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.css', '.scss', '.less', '.html', '.yaml', '.yml', '.toml', '.env.example'];

const NO_EXTENSION_FILES = ['Dockerfile', 'Makefile', 'LICENSE', 'README', '.gitignore', '.dockerignore', '.editorconfig', '.prettierrc', '.eslintrc'];

export function validateChanges(changes: FileChange[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  for (const change of changes) {
    if (change.status === 'deleted') continue;

    const lastDot = change.path.lastIndexOf('.');
    const ext = lastDot >= 0 ? change.path.slice(lastDot).toLowerCase() : '';
    const basename = change.path.split('/').pop() || change.path;

    if (ext === '' && !NO_EXTENSION_FILES.includes(basename) && !basename.startsWith('.')) {
      warnings.push({ file: change.path, message: `Unknown file without extension: ${basename}. Verify this is intended.` });
    } else if (ext !== '' && !FILE_EXTENSION_ALLOWLIST.includes(ext)) {
      warnings.push({ file: change.path, message: `Unknown file extension: ${ext}. Verify this is intended.` });
    }

    const content = change.modifiedContent || '';

    for (const secret of SECRET_PATTERNS) {
      const match = content.match(secret);
      if (match) {
        errors.push({
          file: change.path,
          severity: 'error',
          rule: 'secret-detection',
          message: `Potential secret/key detected: ${match[0].substring(0, 40)}...`,
        });
      }
    }

    for (const danger of DANGEROUS_PATTERNS) {
      if (danger.pattern.test(content)) {
        errors.push({
          file: change.path,
          severity: 'warning',
          rule: 'dangerous-pattern',
          message: danger.message,
        });
      }
    }

    if (content.length > 50000) {
      warnings.push({ file: change.path, message: `File is very large (${content.length} chars). Consider splitting.` });
    }

    if (ext === '.ts' || ext === '.tsx') {
      if (!content.includes('export') && content.length > 50) {
        warnings.push({ file: change.path, message: 'TypeScript file without exports — may be unused.' });
      }
    }

    if (ext === '.js' || ext === '.jsx') {
      if (!content.includes('module.exports') && !content.includes('export') && content.length > 50) {
        warnings.push({ file: change.path, message: 'JavaScript file without exports — may be unused.' });
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
