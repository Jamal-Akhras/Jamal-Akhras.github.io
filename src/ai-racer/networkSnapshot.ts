import type { Genome, GenomeNode } from './ai/NEATController';

const W = 360;
const H = 220;
const PAD_X = 26;
const PAD_Y = 16;

export interface SnapNode {
  x: number;
  y: number;
  activation: number;
  type: string;
}

export interface SnapEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  weight: number;
}

export interface NetworkSnapshot {
  nodes: SnapNode[];
  edges: SnapEdge[];
}

export const NETWORK_VIEWBOX = { width: W, height: H };

/** Build a renderable snapshot with positions and live activations from a genome. */
export function buildNetworkSnapshot(genome: Genome): NetworkSnapshot {
  const nodes = genome.nodes;
  if (!nodes || nodes.length === 0) return { nodes: [], edges: [] };

  const index = new Map<GenomeNode, number>();
  nodes.forEach((n, i) => index.set(n, i));

  const depth = new Array<number>(nodes.length).fill(0);
  for (let iter = 0; iter < nodes.length; iter++) {
    let changed = false;
    for (const c of genome.connections) {
      const fi = index.get(c.from);
      const ti = index.get(c.to);
      if (fi == null || ti == null || fi === ti) continue;
      if (depth[ti] < depth[fi] + 1) {
        depth[ti] = depth[fi] + 1;
        changed = true;
      }
    }
    if (!changed) break;
  }

  let maxD = 0;
  for (let i = 0; i < nodes.length; i++) maxD = Math.max(maxD, depth[i]);
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].type === 'input') depth[i] = 0;
    else if (nodes[i].type === 'output') depth[i] = Math.max(1, maxD);
  }
  maxD = 0;
  for (let i = 0; i < nodes.length; i++) maxD = Math.max(maxD, depth[i]);

  const columns = new Map<number, number[]>();
  for (let i = 0; i < nodes.length; i++) {
    const d = depth[i];
    const col = columns.get(d);
    if (col) col.push(i);
    else columns.set(d, [i]);
  }

  const colX = (d: number) => (maxD === 0 ? W / 2 : PAD_X + (d / maxD) * (W - 2 * PAD_X));
  const pos = new Array<{ x: number; y: number }>(nodes.length);
  for (const [d, idxs] of columns) {
    idxs.forEach((i, k) => {
      const y = idxs.length === 1 ? H / 2 : PAD_Y + (k / (idxs.length - 1)) * (H - 2 * PAD_Y);
      pos[i] = { x: colX(d), y };
    });
  }

  const snapNodes: SnapNode[] = nodes.map((n, i) => ({
    x: pos[i].x,
    y: pos[i].y,
    activation: n.activation ?? 0,
    type: n.type,
  }));

  const edges: SnapEdge[] = [];
  for (const c of genome.connections) {
    const fi = index.get(c.from);
    const ti = index.get(c.to);
    if (fi == null || ti == null || fi === ti) continue;
    edges.push({ x1: pos[fi].x, y1: pos[fi].y, x2: pos[ti].x, y2: pos[ti].y, weight: c.weight });
  }

  return { nodes: snapNodes, edges };
}
