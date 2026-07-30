import { findNodeById, flattenTree, countNodes, createTreeNode } from '../node-utils';
import { ITreeNode } from '../types';

function makeTree(): ITreeNode[] {
  return [
    {
      id: 'root1',
      label: 'Root 1',
      expanded: false,
      selected: false,
      children: [
        { id: 'child1', label: 'Child 1', expanded: false, selected: false, children: [] },
        {
          id: 'child2', label: 'Child 2', expanded: false, selected: false,
          children: [
            { id: 'grandchild1', label: 'Grandchild 1', expanded: false, selected: false, children: [] },
          ],
        },
      ],
    },
    { id: 'root2', label: 'Root 2', expanded: false, selected: false, children: [] },
  ];
}

describe('node-utils', () => {
  describe('findNodeById', () => {
    it('should find a node by id at root level', () => {
      const tree = makeTree();
      const found = findNodeById(tree, 'root1');
      expect(found).toBeDefined();
      expect(found!.id).toBe('root1');
      expect(found!.label).toBe('Root 1');
    });

    it('should find a nested node', () => {
      const tree = makeTree();
      const found = findNodeById(tree, 'grandchild1');
      expect(found).toBeDefined();
      expect(found!.id).toBe('grandchild1');
      expect(found!.label).toBe('Grandchild 1');
    });

    it('should return undefined for missing id', () => {
      const tree = makeTree();
      const found = findNodeById(tree, 'nonexistent');
      expect(found).toBeUndefined();
    });

    it('should return undefined for empty tree', () => {
      const found = findNodeById([], 'anything');
      expect(found).toBeUndefined();
    });
  });

  describe('flattenTree', () => {
    it('should flatten all nodes', () => {
      const tree = makeTree();
      const flat = flattenTree(tree);
      expect(flat).toHaveLength(5);
      expect(flat[0].id).toBe('root1');
      expect(flat[1].id).toBe('child1');
      expect(flat[2].id).toBe('child2');
      expect(flat[3].id).toBe('grandchild1');
      expect(flat[4].id).toBe('root2');
    });

    it('should return empty array for empty tree', () => {
      expect(flattenTree([])).toEqual([]);
    });

    it('should handle single node', () => {
      const single: ITreeNode[] = [{ id: 'only', label: 'Only', expanded: false, selected: false, children: [] }];
      expect(flattenTree(single)).toHaveLength(1);
    });
  });

  describe('countNodes', () => {
    it('should count all nodes', () => {
      const tree = makeTree();
      expect(countNodes(tree)).toBe(5);
    });

    it('should return 0 for empty tree', () => {
      expect(countNodes([])).toBe(0);
    });

    it('should count single root', () => {
      const single: ITreeNode[] = [{ id: 'only', label: 'Only', expanded: false, selected: false, children: [] }];
      expect(countNodes(single)).toBe(1);
    });

    it('should count deeply nested tree', () => {
      const deep: ITreeNode[] = [{
        id: 'l1', label: 'L1', expanded: false, selected: false,
        children: [{
          id: 'l2', label: 'L2', expanded: false, selected: false,
          children: [{
            id: 'l3', label: 'L3', expanded: false, selected: false,
            children: [],
          }],
        }],
      }];
      expect(countNodes(deep)).toBe(3);
    });
  });

  describe('createTreeNode', () => {
    it('should create a node with required fields', () => {
      const node = createTreeNode('n1', 'Node 1');
      expect(node.id).toBe('n1');
      expect(node.label).toBe('Node 1');
      expect(node.expanded).toBe(false);
      expect(node.selected).toBe(false);
      expect(node.children).toEqual([]);
    });

    it('should create a node with options', () => {
      const child = createTreeNode('c1', 'Child');
      const node = createTreeNode('n2', 'Node 2', {
        iconClass: 'icon-foo',
        description: 'A description',
        expanded: true,
        selected: true,
        children: [child],
        metadata: { key: 'value' },
      });
      expect(node.iconClass).toBe('icon-foo');
      expect(node.description).toBe('A description');
      expect(node.expanded).toBe(true);
      expect(node.selected).toBe(true);
      expect(node.children).toEqual([child]);
      expect(node.metadata).toEqual({ key: 'value' });
    });

    it('should default children to empty array', () => {
      const node = createTreeNode('n3', 'Node 3', { expanded: true });
      expect(node.children).toEqual([]);
    });
  });
});
