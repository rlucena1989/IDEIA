import { LanguageService } from './types';
import { createLogger } from '@ideia/logger';

const EXTENSION_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescriptreact',
  '.js': 'javascript',
  '.jsx': 'javascriptreact',
  '.json': 'json',
  '.md': 'markdown',
  '.css': 'css',
  '.scss': 'scss',
  '.html': 'html',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.py': 'python',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.rb': 'ruby',
  '.php': 'php',
  '.cpp': 'cpp',
  '.c': 'c',
  '.h': 'c',
  '.hpp': 'cpp',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.dart': 'dart',
  '.sh': 'shellscript',
  '.bash': 'shellscript',
  '.sql': 'sql',
  '.graphql': 'graphql',
  '.xml': 'xml',
  '.svg': 'xml',
};

const FILENAME_MAP: Record<string, string> = {
  'Dockerfile': 'dockerfile',
  'Makefile': 'makefile',
  'CMakeLists.txt': 'cmake',
  '.env': 'dotenv',
  '.gitignore': 'gitignore',
  '.editorconfig': 'editorconfig',
  'compose.yaml': 'yaml',
  'compose.yml': 'yaml',
};

export class DefaultLanguageService implements LanguageService {
  getLanguageForUri(uri: string): string {
    const filename = uri.split('/').pop() || '';
    const ext = '.' + (filename.split('.').slice(1).join('.') || filename);

    if (FILENAME_MAP[filename]) return FILENAME_MAP[filename];
    if (EXTENSION_MAP[ext]) return EXTENSION_MAP[ext];
    return 'plaintext';
  }

  getLanguageByExtension(ext: string): string | undefined {
    return EXTENSION_MAP[ext];
  }

  getLanguageByFilename(filename: string): string | undefined {
    return FILENAME_MAP[filename];
  }

  getLanguageByContent(content: string): string | undefined {
    return undefined;
  }
}
