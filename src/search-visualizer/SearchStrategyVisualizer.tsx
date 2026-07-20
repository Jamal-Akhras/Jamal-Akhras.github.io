import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DecorativeBg from "../components/DecorativeBg";

type Terrain = "road" | "rough" | "heavy" | "wall";
type Tool = Terrain | "erase" | "start" | "end";
type CompareMode = "single" | "overlay" | "split";
type AlgorithmId = "astar" | "bidir-astar" | "dijkstra" | "bfs" | "dfs";

interface Point {
  r: number;
  c: number;
}

interface CellRun {
  key: string;
  order: number;
  side?: "start" | "end";
}

interface RunResult {
  algorithm: AlgorithmId;
  label: string;
  visited: CellRun[];
  path: string[];
  cost: number;
  elapsedMs: number;
  optimal: boolean;
  found: boolean;
}

const ROWS = 18;
const COLS = 30;
const startPoint: Point = { r: 8, c: 4 };
const endPoint: Point = { r: 8, c: 25 };

const ALGORITHMS: { id: AlgorithmId; label: string; color: string; optimal: boolean }[] = [
  { id: "astar", label: "A*", color: "#60a5fa", optimal: true },
  { id: "bidir-astar", label: "Bidirectional A*", color: "#22d3ee", optimal: false },
  { id: "dijkstra", label: "Dijkstra", color: "#f59e0b", optimal: true },
  { id: "bfs", label: "BFS", color: "#34d399", optimal: false },
  { id: "dfs", label: "DFS", color: "#f472b6", optimal: false },
];

const terrainCost: Record<Terrain, number> = {
  road: 1,
  rough: 4,
  heavy: 8,
  wall: Infinity,
};

function keyOf(p: Point) {
  return `${p.r},${p.c}`;
}

function parseKey(key: string): Point {
  const [r, c] = key.split(",").map(Number);
  return { r, c };
}

function makeBaseGrid(): Terrain[][] {
  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => {
      const key = keyOf({ r, c });
      if (key === keyOf(startPoint) || key === keyOf(endPoint)) return "road";

      const verticalWall =
        (c === 7 && r > 1 && r < 15 && ![3, 11].includes(r)) ||
        (c === 15 && r > 3 && r < 17 && ![6, 14].includes(r)) ||
        (c === 23 && r > 1 && r < 14 && ![5, 10].includes(r));
      const horizontalWall =
        (r === 5 && c > 3 && c < 13 && ![6, 10].includes(c)) ||
        (r === 10 && c > 10 && c < 25 && ![13, 21].includes(c)) ||
        (r === 14 && c > 2 && c < 19 && ![5, 16].includes(c));
      if (verticalWall || horizontalWall) return "wall";

      const heavyMarsh =
        (r >= 2 && r <= 4 && c >= 16 && c <= 22) ||
        (r >= 11 && r <= 13 && c >= 4 && c <= 11) ||
        (r >= 6 && r <= 8 && c >= 20 && c <= 27);
      if (heavyMarsh) return "heavy";

      const roughBands =
        (r === 3 && c > 7 && c < 16) ||
        (r === 7 && c > 1 && c < 14) ||
        (r === 12 && c > 14 && c < 28) ||
        (c === 11 && r > 5 && r < 15) ||
        (c === 19 && r > 1 && r < 11);
      if (roughBands) return "rough";

      return "road";
    }),
  );
}

function randomTerrain(): Terrain[][] {
  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => {
      if (keyOf({ r, c }) === keyOf(startPoint) || keyOf({ r, c }) === keyOf(endPoint)) return "road";
      const n = Math.sin(r * 12.9898 + c * 78.233) * 43758.5453;
      const x = n - Math.floor(n);
      const corridorBias = r === 3 || r === 8 || r === 14 || c === 5 || c === 16 || c === 25;
      if (!corridorBias && x > 0.82) return "wall";
      if (x > 0.68) return "heavy";
      if (x > 0.46) return "rough";
      return "road";
    }),
  );
}

function neighbors(p: Point, grid: Terrain[][]) {
  return [
    { r: p.r - 1, c: p.c },
    { r: p.r + 1, c: p.c },
    { r: p.r, c: p.c - 1 },
    { r: p.r, c: p.c + 1 },
  ].filter((n) => n.r >= 0 && n.r < ROWS && n.c >= 0 && n.c < COLS && grid[n.r][n.c] !== "wall");
}

function heuristic(a: Point, b: Point) {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
}

function reconstruct(prev: Map<string, string>, endKey: string) {
  const path = [endKey];
  let current = endKey;
  while (prev.has(current)) {
    current = prev.get(current)!;
    path.push(current);
  }
  return path.reverse();
}

function pathCost(path: string[], grid: Terrain[][]) {
  if (path.length === 0) return 0;
  return path.slice(1).reduce((sum, key) => {
    const p = parseKey(key);
    return sum + terrainCost[grid[p.r][p.c]];
  }, 0);
}

function runWeightedSearch(algorithm: AlgorithmId, grid: Terrain[][]): RunResult {
  const started = performance.now();
  const startKey = keyOf(startPoint);
  const endKey = keyOf(endPoint);
  const visited: CellRun[] = [];
  const seen = new Set<string>();
  const prev = new Map<string, string>();
  const dist = new Map<string, number>([[startKey, 0]]);
  const frontier: { key: string; priority: number }[] = [{ key: startKey, priority: 0 }];

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.priority - b.priority);
    const current = frontier.shift()!;
    if (seen.has(current.key)) continue;
    seen.add(current.key);
    visited.push({ key: current.key, order: visited.length, side: "start" });
    if (current.key === endKey) break;

    for (const n of neighbors(parseKey(current.key), grid)) {
      const nk = keyOf(n);
      const weight = algorithm === "bfs" ? 1 : terrainCost[grid[n.r][n.c]];
      const nextDist = (dist.get(current.key) ?? Infinity) + weight;
      if (nextDist < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, nextDist);
        prev.set(nk, current.key);
        const h = algorithm === "astar" ? heuristic(n, endPoint) : 0;
        frontier.push({ key: nk, priority: nextDist + h });
      }
    }
  }

  const path = prev.has(endKey) || startKey === endKey ? reconstruct(prev, endKey) : [];
  return {
    algorithm,
    label: ALGORITHMS.find((a) => a.id === algorithm)!.label,
    visited,
    path,
    cost: pathCost(path, grid),
    elapsedMs: performance.now() - started,
    optimal: algorithm !== "bfs",
    found: path.length > 0,
  };
}

function runDfs(grid: Terrain[][]): RunResult {
  const started = performance.now();
  const endKey = keyOf(endPoint);
  const visited: CellRun[] = [];
  const seen = new Set<string>();
  const prev = new Map<string, string>();
  const stack = [startPoint];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const ck = keyOf(current);
    if (seen.has(ck)) continue;
    seen.add(ck);
    visited.push({ key: ck, order: visited.length, side: "start" });
    if (ck === endKey) break;
    for (const n of neighbors(current, grid).reverse()) {
      const nk = keyOf(n);
      if (!seen.has(nk)) {
        if (!prev.has(nk)) prev.set(nk, ck);
        stack.push(n);
      }
    }
  }

  const path = prev.has(endKey) ? reconstruct(prev, endKey) : [];
  return {
    algorithm: "dfs",
    label: "DFS",
    visited,
    path,
    cost: pathCost(path, grid),
    elapsedMs: performance.now() - started,
    optimal: false,
    found: path.length > 0,
  };
}

function runBidirectionalAstar(grid: Terrain[][]): RunResult {
  const started = performance.now();
  const startKey = keyOf(startPoint);
  const endKey = keyOf(endPoint);
  const visited: CellRun[] = [];
  const seenA = new Set<string>();
  const seenB = new Set<string>();
  const prevA = new Map<string, string>();
  const prevB = new Map<string, string>();
  const distA = new Map<string, number>([[startKey, 0]]);
  const distB = new Map<string, number>([[endKey, 0]]);
  const openA: { key: string; priority: number }[] = [{ key: startKey, priority: 0 }];
  const openB: { key: string; priority: number }[] = [{ key: endKey, priority: 0 }];
  let meet: string | null = null;

  const step = (
    open: { key: string; priority: number }[],
    seen: Set<string>,
    otherSeen: Set<string>,
    dist: Map<string, number>,
    prev: Map<string, string>,
    target: Point,
    side: "start" | "end",
  ) => {
    open.sort((a, b) => a.priority - b.priority);
    const current = open.shift();
    if (!current || seen.has(current.key)) return null;
    seen.add(current.key);
    visited.push({ key: current.key, order: visited.length, side });
    if (otherSeen.has(current.key)) return current.key;
    for (const n of neighbors(parseKey(current.key), grid)) {
      const nk = keyOf(n);
      const nextDist = (dist.get(current.key) ?? Infinity) + terrainCost[grid[n.r][n.c]];
      if (nextDist < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, nextDist);
        prev.set(nk, current.key);
        open.push({ key: nk, priority: nextDist + heuristic(n, target) });
      }
    }
    return null;
  };

  while (openA.length > 0 && openB.length > 0 && !meet) {
    meet = step(openA, seenA, seenB, distA, prevA, endPoint, "start");
    if (!meet) meet = step(openB, seenB, seenA, distB, prevB, startPoint, "end");
  }

  let path: string[] = [];
  if (meet) {
    const left = reconstruct(prevA, meet);
    const right = reconstruct(prevB, meet).reverse();
    path = [...left, ...right.slice(1)];
  }

  return {
    algorithm: "bidir-astar",
    label: "Bidirectional A*",
    visited,
    path,
    cost: pathCost(path, grid),
    elapsedMs: performance.now() - started,
    optimal: false,
    found: path.length > 0,
  };
}

function runAlgorithm(algorithm: AlgorithmId, grid: Terrain[][]) {
  if (algorithm === "dfs") return runDfs(grid);
  if (algorithm === "bidir-astar") return runBidirectionalAstar(grid);
  return runWeightedSearch(algorithm, grid);
}

function terrainClass(t: Terrain) {
  if (t === "wall") return "bg-zinc-950";
  if (t === "heavy") return "bg-cyan-950/80";
  if (t === "rough") return "bg-amber-900/50";
  return "bg-zinc-900/60";
}

function SearchGrid({
  grid,
  runs,
  active,
  frameLimit,
  tool,
  setCell,
}: {
  grid: Terrain[][];
  runs: RunResult[];
  active: AlgorithmId;
  frameLimit?: number;
  tool?: Tool;
  setCell?: (r: number, c: number) => void;
}) {
  const activeRun = runs.find((run) => run.algorithm === active);
  const visited = new Map<string, CellRun>();
  const path = new Set<string>();
  const visitedCount = activeRun?.visited.length ?? 0;
  const pathCount = activeRun?.path.length ?? 0;
  const limit = frameLimit ?? visitedCount + pathCount;
  const visitedLimit = Math.min(limit, Math.max(0, visitedCount - 1));
  const pathLimit = Math.max(-1, limit - visitedCount);
  const visiblePath = activeRun?.path.slice(0, Math.min(pathCount, pathLimit + 1)) ?? [];
  activeRun?.visited.filter((v) => v.order <= visitedLimit).forEach((v) => visited.set(v.key, v));
  visiblePath.forEach((p) => path.add(p));
  const maxOrder = Math.max(1, activeRun?.visited.length ?? 1);
  const pathPoints = visiblePath.map((key) => {
    const p = parseKey(key);
    return `${p.c + 0.5},${p.r + 0.5}`;
  });

  return (
    <div className="relative rounded-2xl border border-white/10 bg-black/30 p-2 shadow-2xl">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
        {grid.map((row, r) =>
          row.map((terrain, c) => {
            const key = keyOf({ r, c });
            const isStart = key === keyOf(startPoint);
            const isEnd = key === keyOf(endPoint);
            const v = visited.get(key);
            const orderOpacity = v ? 0.18 + (v.order / maxOrder) * 0.5 : 0;
            const sideClass = v?.side === "end" ? "bg-pink-400" : "bg-cyan-400";
            const inPath = path.has(key);

            return (
              <button
                key={key}
                type="button"
                onMouseDown={() => setCell?.(r, c)}
                onMouseEnter={(e) => {
                  if (e.buttons === 1) setCell?.(r, c);
                }}
                className={`relative aspect-square border border-white/[0.045] ${terrainClass(terrain)} ${tool ? "cursor-crosshair" : "cursor-default"}`}
                aria-label={`row ${r + 1}, column ${c + 1}`}
              >
                {v && <span className={`absolute inset-0 ${sideClass}`} style={{ opacity: orderOpacity }} />}
                {inPath && <span className="absolute inset-[36%] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]" />}
                {isStart && <span className="absolute inset-[18%] rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />}
                {isEnd && <span className="absolute inset-[18%] rounded-full bg-pink-400 shadow-[0_0_12px_rgba(244,114,182,0.9)]" />}
              </button>
            );
          }),
        )}
      </div>
      {pathPoints.length > 1 && (
        <svg className="pointer-events-none absolute inset-2" viewBox={`0 0 ${COLS} ${ROWS}`} preserveAspectRatio="none" aria-hidden="true">
          <polyline
            points={pathPoints.join(" ")}
            fill="none"
            stroke="rgba(255,255,255,0.95)"
            strokeWidth="0.16"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="0.28 0.22"
            className="drop-shadow-[0_0_8px_rgba(255,255,255,0.85)]"
          />
        </svg>
      )}
    </div>
  );
}

export default function SearchStrategyVisualizer() {
  const [grid, setGrid] = useState(makeBaseGrid);
  const [tool, setTool] = useState<Tool>("wall");
  const [activeAlgorithms, setActiveAlgorithms] = useState<AlgorithmId[]>(["astar", "bidir-astar"]);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<AlgorithmId>("bidir-astar");
  const [compareMode, setCompareMode] = useState<CompareMode>("overlay");
  const [replayStep, setReplayStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(35);

  const runs = useMemo(
    () => activeAlgorithms.map((algorithm) => runAlgorithm(algorithm, grid)),
    [activeAlgorithms, grid],
  );

  const selectedRun = runs.find((run) => run.algorithm === selectedAlgorithm) ?? runs[0];

  const overlayRun = useMemo<RunResult>(() => {
    const visited: CellRun[] = [];
    runs.forEach((run) => {
      run.visited.forEach((v) => visited.push({ ...v, order: visited.length }));
    });
    return {
      algorithm: selectedAlgorithm,
      label: "Overlay",
      visited,
      path: selectedRun?.path ?? [],
      cost: selectedRun?.cost ?? 0,
      elapsedMs: 0,
      optimal: false,
      found: runs.some((run) => run.found),
    };
  }, [runs, selectedAlgorithm, selectedRun]);

  const replayRun = compareMode === "overlay" ? overlayRun : selectedRun;
  const maxReplayStep = Math.max(0, (replayRun?.visited.length ?? 0) + (replayRun?.path.length ?? 0) - 1);

  useEffect(() => {
    setIsPlaying(false);
    setReplayStep(maxReplayStep);
  }, [maxReplayStep, compareMode]);

  useEffect(() => {
    if (!isPlaying) return;
    if (replayStep >= maxReplayStep) {
      setIsPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setReplayStep((step) => Math.min(maxReplayStep, step + 1));
    }, speed);
    return () => window.clearTimeout(timer);
  }, [isPlaying, maxReplayStep, replayStep, speed]);

  const setCell = (r: number, c: number) => {
    const key = keyOf({ r, c });
    if (key === keyOf(startPoint) || key === keyOf(endPoint)) return;
    setGrid((current) =>
      current.map((row, rr) =>
        row.map((cell, cc) => {
          if (rr !== r || cc !== c) return cell;
          if (tool === "erase" || tool === "start" || tool === "end") return "road";
          return tool;
        }),
      ),
    );
  };

  const toggleAlgorithm = (id: AlgorithmId) => {
    setActiveAlgorithms((current) => {
      if (current.includes(id)) {
        if (current.length === 1) return current;
        const next = current.filter((a) => a !== id);
        if (selectedAlgorithm === id) setSelectedAlgorithm(next[0]);
        return next;
      }
      return [...current, id];
    });
    setSelectedAlgorithm(id);
  };

  return (
    <div className="relative min-h-screen text-white">
      <DecorativeBg />
      <header className="sticky top-0 z-50 border-b border-white/10 backdrop-blur supports-[backdrop-filter]:bg-[#0b0c10]/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-lg font-extrabold tracking-tight">
            J<span className="text-indigo-400">.</span>
          </Link>
          <nav className="flex items-center gap-1 text-zinc-300">
            <Link to="/" className="rounded-xl px-3 py-2 hover:bg-white/5">Home</Link>
            <Link to="/projects" className="rounded-xl px-3 py-2 hover:bg-white/5">Projects</Link>
            <span className="rounded-xl bg-white/5 px-3 py-2">Search</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-6">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-zinc-500">Route-planning sandbox</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Search Strategy Visualizer</h1>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Compare classical search strategies on weighted terrain. Bidirectional A* runs two frontiers at once,
            making the meeting point visible instead of just showing the final route. BFS is treated as unweighted;
            Dijkstra and A* account for terrain costs.
          </p>
        </section>

        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur">
              <div className="mb-3 text-sm font-semibold">Algorithms</div>
              <div className="grid gap-2">
                {ALGORITHMS.map((algo) => (
                  <button
                    key={algo.id}
                    onClick={() => toggleAlgorithm(algo.id)}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                      activeAlgorithms.includes(algo.id) ? "border-white/20 bg-white/10 text-white" : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10"
                    }`}
                  >
                    <span>{algo.label}</span>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: algo.color }} />
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur">
              <div className="mb-3 text-sm font-semibold">Draw terrain</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["wall", "Wall"],
                  ["rough", "Rough"],
                  ["heavy", "Heavy"],
                  ["erase", "Erase"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setTool(id as Tool)}
                    className={`rounded-xl border px-3 py-2 text-sm ${tool === id ? "border-indigo-400 bg-indigo-400/15 text-white" : "border-white/10 bg-white/5 text-zinc-300"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur">
              <div className="mb-3 text-sm font-semibold">Compare</div>
              <div className="grid gap-2">
                {[
                  ["single", "Single run"],
                  ["overlay", "Overlay"],
                  ["split", "Split compare"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setCompareMode(id as CompareMode)}
                    className={`rounded-xl border px-3 py-2 text-left text-sm ${compareMode === id ? "border-pink-400 bg-pink-400/15 text-white" : "border-white/10 bg-white/5 text-zinc-300"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setGrid(makeBaseGrid())} className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15">
                Reset
              </button>
              <button onClick={() => setGrid(randomTerrain())} className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15">
                Random
              </button>
            </div>
          </aside>

          <section className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-sm font-semibold">Replay search</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    Showing frame <span className="font-mono text-zinc-300">{Math.min(replayStep + 1, maxReplayStep + 1)}</span> of{" "}
                    <span className="font-mono text-zinc-300">{maxReplayStep + 1}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setReplayStep(0);
                      setIsPlaying(true);
                    }}
                    className="rounded-xl bg-indigo-500/80 px-3 py-2 text-sm font-semibold hover:bg-indigo-500"
                  >
                    Replay
                  </button>
                  <button
                    onClick={() => setIsPlaying((playing) => !playing)}
                    className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"
                  >
                    {isPlaying ? "Pause" : "Play"}
                  </button>
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setReplayStep(maxReplayStep);
                    }}
                    className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"
                  >
                    Finish
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px] md:items-center">
                <input
                  type="range"
                  min={0}
                  max={maxReplayStep}
                  value={Math.min(replayStep, maxReplayStep)}
                  onChange={(event) => {
                    setIsPlaying(false);
                    setReplayStep(Number(event.target.value));
                  }}
                  className="w-full accent-indigo-400"
                />
                <label className="flex items-center gap-3 text-xs text-zinc-400">
                  Speed
                  <input
                    type="range"
                    min={10}
                    max={120}
                    step={5}
                    value={speed}
                    onChange={(event) => setSpeed(Number(event.target.value))}
                    className="w-full accent-pink-400"
                  />
                </label>
              </div>
            </div>

            {compareMode === "split" ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {runs.map((run) => (
                  <div key={run.algorithm}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-semibold">{run.label}</span>
                      <span className="text-zinc-500">{run.visited.length} explored</span>
                    </div>
                    <SearchGrid grid={grid} runs={[run]} active={run.algorithm} frameLimit={Math.min(replayStep, Math.max(0, run.visited.length - 1))} />
                  </div>
                ))}
              </div>
            ) : (
              <SearchGrid
                grid={grid}
                runs={compareMode === "overlay" ? [overlayRun] : runs}
                active={compareMode === "single" ? selectedAlgorithm : overlayRun.algorithm}
                frameLimit={replayStep}
                tool={tool}
                setCell={setCell}
              />
            )}

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/35 backdrop-blur">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Strategy</th>
                    <th className="px-4 py-3">Explored</th>
                    <th className="px-4 py-3">Path cost</th>
                    <th className="px-4 py-3">Path length</th>
                    <th className="px-4 py-3">Weighted optimal</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr
                      key={run.algorithm}
                      onClick={() => setSelectedAlgorithm(run.algorithm)}
                      className={`cursor-pointer border-b border-white/5 last:border-b-0 ${selectedAlgorithm === run.algorithm ? "bg-white/10" : "hover:bg-white/5"}`}
                    >
                      <td className="px-4 py-3 font-semibold">{run.label}</td>
                      <td className="px-4 py-3 text-zinc-300">{run.visited.length}</td>
                      <td className="px-4 py-3 text-zinc-300">{run.found ? run.cost : "No route"}</td>
                      <td className="px-4 py-3 text-zinc-300">{run.found ? run.path.length : "No route"}</td>
                      <td className="px-4 py-3 text-zinc-300">{run.optimal ? "Yes" : "Heuristic"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
