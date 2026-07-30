"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGitDiff = parseGitDiff;
exports.formatGitDiff = formatGitDiff;
exports.gitDiff = gitDiff;
exports.gitLog = gitLog;
const node_child_process_1 = require("node:child_process");
function parseGitDiff(raw) {
    const files = [];
    let currentFile = null;
    let currentHunk = null;
    for (const line of raw.split('\n')) {
        const fileHeader = line.match(/^diff --git a\/(.+?) b\/(.+?)$/);
        if (fileHeader) {
            if (currentFile)
                files.push(currentFile);
            currentFile = { file: fileHeader[2], status: 'modified', hunks: [], linesAdded: 0, linesRemoved: 0 };
            currentHunk = null;
            continue;
        }
        const newFile = line.match(/^new file mode/);
        if (newFile && currentFile) {
            currentFile.status = 'added';
            continue;
        }
        const deletedFile = line.match(/^deleted file mode/);
        if (deletedFile && currentFile) {
            currentFile.status = 'deleted';
            continue;
        }
        const renameFrom = line.match(/^rename from/);
        if (renameFrom && currentFile) {
            currentFile.status = 'renamed';
            continue;
        }
        const hunkHeader = line.match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
        if (hunkHeader && currentFile) {
            currentHunk = { header: line, lines: [] };
            currentFile.hunks.push(currentHunk);
            continue;
        }
        if (currentHunk) {
            if (line.startsWith('+')) {
                currentHunk.lines.push({ type: 'add', content: line.slice(1) });
                if (currentFile)
                    currentFile.linesAdded++;
            }
            else if (line.startsWith('-')) {
                currentHunk.lines.push({ type: 'remove', content: line.slice(1) });
                if (currentFile)
                    currentFile.linesRemoved++;
            }
            else if (line.startsWith(' ')) {
                currentHunk.lines.push({ type: 'context', content: line.slice(1) });
            }
        }
    }
    if (currentFile)
        files.push(currentFile);
    return files;
}
function formatGitDiff(files) {
    let result = '';
    for (const f of files) {
        result += `\x1b[1m${f.file}\x1b[0m (${f.status}, +${f.linesAdded}/-${f.linesRemoved})\n`;
        for (const hunk of f.hunks) {
            result += `  ${hunk.header}\n`;
            for (const line of hunk.lines) {
                const prefix = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ';
                result += `  ${prefix}${line.content}\n`;
            }
        }
    }
    return result;
}
async function gitDiff(base, root, file) {
    try {
        const args = ['diff', base];
        if (file) {
            args.push('--', file.replace(/[<>"|]/g, ''));
        }
        else {
            args.push('--', '.');
        }
        const raw = await execFilePromise('git', args, root);
        return Promise.resolve(parseGitDiff(raw));
    }
    catch {
        return Promise.resolve([]);
    }
}
async function gitLog(limit, root) {
    try {
        const raw = await execFilePromise('git', ['log', '--oneline', `--max-count=${Math.min(limit, 1000)}`], root);
        return raw.trim().split('\n').filter(Boolean);
    }
    catch {
        return [];
    }
}
function execFilePromise(cmd, args, cwd) {
    return new Promise((resolve, reject) => {
        (0, node_child_process_1.execFile)(cmd, args, { cwd, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024, windowsHide: true }, (err, stdout) => {
            if (err)
                reject(err);
            else
                resolve(stdout.trim());
        });
    });
}
//# sourceMappingURL=git-diff.js.map