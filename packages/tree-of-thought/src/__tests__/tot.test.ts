import { TreeOfThought } from '../tree-of-thought'

describe('TreeOfThought', () => {
  it('should create a tree with root', () => {
    const tot = new TreeOfThought('bfs')
    const tree = tot.getTree()
    expect(tree.rootId).toContain('thought')
    expect(tree.nodes.size).toBe(1)
  })

  it('should expand nodes', () => {
    const tot = new TreeOfThought('bfs', 3, 2)
    const root = tot.getTree().rootId
    const children = tot.expand(root, ['solve x', 'solve y', 'solve z'])
    expect(children.length).toBe(2)
    expect(tot.getNode(children[0].id)).toBeDefined()
  })

  it('should evaluate nodes', () => {
    const tot = new TreeOfThought('bfs')
    const root = tot.getTree().rootId
    const result = tot.evaluate(root, 0.85, 0.9)
    expect(result.score).toBe(0.85)
    expect(result.isPromising).toBe(true)
  })

  it('should run BFS search', () => {
    const tot = new TreeOfThought('bfs', 3, 2)
    const root = tot.getTree().rootId
    tot.evaluate(root, 0.5, 1)
    const children = tot.expand(root, ['approach a', 'approach b'])
    children.forEach(c => tot.evaluate(c.id, 0.7, 0.8))
    const result = tot.search()
    expect(result.bestPath.length).toBeGreaterThan(0)
    expect(result.nodesExplored).toBeGreaterThan(0)
  })

  it('should run DFS search', () => {
    const tot = new TreeOfThought('dfs')
    const result = tot.search()
    expect(result.bestValue).toBe(0)
  })

  it('should run beam search', () => {
    const tot = new TreeOfThought('beam', 3, 2)
    const root = tot.getTree().rootId
    const children = tot.expand(root, ['a', 'b'])
    children.forEach(c => tot.evaluate(c.id, 0.8, 0.9))
    const result = tot.search()
    expect(result).toBeDefined()
  })
})
