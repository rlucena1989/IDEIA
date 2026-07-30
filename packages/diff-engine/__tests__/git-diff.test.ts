import { parseGitDiff, formatGitDiff, GitDiffFile } from '../src/git-diff';

describe('parseGitDiff', () => {
  it('should parse a simple diff with one modified file', () => {
    const raw = `diff --git a/src/index.ts b/src/index.ts
index abc..def 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,4 @@
 line1
 line2
+new line
 line3`;
    const files = parseGitDiff(raw);
    expect(files).toHaveLength(1);
    expect(files[0].file).toBe('src/index.ts');
    expect(files[0].status).toBe('modified');
    expect(files[0].linesAdded).toBe(1);
    expect(files[0].linesRemoved).toBe(0);
  });

  it('should parse diff with additions and removals', () => {
    const raw = `diff --git a/src/a.ts b/src/a.ts
index abc..def 100644
--- a/src/a.ts
+++ b/src/a.ts
@@ -1,2 +1,2 @@
-old line
+new line`;
    const files = parseGitDiff(raw);
    expect(files).toHaveLength(1);
    expect(files[0].file).toBe('src/a.ts');
    expect(files[0].linesAdded).toBe(1);
    expect(files[0].linesRemoved).toBe(1);
  });

  it('should parse diff with new file', () => {
    const raw = `diff --git a/src/new.ts b/src/new.ts
new file mode 100644
index 000..abc 100644
--- /dev/null
+++ b/src/new.ts
@@ -0,0 +1,3 @@
+line1
+line2
+line3`;
    const files = parseGitDiff(raw);
    expect(files).toHaveLength(1);
    expect(files[0].status).toBe('added');
    expect(files[0].linesAdded).toBe(3);
  });

  it('should parse diff with deleted file', () => {
    const raw = `diff --git a/src/old.ts b/src/old.ts
deleted file mode 100644
index abc..000 100644
--- a/src/old.ts
+++ /dev/null
@@ -1,2 +0,0 @@
-line1
-line2`;
    const files = parseGitDiff(raw);
    expect(files).toHaveLength(1);
    expect(files[0].status).toBe('deleted');
    expect(files[0].linesRemoved).toBe(2);
  });

  it('should parse diff with renamed file', () => {
    const raw = `diff --git a/src/old.ts b/src/new.ts
rename from src/old.ts
rename to src/new.ts`;
    const files = parseGitDiff(raw);
    expect(files).toHaveLength(1);
    expect(files[0].file).toBe('src/new.ts');
    expect(files[0].status).toBe('renamed');
  });

  it('should parse multiple files in one diff', () => {
    const raw = `diff --git a/src/a.ts b/src/a.ts
index abc..def 100644
--- a/src/a.ts
+++ b/src/a.ts
@@ -1 +1,2 @@
 a
+b
diff --git a/src/b.ts b/src/b.ts
index 123..456 100644
--- a/src/b.ts
+++ b/src/b.ts
@@ -1 +1 @@
-x
+y`;
    const files = parseGitDiff(raw);
    expect(files).toHaveLength(2);
    expect(files[0].file).toBe('src/a.ts');
    expect(files[1].file).toBe('src/b.ts');
  });

  it('should parse multiple hunks in one file', () => {
    const raw = `diff --git a/src/a.ts b/src/a.ts
index abc..def 100644
--- a/src/a.ts
+++ b/src/a.ts
@@ -1,3 +1,4 @@
 a
 b
 c
+d
@@ -10,3 +11,4 @@
 x
 y
 z
+w`;
    const files = parseGitDiff(raw);
    expect(files).toHaveLength(1);
    expect(files[0].hunks).toHaveLength(2);
    expect(files[0].linesAdded).toBe(2);
  });

  it('should handle empty diff', () => {
    const files = parseGitDiff('');
    expect(files).toHaveLength(0);
  });
});

describe('formatGitDiff', () => {
  it('should format a diff file back to readable string', () => {
    const files: GitDiffFile[] = [{
      file: 'src/test.ts',
      status: 'modified',
      hunks: [{ header: '@@ -1 +1 @@', lines: [{ type: 'remove', content: 'old' }, { type: 'add', content: 'new' }] }],
      linesAdded: 1,
      linesRemoved: 1,
    }];
    const result = formatGitDiff(files);
    expect(result).toContain('src/test.ts');
    expect(result).toContain('modified');
    expect(result).toContain('old');
    expect(result).toContain('new');
  });

  it('should format empty files array', () => {
    const result = formatGitDiff([]);
    expect(result).toBe('');
  });
});