"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diffText = diffText;
exports.diffTexts = diffTexts;
function diffText(original, modified, filePath) {
    const origLines = original.split('\n');
    const modLines = modified.split('\n');
    const chunks = [];
    const added = new Set();
    const removed = new Set();
    const maxLen = Math.max(origLines.length, modLines.length);
    for (let i = 0; i < maxLen; i++) {
        const origLine = i < origLines.length ? (origLines[i] ?? '') : undefined;
        const modLine = i < modLines.length ? (modLines[i] ?? '') : undefined;
        if (origLine !== modLine) {
            if (i < origLines.length && i >= modLines.length && origLine !== undefined) {
                removed.add(i);
                chunks.push({ type: 'remove', content: origLine });
            }
            else if (i >= origLines.length && i < modLines.length && modLine !== undefined) {
                added.add(i);
                chunks.push({ type: 'add', content: modLine });
            }
            else if (origLine !== undefined && modLine !== undefined) {
                if (origLine !== modLine) {
                    removed.add(i);
                    added.add(i);
                    chunks.push({ type: 'remove', content: origLine });
                    chunks.push({ type: 'add', content: modLine });
                }
            }
        }
        else if (origLine !== undefined) {
            if (chunks.length === 0 || (chunks[chunks.length - 1]?.type ?? '') !== 'context') {
                chunks.push({ type: 'context', content: origLine });
            }
        }
    }
    return {
        file: filePath,
        linesAdded: added.size,
        linesRemoved: removed.size,
        chunks: chunks.slice(0, 50),
    };
}
function diffTexts(files) {
    const diffs = files.map(f => diffText(f.original, f.modified, f.path));
    const totalAdded = diffs.reduce((s, d) => s + d.linesAdded, 0);
    const totalRemoved = diffs.reduce((s, d) => s + d.linesRemoved, 0);
    const summary = `${diffs.length} file${diffs.length !== 1 ? 's' : ''} changed, ${totalAdded} additions, ${totalRemoved} deletions`;
    return { diffs, totalFiles: diffs.length, totalAdded, totalRemoved, summary };
}
//# sourceMappingURL=text-diff.js.map