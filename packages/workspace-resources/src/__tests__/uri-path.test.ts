import { DefaultVfsUri, DefaultPathService } from '../uri-path';

describe('DefaultVfsUri', () => {
  describe('constructor', () => {
    it('should create URI with all components', () => {
      const uri = new DefaultVfsUri('file', '', '/path/to/file.txt', 'query=1', 'frag');
      expect(uri.scheme).toBe('file');
      expect(uri.authority).toBe('');
      expect(uri.path).toBe('/path/to/file.txt');
      expect(uri.query).toBe('query=1');
      expect(uri.fragment).toBe('frag');
    });

    it('should default query and fragment to empty', () => {
      const uri = new DefaultVfsUri('https', 'example.com', '/api');
      expect(uri.query).toBe('');
      expect(uri.fragment).toBe('');
    });
  });

  describe('toString', () => {
    it('should format file URI without authority', () => {
      const uri = new DefaultVfsUri('file', '', '/path/file.ts');
      expect(uri.toString()).toBe('file:/path/file.ts');
    });

    it('should format URI with authority', () => {
      const uri = new DefaultVfsUri('https', 'example.com', '/path');
      expect(uri.toString()).toBe('https://example.com/path');
    });

    it('should include query and fragment', () => {
      const uri = new DefaultVfsUri('file', '', '/path', 'q=v', 'section');
      expect(uri.toString()).toBe('file:/path?q=v#section');
    });
  });

  describe('parse', () => {
    it('should parse full URI', () => {
      const uri = DefaultVfsUri.parse('file:///home/user/file.ts');
      expect(uri.scheme).toBe('file');
      expect(uri.path).toBe('/home/user/file.ts');
    });

    it('should parse URI with authority', () => {
      const uri = DefaultVfsUri.parse('https://user@host.com/path?query=1');
      expect(uri.scheme).toBe('https');
      expect(uri.authority).toBe('user@host.com');
      expect(uri.query).toBe('query=1');
    });

    it('should parse URI with fragment', () => {
      const uri = DefaultVfsUri.parse('file:///doc.txt#section2');
      expect(uri.fragment).toBe('section2');
    });

    it('should parse absolute path as file URI', () => {
      const uri = DefaultVfsUri.parse('/absolute/path');
      expect(uri.scheme).toBe('file');
      expect(uri.path).toBe('/absolute/path');
    });

    it('should throw for invalid URI', () => {
      expect(() => DefaultVfsUri.parse('')).toThrow('Invalid URI');
    });
  });

  describe('file', () => {
    it('should create file URI from posix path', () => {
      const uri = DefaultVfsUri.file('/home/user/file.ts');
      expect(uri.scheme).toBe('file');
      expect(uri.path).toBe('/home/user/file.ts');
    });

    it('should normalize backslashes', () => {
      const uri = DefaultVfsUri.file('C:\\Users\\test\\file.ts');
      expect(uri.scheme).toBe('file');
      expect(uri.path).toBe('/C:/Users/test/file.ts');
    });

    it('should add leading slash to relative path', () => {
      const uri = DefaultVfsUri.file('relative/path.txt');
      expect(uri.path).toBe('/relative/path.txt');
    });
  });

  describe('toJSON', () => {
    it('should return the same as toString', () => {
      const uri = new DefaultVfsUri('file', '', '/test.txt');
      expect(uri.toJSON()).toBe(uri.toString());
    });
  });
});

describe('DefaultPathService', () => {
  const ps = new DefaultPathService();

  describe('normalize', () => {
    it('should normalize simple path', () => {
      expect(ps.normalize('/foo/bar/baz')).toBe('/foo/bar/baz');
    });

    it('should remove trailing slash', () => {
      expect(ps.normalize('/foo/bar/')).toBe('/foo/bar');
    });

    it('should resolve .. segments', () => {
      expect(ps.normalize('/foo/bar/../baz')).toBe('/foo/baz');
    });

    it('should remove . segments', () => {
      expect(ps.normalize('/foo/./bar')).toBe('/foo/bar');
    });

    it('should handle backslashes', () => {
      expect(ps.normalize('foo\\bar\\baz')).toBe('foo/bar/baz');
    });

    it('should handle relative paths', () => {
      expect(ps.normalize('foo/bar')).toBe('foo/bar');
    });

    it('should handle multiple ..', () => {
      expect(ps.normalize('/a/b/c/../../d')).toBe('/a/d');
    });
  });

  describe('join', () => {
    it('should join path segments', () => {
      expect(ps.join('/foo', 'bar', 'baz')).toBe('/foo/bar/baz');
    });

    it('should normalize the result', () => {
      expect(ps.join('/foo', 'bar/../baz')).toBe('/foo/baz');
    });
  });

  describe('relative', () => {
    it('should compute relative path', () => {
      expect(ps.relative('/a/b/c', '/a/b/d')).toBe('../d');
    });

    it('should return . for same path', () => {
      expect(ps.relative('/a/b', '/a/b')).toBe('.');
    });

    it('should handle deep paths', () => {
      expect(ps.relative('/a/b/c', '/a/b/c/d/e')).toBe('d/e');
    });
  });

  describe('basename', () => {
    it('should return basename', () => {
      expect(ps.basename('/foo/bar/file.ts')).toBe('file.ts');
    });

    it('should handle trailing slash', () => {
      expect(ps.basename('/foo/bar/')).toBe('bar');
    });

    it('should handle root', () => {
      expect(ps.basename('/')).toBe('');
    });
  });

  describe('dirname', () => {
    it('should return dirname', () => {
      expect(ps.dirname('/foo/bar/file.ts')).toBe('/foo/bar');
    });

    it('should handle root', () => {
      expect(ps.dirname('/')).toBe('/');
    });
  });

  describe('extname', () => {
    it('should return extension', () => {
      expect(ps.extname('file.ts')).toBe('.ts');
    });

    it('should return empty for no extension', () => {
      expect(ps.extname('file')).toBe('');
    });

    it('should handle path with directory', () => {
      expect(ps.extname('/path/to/file.min.js')).toBe('.js');
    });
  });

  describe('isAbsolute', () => {
    it('should detect posix absolute path', () => {
      expect(ps.isAbsolute('/foo/bar')).toBe(true);
    });

    it('should detect windows absolute path', () => {
      expect(ps.isAbsolute('C:\\Users\\test')).toBe(true);
    });

    it('should return false for relative path', () => {
      expect(ps.isAbsolute('foo/bar')).toBe(false);
    });
  });

  describe('resolve', () => {
    it('should resolve relative paths', () => {
      const result = ps.resolve('/base', 'foo', 'bar');
      expect(result).toBe('/base/foo/bar');
    });

    it('should reset on absolute path', () => {
      const result = ps.resolve('/base', '/absolute', 'sub');
      expect(result).toBe('/absolute/sub');
    });
  });

  describe('separator', () => {
    it('should be /', () => {
      expect(ps.separator).toBe('/');
    });
  });
});
