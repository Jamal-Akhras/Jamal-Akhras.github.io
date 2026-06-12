// src/ai-racer/NetworkView.tsx
// Live view of a genome's neural network. The layout is derived from the actual
// topology (nodes laid out by graph depth), so it mirrors whatever architecture
// the network has — extra hidden layers show up as extra columns, and any nodes
// NEAT adds appear automatically.
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

/** Build a renderable snapshot (positions + live activations) from a genome. */
export function buildNetworkSnapshot(genome: Genome): NetworkSnapshot {
  const nodes = genome.nodes;
  if (!nodes || nodes.length === 0) return { nodes: [], edges: [] };

  const index = new Map<GenomeNode, number>();
  nodes.forEach((n, i) => index.set(n, i));

  // Layer each node by longest path from the inputs (feedforward depth).
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
  // Pin inputs to the first column and outputs to the last.
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

function lerpChannel(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

// dark slate -> bright cyan as a node "fires"
function activationColor(a: number): string {
  const t = Math.max(0, Math.min(1, a));
  const r = lerpChannel(0x1e, 0x38, t);
  const g = lerpChannel(0x29, 0xe8, t);
  const b = lerpChannel(0x3b, 0xff, t);
  return `rgb(${r},${g},${b})`;
}

export function NetworkView({ snapshot }: { snapshot: NetworkSnapshot | null }) {
  if (!snapshot || snapshot.nodes.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-xs text-zinc-500">
        The leader's network will light up here once training starts…
      </div>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Leading car's neural network">
      {snapshot.edges.map((e, i) => (
        <line
          key={i}
          x1={e.x1}
          y1={e.y1}
          x2={e.x2}
          y2={e.y2}
          stroke={e.weight >= 0 ? '#38bdf8' : '#f472b6'}
          strokeWidth={Math.min(2.5, 0.4 + Math.abs(e.weight) * 0.6)}
          opacity={Math.min(0.85, 0.1 + Math.abs(e.weight) * 0.3)}
        />
      ))}
      {snapshot.nodes.map((n, i) => (
        <circle
          key={i}
          cx={n.x}
          cy={n.y}
          r={n.type === 'output' ? 6 : n.type === 'input' ? 4 : 5}
          fill={activationColor(n.activation)}
          stroke={n.type === 'output' ? '#f472b6' : '#334155'}
          strokeWidth={1}
        />
      ))}
    </svg>
  );
}
