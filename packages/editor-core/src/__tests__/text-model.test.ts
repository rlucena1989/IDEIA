import { DefaultTextModel, TextModelService } from '../text-model';

describe('DefaultTextModel', () => {
  const uri = 'file:///test.ts';
  let model: DefaultTextModel;

  beforeEach(() => {
    model = new DefaultTextModel(uri);
  });

  describe('constructor', () => {
    it('stores the uri', () => {
      expect(model.uri).toBe(uri);
    });

    it('starts with empty content', () => {
      expect(model.getContent()).toBe('');
    });
  });

  describe('getContent', () => {
    it('returns the current content', () => {
      model.setContent('line1\nline2\nline3');
      expect(model.getContent()).toBe('line1\nline2\nline3');
    });
  });

  describe('setContent', () => {
    it('updates the content', () => {
      model.setContent('new content');
      expect(model.getContent()).toBe('new content');
    });

    it('marks the model as dirty', () => {
      expect(model.isDirty()).toBe(false);
      model.setContent('content');
      expect(model.isDirty()).toBe(true);
    });

    it('fires onContentChanged event', () => {
      const handler = jest.fn();
      model.onContentChanged(handler);
      model.setContent('new content');
      expect(handler).toHaveBeenCalledWith('new content');
    });
  });

  describe('getLineCount', () => {
    it('returns 0 for empty content', () => {
      expect(model.getLineCount()).toBe(0);
    });

    it('returns 1 for a single line', () => {
      model.setContent('single line');
      expect(model.getLineCount()).toBe(1);
    });

    it('returns the correct line count for multiple lines', () => {
      model.setContent('line1\nline2\nline3');
      expect(model.getLineCount()).toBe(3);
    });
  });

  describe('getLineContent', () => {
    it('returns empty string for line beyond content', () => {
      model.setContent('line1');
      expect(model.getLineContent(5)).toBe('');
    });

    it('returns empty string for line 0 (1-indexed)', () => {
      model.setContent('line1');
      expect(model.getLineContent(0)).toBe('');
    });

    it('returns the correct line content', () => {
      model.setContent('line1\nline2\nline3');
      expect(model.getLineContent(1)).toBe('line1');
      expect(model.getLineContent(2)).toBe('line2');
      expect(model.getLineContent(3)).toBe('line3');
    });
  });

  describe('getEncoding', () => {
    it('returns utf-8 by default', () => {
      expect(model.getEncoding()).toBe('utf-8');
    });
  });

  describe('setEncoding', () => {
    it('updates the encoding', () => {
      model.setEncoding('utf-16');
      expect(model.getEncoding()).toBe('utf-16');
    });
  });

  describe('isDirty', () => {
    it('returns false for a new model', () => {
      expect(model.isDirty()).toBe(false);
    });

    it('returns true after content change', () => {
      model.setContent('new content');
      expect(model.isDirty()).toBe(true);
    });
  });

  describe('markClean', () => {
    it('resets the dirty flag', () => {
      model.setContent('content');
      expect(model.isDirty()).toBe(true);
      model.markClean();
      expect(model.isDirty()).toBe(false);
    });
  });
});

describe('TextModelService', () => {
  let service: TextModelService;

  beforeEach(() => {
    service = new TextModelService();
  });

  describe('createModel', () => {
    it('creates a new model with the given uri', () => {
      const model = service.createModel('file:///test.ts');
      expect(model.uri).toBe('file:///test.ts');
      expect(model.getContent()).toBe('');
    });

    it('creates a model with initial content', () => {
      const model = service.createModel('file:///test.ts', 'initial content');
      expect(model.getContent()).toBe('initial content');
    });

    it('returns existing model for the same uri', () => {
      const model1 = service.createModel('file:///test.ts');
      const model2 = service.createModel('file:///test.ts');
      expect(model1).toBe(model2);
    });
  });

  describe('getModel', () => {
    it('returns undefined for unknown uri', () => {
      expect(service.getModel('file:///unknown.ts')).toBeUndefined();
    });

    it('returns the model for a known uri', () => {
      const model = service.createModel('file:///test.ts');
      expect(service.getModel('file:///test.ts')).toBe(model);
    });
  });

  describe('removeModel', () => {
    it('removes the model from the service', () => {
      service.createModel('file:///test.ts');
      expect(service.getModel('file:///test.ts')).toBeDefined();
      service.removeModel('file:///test.ts');
      expect(service.getModel('file:///test.ts')).toBeUndefined();
    });

    it('does nothing for unknown uri', () => {
      expect(() => service.removeModel('file:///unknown.ts')).not.toThrow();
    });
  });
});
