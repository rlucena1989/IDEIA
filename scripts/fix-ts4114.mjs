// Fix TS4114/TS4115: Add 'override' modifier
// Pattern: "error TS4114: This member must have an 'override' modifier because it overrides a member in the base class 'X'."
//           "error TS4115: This parameter property must have an 'override' modifier because it overrides a member in base class 'X'."
import { readFileSync, writeFileSync } from 'node:fs';

const raw = readFileSync('.tsc-raw.log', 'utf8');

// Match: packages/X/src/Y.ts(line,col): error TS4114/TS4115: ... 'override' modifier ...
const re = /packages\/([^/\\]+)\/src\/([^:]+)\((\d+),(\d+)\):\s+error\s+TS(4114|4115):\s+(.+)/g;

const fixes = new Map();
let m;
while ((m = re.exec(raw)) !== null) {
  const [, pkg, file, lineStr, colStr, code, msg] = m;
  const key = pkg + '|' + file;
  if (!fixes.has(key)) fixes.set(key, []);
  fixes.get(key).push({ line: +lineStr, col: +colStr, code, msg });
}

console.log('Files to fix:', fixes.size);
console.log('Total TS4114/TS4115 lines:', [...fixes.values()].reduce((s, v) => s + v.length, 0));

let totalFixed = 0;
const summary = [];

for (const [key, errs] of fixes) {
  const [pkg, filePath] = key.split('|');
  const absPath = 'F:/PROJETOS/ai-devkit-workspace/IDEIA/packages/' + pkg + '/src/' + filePath;
  let content;
  try {
    content = readFileSync(absPath, 'utf8');
  } catch (e) {
    console.error('Cannot read:', absPath);
    continue;
  }

  const fileLines = content.split(/\r?\n/);
  let fileFixed = 0;

  for (const err of errs) {
    const lineIdx = err.line - 1;
    if (lineIdx < 0 || lineIdx >= fileLines.length) continue;
    const original = fileLines[lineIdx];
    // Add 'override' modifier
    // For TS4114 (method): `  methodName(` -> `  override methodName(`
    // For TS4115 (param prop): `constructor(public foo: ...)` -> `constructor(override public foo: ...)` (rare, but handle)
    let fixed = original;
    // Check for method definition: word followed by `(` or `<` (generic method)
    if (err.code === '4114') {
      // Find pattern: (modifiers?) methodName(... or methodName<T...>(
      // Common: `  onActivate(...): void {` or `  render(): void {`
      // Use a regex to add 'override' before the method name
      const methodMatch = fixed.match(/^(\s*(?:public|private|protected|async|static|readonly|\s)*)(\s*)(\w+)\s*[<(]/);
      if (methodMatch && !methodMatch[3].match(/^(if|else|for|while|return|const|let|var|class|function|new|throw|try|catch|import|export|interface|type|enum)$/)) {
        const [, , leadingWs, methodName] = methodMatch;
        if (!fixed.includes('override')) {
          // Insert 'override' before the method name
          fixed = fixed.replace(/^(\s*(?:(?:public|private|protected|async|static|readonly)\s+)*)(\s*)(\w+)(\s*[<(])/,
            (m2, modifiers, ws, name, rest) => {
              if (modifiers.includes('override')) return m2;
              return modifiers + 'override ' + name + rest;
            });
        }
      }
    } else if (err.code === '4115') {
      // Parameter property: constructor(... public foo: ...) -> constructor(... override public foo: ...)
      const paramMatch = fixed.match(/(\b(?:public|private|protected|readonly)\s+\w+\s*[:=])/);
      if (paramMatch && !fixed.includes('override')) {
        fixed = fixed.replace(/(\b)(public|private|protected|readonly)(\s+\w+\s*[:=])/,
          (m2, before, vis, rest) => before + 'override ' + vis + rest);
      }
    }

    if (fixed !== original) {
      fileLines[lineIdx] = fixed;
      fileFixed++;
    }
  }

  if (fileFixed > 0) {
    writeFileSync(absPath, fileLines.join('\n'), 'utf8');
    summary.push(absPath + ': ' + fileFixed + ' lines fixed');
    totalFixed += fileFixed;
  }
}

console.log('\nTotal files modified: ' + totalFixed);
summary.forEach(s => console.log('  ' + s));
