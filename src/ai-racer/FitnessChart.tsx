// src/ai-racer/FitnessChart.tsx
// Tiny dependency-free SVG line chart of best/avg fitness per generation.

export interface FitnessPoint {
  generation: number;
  bestFitness: number;
  avgFitness: number;
}

const W = 640;
const H = 200;
const PAD_L = 44;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 26;

export function FitnessChart({ data }: { data: FitnessPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[140px] items-center justify-center text-xs text-zinc-500">
        Training data will appear here after the first generation…
      </div>
    );
  }

  const maxGen = Math.max(1, ...data.map(d => d.generation));
  const maxY = Math.max(1, ...data.map(d => d.bestFitness));

  const x = (gen: number) => PAD_L + ((gen - 1) / Math.max(1, maxGen - 1)) * (W - PAD_L - PAD_R);
  const y = (v: number) => H - PAD_B - (v / maxY) * (H - PAD_T - PAD_B);

  const line = (key: 'bestFitness' | 'avgFitness') =>
    data.map(d => `${x(d.generation).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ');

  const last = data[data.length - 1];

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Fitness over generations">
        {/* Axes */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="#3f3f46" strokeWidth={1} />
        <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="#3f3f46" strokeWidth={1} />

        {/* Y ticks */}
        {[0, 0.5, 1].map(t => (
          <g key={t}>
            <line x1={PAD_L - 3} y1={y(maxY * t)} x2={W - PAD_R} y2={y(maxY * t)} stroke="#27272a" strokeWidth={1} />
            <text x={PAD_L - 6} y={y(maxY * t) + 3} textAnchor="end" className="fill-zinc-500" fontSize={9} fontFamily="monospace">
              {Math.round(maxY * t)}
            </text>
          </g>
        ))}

        {/* Avg then best (best on top) */}
        <polyline points={line('avgFitness')} fill="none" stroke="#818cf8" strokeWidth={1.5} opacity={0.7} />
        <polyline points={line('bestFitness')} fill="none" stroke="#38e8ff" strokeWidth={2} />

        {/* X labels */}
        <text x={PAD_L} y={H - 8} textAnchor="start" className="fill-zinc-500" fontSize={9} fontFamily="monospace">gen 1</text>
        <text x={W - PAD_R} y={H - 8} textAnchor="end" className="fill-zinc-500" fontSize={9} fontFamily="monospace">gen {maxGen}</text>
      </svg>

      <div className="mt-1 flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm" style={{ background: '#38e8ff' }} />
          <span className="text-zinc-300">Best <span className="font-mono text-white">{Math.round(last.bestFitness)}</span></span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm" style={{ background: '#818cf8' }} />
          <span className="text-zinc-300">Avg <span className="font-mono text-white">{Math.round(last.avgFitness)}</span></span>
        </span>
        <span className="text-zinc-500">Generation {last.generation}</span>
      </div>
    </div>
  );
}
