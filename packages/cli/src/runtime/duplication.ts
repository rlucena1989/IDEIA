/** Interface que define a estrutura de duplicate pair. */
export interface DuplicatePair {
  fileA: string;
  fileB: string;
  similarity: number;
  type: 'filename' | 'content' | 'structure';
  linesA: number;
  linesB: number;
}

/** Interface que define a estrutura de duplicate group. */
export interface DuplicateGroup {
  files: string[];
  similarity: number;
  type: 'filename' | 'content' | 'structure';
  pairs: DuplicatePair[];
}

/** Interface que define a estrutura de function signature. */
export interface FunctionSignature {
  name: string;
  type: 'function' | 'async_function' | 'arrow' | 'method' | 'class' | 'hook';
  file: string;
  line: number;
  params: string[];
}

/** Interface que define a estrutura de duplicate function. */
export interface DuplicateFunction {
  signatureA: FunctionSignature;
  signatureB: FunctionSignature;
  similarity: number;
}

/** Interface que define a estrutura de duplication report. */
export interface DuplicationReport {
  scannedFiles: number;
  duplicateFiles: DuplicateGroup[];
  duplicateFunctions: DuplicateFunction[];
  totalRedundant: number;
  scanTimeMs: number;
  recommendations: string[];
}

/** Interface que define a estrutura de scanner options. */
export interface ScannerOptions {
  minFilenameSimilarity?: number;
  minContentSimilarity?: number;
  minFunctionSimilarity?: number;
  maxFileSize?: number;
  excludePatterns?: string[];
  includeExtensions?: string[];
}

/** Documentação da função DEFAULT_SCANNER_OPTIONS */
export const DEFAULT_SCANNER_OPTIONS: ScannerOptions = {
  minFilenameSimilarity: 0.8,
  minContentSimilarity: 0.6,
  minFunctionSimilarity: 0.7,
  maxFileSize: 1024 * 1024,
  excludePatterns: [
    'node_modules', '.git', 'dist', 'build', 'coverage',
    '.next', '.venv', '__pycache__', '.gitlab',
  ],
  includeExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.yaml', '.yml', '.md'],
};

/** Documentação da função levenshteinDistance */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

/** Documentação da função filenameSimilarity */
export function filenameSimilarity(nameA: string, nameB: string): number {
  const stripExt = (name: string) => name.replace(/\.(ts|tsx|js|jsx|json|yaml|yml|md)$/, '');
  const baseA = stripExt(nameA.split(/[/\\]/).pop() || nameA);
  const baseB = stripExt(nameB.split(/[/\\]/).pop() || nameB);
  if (baseA === baseB) return 1;
  const maxLen = Math.max(baseA.length, baseB.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(baseA.toLowerCase(), baseB.toLowerCase());
  return 1 - distance / maxLen;
}

/** Documentação da função extractWords */
export function extractWords(content: string): Set<string> {
  const words = new Set<string>();
  const tokens = content.toLowerCase().split(/[^a-zA-Z0-9_$]+/);
  for (const token of tokens) {
    if (token.length >= 3) words.add(token);
  }
  return words;
}

/** Documentação da função jaccardSimilarity */
export function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  const union = new Set([...setA, ...setB]);
  if (union.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  return intersection / union.size;
}

/** Documentação da função contentSimilarity */
export function contentSimilarity(contentA: string, contentB: string): number {
  const wordsA = extractWords(contentA);
  const wordsB = extractWords(contentB);
  return jaccardSimilarity(wordsA, wordsB);
}

/** Documentação da função extractSignatures */
export function extractSignatures(content: string, filePath: string): FunctionSignature[] {
  const signatures: FunctionSignature[] = [];
  const lines = content.split('\n');

  const patterns: Array<{ regex: RegExp; type: FunctionSignature['type'] }> = [
    { regex: /^export\s+(async\s+)?function\s+(\w+)\s*\(([^)]*)\)/, type: 'function' },
    { regex: /^(async\s+)?function\s+(\w+)\s*\(([^)]*)\)/, type: 'function' },
    { regex: /^export\s+(async\s+)?function\s*\*?\s*(\w+)\s*\(([^)]*)\)/, type: 'function' },
    { regex: /^export\s+(default\s+)?(async\s+)?function\s+(\w+)\s*\(([^)]*)\)/, type: 'function' },
    { regex: /^export\s+const\s+(\w+)\s*=\s*(async\s*)?\(([^)]*)\)\s*=>/, type: 'arrow' },
    { regex: /^const\s+(\w+)\s*=\s*(async\s*)?\(([^)]*)\)\s*=>/, type: 'arrow' },
    { regex: /^export\s+class\s+(\w+)/, type: 'class' },
    { regex: /^class\s+(\w+)/, type: 'class' },
    { regex: /^export\s+(async\s+)?function\s+use(\w+)\s*\(([^)]*)\)/, type: 'hook' },
    { regex: /^\s*(async\s+)?(\w+)\s*\(([^)]*)\)\s*{/, type: 'method' },
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { regex, type } of patterns) {
      const match = line.match(regex);
      if (match) {
        const groups = match.slice(1);
        const name = groups.find(g => g && !g.startsWith('async') && g !== 'default' && g !== 'export') || `anonymous_${i}`;
        const paramsStr = groups[groups.length - 1] || '';
        const params = paramsStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
        signatures.push({ name, type, file: filePath, line: i + 1, params });
        break;
      }
    }
  }

  return signatures;
}

/** Documentação da função functionSimilarity */
export function functionSimilarity(a: FunctionSignature, b: FunctionSignature): number {
  if (a.name === b.name && a.type === b.type) return 1;
  const nameSim = filenameSimilarity(a.name, b.name);
  const typeMatch = a.type === b.type ? 1 : 0;
  const paramsA = new Set(a.params);
  const paramsB = new Set(b.params);
  const paramSim = jaccardSimilarity(paramsA, paramsB);
  return nameSim * 0.5 + typeMatch * 0.3 + paramSim * 0.2;
}

/** Documentação da função scanForDuplicateFiles */
export function scanForDuplicateFiles(
  files: string[],
  fileContents: Map<string, string>,
  options: ScannerOptions = DEFAULT_SCANNER_OPTIONS,
): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const processed = new Set<string>();

  const minFilenameSim = options.minFilenameSimilarity ?? 0.8;
  const minContentSim = options.minContentSimilarity ?? 0.6;

  for (let i = 0; i < files.length; i++) {
    if (processed.has(files[i])) continue;
    const groupFiles: Set<string> = new Set([files[i]]);
    const pairs: DuplicatePair[] = [];

    for (let j = i + 1; j < files.length; j++) {
      if (processed.has(files[j])) continue;

      const nameSim = filenameSimilarity(files[i], files[j]);
      const contentA = fileContents.get(files[i]);
      const contentB = fileContents.get(files[j]);

      if (nameSim >= minFilenameSim) {
        groupFiles.add(files[j]);
        pairs.push({
          fileA: files[i],
          fileB: files[j],
          similarity: nameSim,
          type: 'filename',
          linesA: contentA ? contentA.split('\n').length : 0,
          linesB: contentB ? contentB.split('\n').length : 0,
        });
      } else if (contentA && contentB) {
        const contSim = contentSimilarity(contentA, contentB);
        if (contSim >= minContentSim) {
          groupFiles.add(files[j]);
          pairs.push({
            fileA: files[i],
            fileB: files[j],
            similarity: contSim,
            type: 'content',
            linesA: contentA.split('\n').length,
            linesB: contentB.split('\n').length,
          });
        }
      }
    }

    if (groupFiles.size > 1) {
      for (const f of groupFiles) processed.add(f);
      const maxSim = Math.max(...pairs.map(p => p.similarity));
      groups.push({
        files: [...groupFiles],
        similarity: maxSim,
        type: pairs[0]?.type || 'content',
        pairs,
      });
    }
  }

  return groups;
}

/** Documentação da função scanForDuplicateFunctions */
export function scanForDuplicateFunctions(
  files: string[],
  fileContents: Map<string, string>,
  options: ScannerOptions = DEFAULT_SCANNER_OPTIONS,
): DuplicateFunction[] {
  const results: DuplicateFunction[] = [];
  const allSignatures: FunctionSignature[] = [];
  const minSim = options.minFunctionSimilarity ?? 0.7;

  for (const file of files) {
    const content = fileContents.get(file);
    if (!content) continue;
    const sigs = extractSignatures(content, file);
    allSignatures.push(...sigs);
  }

  for (let i = 0; i < allSignatures.length; i++) {
    for (let j = i + 1; j < allSignatures.length; j++) {
      if (allSignatures[i].file === allSignatures[j].file) continue;
      const sim = functionSimilarity(allSignatures[i], allSignatures[j]);
      if (sim >= minSim) {
        results.push({
          signatureA: allSignatures[i],
          signatureB: allSignatures[j],
          similarity: sim,
        });
      }
    }
  }

  return results;
}

/** Documentação da função runDuplicationScan */
export function runDuplicationScan(
  rootDir: string,
  readFileFn: (path: string) => string | null,
  listFilesFn: (dir: string) => string[],
  options: ScannerOptions = DEFAULT_SCANNER_OPTIONS,
): DuplicationReport {
  const startTime = Date.now();
  const allFiles = listFilesFn(rootDir);
  const exts = options.includeExtensions ?? ['.ts', '.tsx', '.js', '.jsx'];
  const exclude = options.excludePatterns ?? ['node_modules', '.git'];

  const filteredFiles = allFiles.filter(f => {
    const ext = exts.some(e => f.endsWith(e));
    const excluded = exclude.some(e => f.includes(e));
    return ext && !excluded;
  });

  const fileContents = new Map<string, string>();
  for (const file of filteredFiles) {
    const content = readFileFn(file);
    if (content && content.length <= (options.maxFileSize ?? 1024 * 1024)) {
      fileContents.set(file, content);
    }
  }

  const files = [...fileContents.keys()];
  const duplicateFiles = scanForDuplicateFiles(files, fileContents, options);
  const duplicateFunctions = scanForDuplicateFunctions(files, fileContents, options);

  const recommendations = generateRecommendations(duplicateFiles, duplicateFunctions);

  return {
    scannedFiles: files.length,
    duplicateFiles,
    duplicateFunctions,
    totalRedundant: duplicateFiles.length + duplicateFunctions.length,
    scanTimeMs: Date.now() - startTime,
    recommendations,
  };
}

/** Documentação da função generateRecommendations */
export function generateRecommendations(
  duplicateFiles: DuplicateGroup[],
  duplicateFunctions: DuplicateFunction[],
): string[] {
  const recs: string[] = [];
  for (const group of duplicateFiles) {
    const files = group.files.map(f => f.split(/[/\\]/).pop()).join(', ');
    recs.push(`Arquivos duplicados (${(group.similarity * 100).toFixed(0)}% similar): ${files}`);
  }
  for (const dup of duplicateFunctions.slice(0, 10)) {
    const nameA = dup.signatureA.name;
    const nameB = dup.signatureB.name;
    const fileA = dup.signatureA.file.split(/[/\\]/).pop();
    const fileB = dup.signatureB.file.split(/[/\\]/).pop();
    recs.push(`Funcao '${nameA}' em ${fileA} similar a '${nameB}' em ${fileB} (${(dup.similarity * 100).toFixed(0)}%)`);
  }
  if (recs.length === 0) {
    recs.push('Nenhuma duplicacao significativa encontrada.');
  }
  return recs;
}

/** Documentação da função formatDuplicationReport */
export function formatDuplicationReport(report: DuplicationReport): string {
  const lines: string[] = [];
  lines.push('=== Duplication Report ===');
  lines.push(`Arquivos escaneados: ${report.scannedFiles}`);
  lines.push(`Grupos duplicados: ${report.duplicateFiles.length}`);
  lines.push(`Funcoes duplicadas: ${report.duplicateFunctions.length}`);
  lines.push(`Tempo de scan: ${report.scanTimeMs}ms`);
  lines.push('');

  if (report.duplicateFiles.length > 0) {
    lines.push('--- Arquivos Duplicados ---');
    for (const group of report.duplicateFiles) {
      lines.push(`[${(group.similarity * 100).toFixed(0)}% ${group.type}]`);
      for (const f of group.files) lines.push(`  ${f}`);
    }
    lines.push('');
  }

  if (report.duplicateFunctions.length > 0) {
    lines.push('--- Funcoes Duplicadas ---');
    for (const dup of report.duplicateFunctions.slice(0, 20)) {
      const fileA = dup.signatureA.file.split(/[/\\]/).pop();
      const fileB = dup.signatureB.file.split(/[/\\]/).pop();
      lines.push(`  ${dup.signatureA.name}(${dup.signatureA.params.join(', ')}) [${fileA}:${dup.signatureA.line}]`);
      lines.push(`  ${dup.signatureB.name}(${dup.signatureB.params.join(', ')}) [${fileB}:${dup.signatureB.line}]`);
      lines.push(`  Similaridade: ${(dup.similarity * 100).toFixed(0)}%`);
      lines.push('');
    }
  }

  lines.push('--- Recomendacoes ---');
  for (const rec of report.recommendations) lines.push(`  * ${rec}`);

  return lines.join('\n');
}
