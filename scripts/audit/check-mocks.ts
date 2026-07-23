import fs from 'node:fs';
import path from 'node:path';

function walk(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && (full.endsWith('.test.ts') || full.endsWith('.spec.ts'))) {
      files.push(full);
    }
  }
  return files;
}

const tests = walk('packages');
let failed = false;
let totalMocks = 0;
let unassertedMocks = 0;

for (const file of tests) {
  const content = fs.readFileSync(file, 'utf8');

  const hasMock = content.includes('jest.fn()') || content.includes('vi.fn()') ||
    content.includes('jest.mock') || content.includes('vi.mock') ||
    content.includes('jest.spyOn') || content.includes('vi.spyOn');

  if (hasMock) {
    totalMocks++;
    const hasExpect = content.includes('expect(') || content.includes('expect.');
    if (!hasExpect) {
      console.error(`[check-mocks] Mock without assertions in ${path.relative(process.cwd(), file)}`);
      unassertedMocks++;
      failed = true;
    }
  }
}

console.log(`[check-mocks] Test files with mocks: ${totalMocks}, without assertions: ${unassertedMocks}`);
if (failed) process.exit(1);
console.log('[check-mocks] Mock audit passed');