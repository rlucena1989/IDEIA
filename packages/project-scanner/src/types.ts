export interface ProjectTech {
  name: string;
  version?: string;
  category: 'language' | 'framework' | 'database' | 'tooling' | 'cloud' | 'testing' | 'other';
  confidence: number;
}

export interface ProjectStructure {
  directories: number;
  files: number;
  sourceFiles: number;
  configFiles: number;
  testFiles: number;
  documentationFiles: number;
  assetFiles: number;
}

export interface ProjectSize {
  totalBytes: number;
  sourceBytes: number;
  linesOfCode: number;
  sourceLines: number;
  commentLines: number;
  blankLines: number;
}

export interface ProjectScanResult {
  projectName: string;
  rootDir: string;
  techs: ProjectTech[];
  structure: ProjectStructure;
  size: ProjectSize;
  languages: Array<{ name: string; files: number; lines: number; percentage: number }>;
  scannedAt: string;
  durationMs: number;
}

export interface ScanOptions {
  maxDepth?: number;
  maxFiles?: number;
  excludeDirs?: string[];
  excludePatterns?: string[];
  detectTechs?: boolean;
}

export const DEFAULT_SCAN_OPTIONS: ScanOptions = {
  maxDepth: 10,
  maxFiles: 10000,
  excludeDirs: ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.cache', '__pycache__', '.idea', '.vscode'],
  excludePatterns: ['*.lock', '*.exe', '*.dll', '*.so', '*.bin', '*.png', '*.jpg', '*.gif', '*.ico', '*.svg'],
  detectTechs: true,
};

export const TECH_PATTERNS: Array<{ name: string; category: ProjectTech['category']; pattern: RegExp; versionPattern?: RegExp }> = [
  { name: 'TypeScript', category: 'language', pattern: /\.ts$/i },
  { name: 'JavaScript', category: 'language', pattern: /\.js$/i },
  { name: 'Python', category: 'language', pattern: /\.py$/i },
  { name: 'Go', category: 'language', pattern: /\.go$/i },
  { name: 'Rust', category: 'language', pattern: /\.rs$/i },
  { name: 'Java', category: 'language', pattern: /\.java$/i },
  { name: 'Kotlin', category: 'language', pattern: /\.kt$/i },
  { name: 'Swift', category: 'language', pattern: /\.swift$/i },
  { name: 'Ruby', category: 'language', pattern: /\.rb$/i },
  { name: 'PHP', category: 'language', pattern: /\.php$/i },
  { name: 'C#', category: 'language', pattern: /\.cs$/i },
  { name: 'C++', category: 'language', pattern: /\.(cpp|cxx|cc|hpp)$/i },
  { name: 'C', category: 'language', pattern: /\.c$/i },
  { name: 'Dart', category: 'language', pattern: /\.dart$/i },
  { name: 'Elixir', category: 'language', pattern: /\.exs?$/i },
  { name: 'Haskell', category: 'language', pattern: /\.hs$/i },
  { name: 'Scala', category: 'language', pattern: /\.scala$/i },
  { name: 'Zig', category: 'language', pattern: /\.zig$/i },
  { name: 'React', category: 'framework', pattern: /\.(tsx|jsx)$/i },
  { name: 'Vue', category: 'framework', pattern: /\.vue$/i },
  { name: 'Angular', category: 'framework', pattern: /\.(component\.ts|module\.ts)$/i },
  { name: 'Node.js', category: 'framework', pattern: /package\.json$/i },
  { name: 'Docker', category: 'tooling', pattern: /Dockerfile/i },
  { name: 'Jest', category: 'testing', pattern: /jest\.config/, versionPattern: /"jest":\s*"([^"]+)"/ },
  { name: 'PostgreSQL', category: 'database', pattern: /(postgres|pg\.|psql)/i },
  { name: 'MongoDB', category: 'database', pattern: /mongodb/i },
  { name: 'Redis', category: 'database', pattern: /redis/i },
];
