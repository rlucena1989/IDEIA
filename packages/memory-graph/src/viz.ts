import fs from 'fs';
import { createLogger } from '@ideia/logger';
import path from 'path';
import { MemoryGraph } from './graph';
const logger = createLogger('viz');

export function generateHtmlViz(
  graph: MemoryGraph,
  title = 'Memory Graph',
  width = 1200,
  height = 800,
): string {
  const nodes = (graph as any).getAllNodes();
  const edges = (graph as any).getAllEdges();

  const nodeColors: Record<string, string> = {
    decision: '#4f46e5', pattern: '#0891b2', artifact: '#059669',
    memory: '#d97706', error: '#dc2626', external: '#7c3aed',
    agent: '#0ea5e9', task: '#f59e0b', event: '#84cc16',
    insight: '#ec4899', document: '#6366f1',
  };

  const edgesJson = JSON.stringify(edges.map((e: any) => ({
    source: e.source, target: e.target, relation: e.relation, weight: e.weight,
  })));

  const nodesJson = JSON.stringify(nodes.map((n: any) => ({
    id: n.id, label: n.label, type: n.type, weight: n.weight, tags: n.tags,
    color: nodeColors[n.type] || '#6b7280',
  })));

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><title>${title}</title>
<script src="https://d3js.org/d3.v7.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#111827;color:#f3f4f6;overflow:hidden}
#container{width:100vw;height:100vh}
svg{display:block}
.node-label{font-size:12px;fill:#d1d5db;pointer-events:none;text-shadow:0 0 4px #000}
.tooltip{position:fixed;background:#1f2937;border:1px solid #374151;border-radius:8px;padding:12px;font-size:13px;max-width:320px;pointer-events:none;opacity:0;transition:opacity .15s;z-index:1000;box-shadow:0 4px 20px rgba(0,0,0,.5)}
.tooltip.visible{opacity:1}
.tooltip h3{margin:0 0 6px;color:#f9fafb;font-size:14px}
.tooltip p{margin:2px 0;color:#9ca3af}
.tooltip .tag{display:inline-block;background:#374151;padding:2px 8px;border-radius:4px;margin:2px;font-size:11px;color:#d1d5db}
.legend{position:fixed;bottom:20px;left:20px;background:#1f2937;border:1px solid #374151;border-radius:8px;padding:12px;font-size:12px}
.legend-item{display:flex;align-items:center;gap:8px;margin:4px 0}
.legend-dot{width:10px;height:10px;border-radius:50%}
.controls{position:fixed;top:20px;right:20px;display:flex;gap:8px}
.controls button{background:#374151;border:1px solid #4b5563;color:#f3f4f6;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px}
.controls button:hover{background:#4b5563}
.info{position:fixed;top:20px;left:20px;background:#1f2937;border:1px solid #374151;border-radius:8px;padding:12px;font-size:13px;color:#9ca3af}
</style></head><body>
<div id="info" class="info">Nodes: ${nodes.length} | Edges: ${edges.length}</div>
<div class="controls">
<button onclick="zoomIn()">+</button>
<button onclick="zoomOut()">-</button>
<button onclick="resetView()">Reset</button>
<button onclick="toggleLabels()">Labels</button>
</div>
<div class="legend" id="legend"></div>
<div class="tooltip" id="tooltip"></div>
<div id="container"></div>
<script>
const nodes = ${nodesJson};
const edges = ${edgesJson};
const nodeColors = ${JSON.stringify(nodeColors)};

const width = ${width};
const height = ${height};
let showLabels = true;
const tooltip = d3.select('#tooltip');

const legendColors = Object.entries(${JSON.stringify(nodeColors)});
const legendHtml = legendColors.map(([type, color]) =>
  '<div class="legend-item"><span class="legend-dot" style="background:'+color+'"></span>'+type+'</div>'
).join('');
document.getElementById('legend').innerHTML = legendHtml;

const svg = d3.select('#container').append('svg')
  .attr('width', width).attr('height', height);

const g = svg.append('g');

const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(edges).id((d) => d.id)
    .distance(d => 200 * (1 - (d.weight || 0.5)))
    .strength(d => d.weight || 0.5))
  .force('charge', d3.forceManyBody().strength(-300))
  .force('center', d3.forceCenter(width/2, height/2))
  .force('collision', d3.forceCollide().radius(30));

const link = g.append('g').selectAll('line')
  .data(edges).join('line')
  .attr('stroke', '#4b5563')
  .attr('stroke-width', d => Math.max(1, (d.weight||0.5)*3))
  .attr('stroke-opacity', 0.6)
  .attr('stroke-dasharray', '4,2');

const node = g.append('g').selectAll('circle')
  .data(nodes).join('circle')
  .attr('r', d => 5 + (d.weight||1)*10)
  .attr('fill', d => d.color)
  .attr('stroke', '#1f2937')
  .attr('stroke-width', 2)
  .style('cursor', 'pointer')
  .call(d3.drag()
    .on('start', (e, d) => { if(!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
    .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
    .on('end', (e, d) => { if(!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
  );

const labels = g.append('g').selectAll('text')
  .data(nodes).join('text')
  .text(d => d.label.length > 30 ? d.label.slice(0,27)+'...' : d.label)
  .attr('class', 'node-label')
  .attr('dx', 12).attr('dy', 4);

simulation.on('tick', () => {
  link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
  node.attr('cx', d => d.x).attr('cy', d => d.y);
  labels.attr('x', d => d.x).attr('y', d => d.y);
});

node.on('mouseenter', (e, d) => {
  tooltip.html('<h3>'+d.label+'</h3><p>Type: '+d.type+'</p><p>Weight: '+d.weight.toFixed(2)+'</p><p>Tags: '+d.tags.map(t=>'<span class="tag">'+t+'</span>').join('')+'</p>')
    .style('left', e.pageX+16+'px').style('top', e.pageY-10+'px')
    .classed('visible', true);
  d3.select(e.currentTarget).attr('stroke', '#f9fafb').attr('stroke-width', 3);
}).on('mouseleave', (e) => {
  tooltip.classed('visible', false);
  d3.select(e.currentTarget).attr('stroke', '#1f2937').attr('stroke-width', 2);
}).on('click', (e, d) => {
  alert('Node: '+d.label+'\\nType: '+d.type+'\\nID: '+d.id+'\\nWeight: '+d.weight+'\\nTags: '+d.tags.join(', '));
});

const zoom = d3.zoom().scaleExtent([0.1, 10]).on('zoom', (e) => g.attr('transform', e.transform));
svg.call(zoom);

function zoomIn() { svg.transition().duration(300).call(zoom.scaleBy, 1.3); }
function zoomOut() { svg.transition().duration(300).call(zoom.scaleBy, 0.7); }
function resetView() { svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity); }
function toggleLabels() { showLabels = !showLabels; labels.attr('display', showLabels ? 'block' : 'none'); }
</script></body></html>`;
}

export function exportHtmlViz(graph: MemoryGraph, filePath: string): void {
  const html = generateHtmlViz(graph);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, html, 'utf-8');
}
