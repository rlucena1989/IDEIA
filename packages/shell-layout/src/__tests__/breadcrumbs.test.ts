import { DefaultBreadcrumbs } from '../breadcrumbs';
import { BreadcrumbSegment } from '../types';

describe('DefaultBreadcrumbs', () => {
  let breadcrumbs: DefaultBreadcrumbs;

  beforeEach(() => {
    breadcrumbs = new DefaultBreadcrumbs();
  });

  it('should start with empty path', () => {
    expect(breadcrumbs.getPath()).toEqual([]);
  });

  it('should set path', () => {
    const path: BreadcrumbSegment[] = [
      { id: 'workspace', label: 'my-project' },
      { id: 'src', label: 'src' },
      { id: 'file', label: 'index.ts' },
    ];
    breadcrumbs.setPath(path);
    expect(breadcrumbs.getPath()).toHaveLength(3);
  });

  it('should return a copy of path', () => {
    breadcrumbs.setPath([{ id: 'root', label: '/' }]);
    const path = breadcrumbs.getPath();
    path.push({ id: 'extra', label: 'extra' });
    expect(breadcrumbs.getPath()).toHaveLength(1);
  });

  it('should replace existing path on setPath', () => {
    breadcrumbs.setPath([{ id: 'old', label: 'old' }]);
    breadcrumbs.setPath([{ id: 'new', label: 'new' }]);
    expect(breadcrumbs.getPath()).toHaveLength(1);
    expect(breadcrumbs.getPath()[0].id).toBe('new');
  });

  it('should select a segment and truncate path', () => {
    const segments: BreadcrumbSegment[] = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ];
    breadcrumbs.setPath(segments);
    breadcrumbs.selectSegment(segments[1]);
    expect(breadcrumbs.getPath()).toHaveLength(2);
    expect(breadcrumbs.getPath()[0].id).toBe('a');
    expect(breadcrumbs.getPath()[1].id).toBe('b');
  });

  it('should fire onBreadcrumbSelected when segment selected', () => {
    const handler = jest.fn();
    breadcrumbs.onBreadcrumbSelected(handler);
    const segments = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ];
    breadcrumbs.setPath(segments);
    breadcrumbs.selectSegment(segments[1]);
    expect(handler).toHaveBeenCalledWith(segments[1]);
  });

  it('should not select a segment not in path', () => {
    const handler = jest.fn();
    breadcrumbs.onBreadcrumbSelected(handler);
    breadcrumbs.setPath([{ id: 'a', label: 'A' }]);
    breadcrumbs.selectSegment({ id: 'unknown', label: '?' });
    expect(handler).not.toHaveBeenCalled();
    expect(breadcrumbs.getPath()).toHaveLength(1);
  });

  it('should clear path', () => {
    breadcrumbs.setPath([{ id: 'a', label: 'A' }]);
    breadcrumbs.clear();
    expect(breadcrumbs.getPath()).toEqual([]);
  });

  it('should handle segments with optional fields', () => {
    breadcrumbs.setPath([
      { id: 'file', label: 'app.ts', iconClass: 'fa-file', uri: 'file:///app.ts' },
    ]);
    const path = breadcrumbs.getPath();
    expect(path[0].iconClass).toBe('fa-file');
    expect(path[0].uri).toBe('file:///app.ts');
  });
});
