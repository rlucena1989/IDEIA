import { extractFileReferences, detectFileType, parseAttachmentsFromText, formatAttachmentSummary } from '../attachment-parser';
import fs from 'node:fs';

describe('attachment-parser', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('detectFileType', () => {
    it('should return "markdown" for .md files', () => {
      expect(detectFileType('file.md')).toBe('markdown');
      expect(detectFileType('file.mdx')).toBe('markdown');
    });

    it('should return "json" for .json files', () => {
      expect(detectFileType('file.json')).toBe('json');
    });

    it('should return "code" for known code extensions', () => {
      expect(detectFileType('file.ts')).toBe('code');
      expect(detectFileType('file.js')).toBe('code');
      expect(detectFileType('file.py')).toBe('code');
      expect(detectFileType('file.go')).toBe('code');
      expect(detectFileType('file.rs')).toBe('code');
      expect(detectFileType('file.yaml')).toBe('code');
    });

    it('should return "text" for .txt files', () => {
      expect(detectFileType('file.txt')).toBe('text');
      expect(detectFileType('file.csv')).toBe('text');
      expect(detectFileType('file.log')).toBe('text');
    });

    it('should return "unknown" for unrecognized extensions', () => {
      expect(detectFileType('file.xyz')).toBe('unknown');
      expect(detectFileType('file')).toBe('unknown');
    });
  });

  describe('extractFileReferences', () => {
    it('should extract @see references with valid extensions', () => {
      const result = extractFileReferences('@see path/to/file.ts');
      expect(result).toContain('path/to/file.ts');
    });

    it('should extract "conforme" references', () => {
      const result = extractFileReferences('conforme docs/readme.md');
      expect(result).toContain('docs/readme.md');
    });

    it('should extract "arquivo" references', () => {
      const result = extractFileReferences('arquivo src/index.ts');
      expect(result).toContain('src/index.ts');
    });

    it('should extract file:// references', () => {
      const result = extractFileReferences('file:///home/user/file.json');
      expect(result).toContain('/home/user/file.json');
    });

    it('should extract inline file references', () => {
      const result = extractFileReferences('veja src/utils/helper.ts para mais detalhes');
      expect(result).toContain('src/utils/helper.ts');
    });

    it('should strip trailing punctuation from references', () => {
      const result = extractFileReferences('@see file.ts.');
      expect(result).toContain('file.ts');
    });

    it('should not extract references without valid extensions', () => {
      const result = extractFileReferences('@see file.xyz file.ts');
      expect(result).not.toContain('file.xyz');
      expect(result).toContain('file.ts');
    });

    it('should return empty array for empty input', () => {
      expect(extractFileReferences('')).toEqual([]);
    });

    it('should return empty array for text with no references', () => {
      expect(extractFileReferences('Hello world')).toEqual([]);
    });

    it('should not duplicate references', () => {
      const result = extractFileReferences('@see file.ts @see file.ts');
      expect(result).toHaveLength(1);
      expect(result).toContain('file.ts');
    });
  });

  describe('parseAttachmentsFromText', () => {
    it('should return empty result for text with no references', () => {
      const result = parseAttachmentsFromText('no files here');
      expect(result.attachments).toHaveLength(0);
      expect(result.referencedFiles).toHaveLength(0);
      expect(result.missingFiles).toHaveLength(0);
    });

    it('should mark file as missing when it does not exist', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const result = parseAttachmentsFromText('@see missing.ts', '/base');
      expect(result.missingFiles).toHaveLength(1);
      expect(result.attachments[0].valid).toBe(false);
      expect(result.attachments[0].error).toBe('File not found');
    });

    it('should parse a valid existing file', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => true, size: 100 } as ReturnType<typeof fs.statSync>);
      jest.spyOn(fs, 'openSync').mockReturnValue(1 as unknown as number);
      jest.spyOn(fs, 'readSync').mockReturnValue(0);
      jest.spyOn(fs, 'closeSync').mockImplementation(() => {});
      jest.spyOn(fs, 'readFileSync').mockReturnValue('hello\nworld');
      const result = parseAttachmentsFromText('@see file.ts', '/base');
      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0].valid).toBe(true);
      expect(result.attachments[0].content).toBe('hello\nworld');
      expect(result.attachments[0].lines).toBe(2);
      expect(result.attachments[0].type).toBe('code');
    });

    it('should reject binary files', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => true, size: 100 } as ReturnType<typeof fs.statSync>);
      jest.spyOn(fs, 'openSync').mockReturnValue(1 as unknown as number);
      const buffer = Buffer.alloc(512);
      buffer[10] = 0;
      jest.spyOn(fs, 'readSync').mockImplementation((_fd: number, buf: ArrayBufferView, _opts?: unknown) => {
        const b = buf as Buffer;
        b.set(buffer.subarray(0, 512));
        return 512;
      });
      jest.spyOn(fs, 'closeSync').mockImplementation(() => {});
      const result = parseAttachmentsFromText('@see file.ts', '/base');
      expect(result.attachments[0].valid).toBe(false);
      expect(result.attachments[0].error).toBe('Binary file, content not readable');
    });

    it('should reject files exceeding max size', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => true, size: 2 * 1024 * 1024 } as ReturnType<typeof fs.statSync>);
      jest.spyOn(fs, 'openSync').mockReturnValue(1 as unknown as number);
      jest.spyOn(fs, 'readSync').mockReturnValue(0);
      jest.spyOn(fs, 'closeSync').mockImplementation(() => {});
      const result = parseAttachmentsFromText('@see file.ts', '/base');
      expect(result.attachments[0].valid).toBe(false);
      expect(result.attachments[0].error).toContain('exceeds 1 MB');
    });
  });

  describe('formatAttachmentSummary', () => {
    it('should format summary with no attachments', () => {
      const result = formatAttachmentSummary({ attachments: [], referencedFiles: [], missingFiles: [], summary: '' });
      expect(result).toContain('0 file(s)');
      expect(result).toContain('0 valid');
    });

    it('should format summary with valid attachments', () => {
      const result = formatAttachmentSummary({
        attachments: [
          { filePath: '/a.ts', content: 'a', type: 'code', size: 100, lines: 5, valid: true },
          { filePath: '/b.ts', content: 'b', type: 'code', size: 200, lines: 10, valid: true },
        ],
        referencedFiles: ['/a.ts', '/b.ts'],
        missingFiles: [],
        summary: '',
      });
      expect(result).toContain('2 file(s)');
      expect(result).toContain('2 valid');
      expect(result).toContain('15 total lines');
    });

    it('should include error and missing counts', () => {
      const result = formatAttachmentSummary({
        attachments: [
          { filePath: '/a.ts', content: '', type: 'code', size: 0, lines: 0, valid: false, error: 'err' },
        ],
        referencedFiles: [],
        missingFiles: ['/missing.ts'],
        summary: '',
      });
      expect(result).toContain('1 with errors');
      expect(result).toContain('1 missing');
    });
  });
});
