import { DefaultTreeWidget, DefaultTreeModel } from '../tree-widget';
import { ITreeNode } from '../types';
import { createTreeNode } from '../node-utils';

function makeNode(id: string, label: string, children: ITreeNode[] = []): ITreeNode {
  return createTreeNode(id, label, { children, expanded: false, selected: false });
}

describe('DefaultTreeModel', () => {
  it('should set and get roots', () => {
    const model = new DefaultTreeModel();
    const roots = [makeNode('r1', 'Root 1'), makeNode('r2', 'Root 2')];
    model.setRoots(roots);
    expect(model.getRoots()).toEqual(roots);
  });

  it('should return children', () => {
    const model = new DefaultTreeModel();
    const child = makeNode('c1', 'Child 1');
    const parent = makeNode('p1', 'Parent', [child]);
    expect(model.getChildren(parent)).toEqual([child]);
  });

  it('should return empty children for leaf', () => {
    const model = new DefaultTreeModel();
    const leaf = makeNode('l1', 'Leaf');
    expect(model.getChildren(leaf)).toEqual([]);
  });

  it('should detect expandable nodes', () => {
    const model = new DefaultTreeModel();
    const leaf = makeNode('l1', 'Leaf');
    expect(model.isExpandable(leaf)).toBe(false);
    const parent = makeNode('p1', 'Parent', [leaf]);
    expect(model.isExpandable(parent)).toBe(true);
  });

  it('should fire onNodeChanged on notifyChanged', () => {
    const model = new DefaultTreeModel();
    const listener = jest.fn();
    model.onNodeChanged(listener);
    const node = makeNode('n1', 'Node 1');
    model.notifyChanged(node);
    expect(listener).toHaveBeenCalledWith(node);
  });
});

describe('DefaultTreeWidget', () => {
  it('should create with id and title', () => {
    const w = new DefaultTreeWidget('tree-1', { label: 'Tree', closable: true });
    expect(w.id).toBe('tree-1');
    expect(w.title.label).toBe('Tree');
  });

  it('should set and get model', () => {
    const w = new DefaultTreeWidget('tree-2', { label: 'Tree', closable: true });
    const model = new DefaultTreeModel();
    w.setModel(model);
    expect(w.getModel()).toBe(model);
  });

  it('should return undefined model if not set', () => {
    const w = new DefaultTreeWidget('tree-3', { label: 'Tree', closable: true });
    expect(w.getModel()).toBeUndefined();
  });

  it('should expand all nodes', () => {
    const w = new DefaultTreeWidget('tree-4', { label: 'Tree', closable: true });
    const model = new DefaultTreeModel();
    const child = makeNode('c1', 'Child');
    const parent = makeNode('p1', 'Parent', [child]);
    model.setRoots([parent]);
    w.setModel(model);
    expect(parent.expanded).toBe(false);
    expect(child.expanded).toBe(false);
    w.expandAll();
    expect(parent.expanded).toBe(true);
    expect(child.expanded).toBe(true);
  });

  it('should collapse all nodes', () => {
    const w = new DefaultTreeWidget('tree-5', { label: 'Tree', closable: true });
    const model = new DefaultTreeModel();
    const child = makeNode('c1', 'Child');
    const parent = makeNode('p1', 'Parent', [child]);
    parent.expanded = true;
    child.expanded = true;
    model.setRoots([parent]);
    w.setModel(model);
    w.collapseAll();
    expect(parent.expanded).toBe(false);
    expect(child.expanded).toBe(false);
  });

  it('should handle expandAll without model', () => {
    const w = new DefaultTreeWidget('tree-6', { label: 'Tree', closable: true });
    expect(() => w.expandAll()).not.toThrow();
  });

  it('should handle collapseAll without model', () => {
    const w = new DefaultTreeWidget('tree-7', { label: 'Tree', closable: true });
    expect(() => w.collapseAll()).not.toThrow();
  });

  it('should filter nodes by label', () => {
    const w = new DefaultTreeWidget('tree-8', { label: 'Tree', closable: true });
    const model = new DefaultTreeModel();
    const node1 = makeNode('n1', 'Alpha');
    const node2 = makeNode('n2', 'Beta');
    model.setRoots([node1, node2]);
    w.setModel(model);
    w.filter('Alpha');
    const visible = w.getVisibleNodes();
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe('n1');
  });

  it('should filter nodes by description', () => {
    const w = new DefaultTreeWidget('tree-9', { label: 'Tree', closable: true });
    const model = new DefaultTreeModel();
    const node1 = makeNode('n1', 'X', []);
    node1.description = 'something special';
    const node2 = makeNode('n2', 'Y');
    model.setRoots([node1, node2]);
    w.setModel(model);
    w.filter('special');
    const visible = w.getVisibleNodes();
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe('n1');
  });

  it('should return all roots when filter is empty', () => {
    const w = new DefaultTreeWidget('tree-10', { label: 'Tree', closable: true });
    const model = new DefaultTreeModel();
    model.setRoots([makeNode('n1', 'Node 1'), makeNode('n2', 'Node 2')]);
    w.setModel(model);
    expect(w.getVisibleNodes()).toHaveLength(2);
  });

  it('should return empty array when no model', () => {
    const w = new DefaultTreeWidget('tree-11', { label: 'Tree', closable: true });
    expect(w.getVisibleNodes()).toEqual([]);
  });

  it('should track filter query', () => {
    const w = new DefaultTreeWidget('tree-12', { label: 'Tree', closable: true });
    expect(w.getFilter()).toBe('');
    w.filter('search-term');
    expect(w.getFilter()).toBe('search-term');
  });

  it('should filter child nodes recursively', () => {
    const w = new DefaultTreeWidget('tree-13', { label: 'Tree', closable: true });
    const model = new DefaultTreeModel();
    const grandchild = makeNode('gc1', 'Deep Target');
    const child = makeNode('c1', 'Middle', [grandchild]);
    const root = makeNode('r1', 'Root', [child]);
    model.setRoots([root]);
    w.setModel(model);
    w.filter('Deep');
    const visible = w.getVisibleNodes();
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe('r1');
    expect(visible[0].children).toHaveLength(1);
    expect(visible[0].children[0].id).toBe('c1');
    expect(visible[0].children[0].children[0].id).toBe('gc1');
  });

  it('should include parent without non-matching children', () => {
    const w = new DefaultTreeWidget('tree-14', { label: 'Tree', closable: true });
    const model = new DefaultTreeModel();
    const child = makeNode('c1', 'Other');
    const root = makeNode('r1', 'Special Root', [child]);
    model.setRoots([root]);
    w.setModel(model);
    w.filter('Special');
    const visible = w.getVisibleNodes();
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe('r1');
    expect(visible[0].children).toHaveLength(0);
  });
});
