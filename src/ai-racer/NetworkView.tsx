// Live view of a genome's neural network. The layout is derived from the actual
// topology, so extra hidden layers and NEAT-added nodes appear automatically.
import { NETWORK_VIEWBOX, type NetworkSnapshot } from './networkSnapshot';

function lerpChannel(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

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
        The leader's network will light up here once training starts...
      </div>
    );
  }

  const { width, height } = NETWORK_VIEWBOX;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Leading car's neural network">
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
