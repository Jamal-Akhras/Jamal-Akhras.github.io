import { memo, useMemo, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import type { ActiveNode } from "../../constants/terminalContent";

interface NeuralNetworkProps {
  activeNode: ActiveNode;
  setActiveNode: (node: ActiveNode) => void;
  isActive: boolean;
}

// Node data
const INPUT_NODES = [
  { id: "python", label: "Machine Learning", y: 50 },
  { id: "typescript", label: "Full-Stack Web", y: 115 },
  { id: "rl", label: "Reinforcement Learning", y: 180 },
  { id: "control", label: "Control Systems", y: 245 },
];

const CORE_NODE = { id: "core", label: "CORE", y: 100 };
const VALUES_NODE = { id: "values", label: "VALUES", y: 195 };

const PROCESSING_NODES = [
  { id: "academics", label: "Academics", y: 70 },
  { id: "athletics", label: "Athletics", y: 147 },
  { id: "interests", label: "Interests", y: 224 },
];

const OUTPUT_NODES = [
  { id: "dino", label: "Steve", subtitle: "Dino Game", y: 108, path: "/dino-game" },
  { id: "racer", label: "AI Racer", subtitle: "Racing Game", y: 186, path: "/ai-racer" },
];

// Which input skills "feed" each clickable node — fixed so the lit connections
// are consistent and meaningful rather than random. Indices into INPUT_NODES.
const INPUT_MAP: Record<string, number[]> = {
  core: [0, 1, 2], // Machine Learning, Full-Stack Web, RL
  values: [2, 3], // RL, Control Systems
  academics: [0, 2], // Machine Learning, RL
  athletics: [3], // Control Systems
  interests: [1, 3], // Full-Stack Web, Control Systems
};

// Node positions (x-coordinates)
const INPUT_CX = 55;
const CORE_CX = 160;
const PROC_CX = 280;
const OUTPUT_CX = 390;

// Node radii
const INPUT_RADIUS = 14;
const CORE_RADIUS = 28;
const VALUES_RADIUS = 28;
const PROC_RADIUS = 22;
const OUTPUT_RADIUS = 23;

export const NeuralNetwork = memo(function NeuralNetwork({ activeNode, setActiveNode, isActive }: NeuralNetworkProps) {
  const activeInputIndices = useMemo(
    () => new Set<number>(activeNode ? INPUT_MAP[activeNode] ?? [] : []),
    [activeNode]
  );

  const ambientClass = (variant: number) => isActive ? `animate-ambient-comet-${variant}` : "";

  // Keyboard-focused node (for a visible focus ring).
  const [focusedId, setFocusedId] = useState<string | null>(null);

  // Shared interactivity (mouse + keyboard + screen reader) for clickable nodes.
  const nodeProps = (id: ActiveNode, label: string) => {
    const toggle = () => setActiveNode(activeNode === id ? null : id);
    return {
      role: "button" as const,
      tabIndex: isActive ? 0 : -1, // not focusable while the network is hidden behind the quote
      "aria-label": label,
      "aria-pressed": activeNode === id,
      className: "cursor-pointer outline-none",
      onClick: toggle,
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      },
      onFocus: () => setFocusedId(id),
      onBlur: () => setFocusedId(null),
    };
  };

  const focusRing = (cx: number, cy: number, r: number, id: string) =>
    focusedId === id ? (
      <circle cx={cx} cy={cy} r={r + 7} fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={1.5} strokeDasharray="3 3" />
    ) : null;

  return (
    <svg viewBox="-88 0 538 295" className="w-full h-auto" role="group" aria-label="Interactive skills network — select a node to explore, or open a project">
      {/* Definitions */}
      <defs>
        <pattern id="dotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="1" className="fill-white/5" />
        </pattern>
        <linearGradient id="nodeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
        <linearGradient id="coreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.8" />
        </filter>
        <linearGradient id="cometGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="50%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
        <linearGradient id="emeraldCometGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="50%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>

      {/* Background grid */}
      <rect x={-88} y={0} width="100%" height="100%" fill="url(#dotGrid)" opacity="0.5" />

      {/* Connection paths: All Inputs -> Core */}
      {INPUT_NODES.map((input, i) => (
        <g key={`${input.id}-core`}>
          <path
            d={`M ${INPUT_CX + INPUT_RADIUS} ${input.y} Q ${(INPUT_CX + CORE_CX) / 2} ${(input.y + CORE_NODE.y) / 2} ${CORE_CX - CORE_RADIUS} ${CORE_NODE.y}`}
            fill="none"
            className={`transition-all duration-500 ${
              activeNode ? "stroke-indigo-400/40" : "stroke-indigo-400/20"
            }`}
            strokeWidth={1}
          />
          {(activeInputIndices.has(i) || (!activeNode && i === 1)) && (
            <path
              d={`M ${INPUT_CX + INPUT_RADIUS} ${input.y} Q ${(INPUT_CX + CORE_CX) / 2} ${(input.y + CORE_NODE.y) / 2} ${CORE_CX - CORE_RADIUS} ${CORE_NODE.y}`}
              fill="none"
              stroke="url(#cometGradient)"
              strokeWidth={2}
              className={ambientClass((i % 5) + 1)}
              strokeLinecap="round"
            />
          )}
        </g>
      ))}

      {/* Connection paths: All Inputs -> Values */}
      {INPUT_NODES.map((input, i) => (
        <g key={`${input.id}-values`}>
          <path
            d={`M ${INPUT_CX + INPUT_RADIUS} ${input.y} Q ${(INPUT_CX + CORE_CX) / 2} ${(input.y + VALUES_NODE.y) / 2} ${CORE_CX - VALUES_RADIUS} ${VALUES_NODE.y}`}
            fill="none"
            className={`transition-all duration-500 ${
              activeNode ? "stroke-emerald-400/40" : "stroke-emerald-400/15"
            }`}
            strokeWidth={1}
          />
          {(activeInputIndices.has(i) || (!activeNode && i === 3)) && (
            <path
              d={`M ${INPUT_CX + INPUT_RADIUS} ${input.y} Q ${(INPUT_CX + CORE_CX) / 2} ${(input.y + VALUES_NODE.y) / 2} ${CORE_CX - VALUES_RADIUS} ${VALUES_NODE.y}`}
              fill="none"
              stroke="url(#emeraldCometGradient)"
              strokeWidth={2}
              className={ambientClass(((i + 2) % 5) + 1)}
              strokeLinecap="round"
            />
          )}
        </g>
      ))}

      {/* Connection paths: Core -> Processing */}
      {PROCESSING_NODES.map((proc, i) => (
        <g key={`core-${proc.id}`}>
          <path
            d={`M ${CORE_CX + CORE_RADIUS} ${CORE_NODE.y} Q ${(CORE_CX + PROC_CX) / 2} ${(CORE_NODE.y + proc.y) / 2} ${PROC_CX - PROC_RADIUS} ${proc.y}`}
            fill="none"
            className={`transition-all duration-500 ${
              activeNode === proc.id ? "stroke-pink-400" : "stroke-indigo-400/20"
            }`}
            strokeWidth={activeNode === proc.id ? 2 : 1}
          />
          {activeNode === proc.id && (
            <path
              d={`M ${CORE_CX + CORE_RADIUS} ${CORE_NODE.y} Q ${(CORE_CX + PROC_CX) / 2} ${(CORE_NODE.y + proc.y) / 2} ${PROC_CX - PROC_RADIUS} ${proc.y}`}
              fill="none"
              stroke="url(#cometGradient)"
              strokeWidth={3}
              className={isActive ? "animate-comet" : ""}
              strokeLinecap="round"
            />
          )}
          {!activeNode && i === 0 && (
            <path
              d={`M ${CORE_CX + CORE_RADIUS} ${CORE_NODE.y} Q ${(CORE_CX + PROC_CX) / 2} ${(CORE_NODE.y + proc.y) / 2} ${PROC_CX - PROC_RADIUS} ${proc.y}`}
              fill="none"
              stroke="url(#cometGradient)"
              strokeWidth={2}
              className={ambientClass(((i + 2) % 5) + 1)}
              strokeLinecap="round"
            />
          )}
        </g>
      ))}

      {/* Connection paths: Values -> Processing */}
      {PROCESSING_NODES.map((proc, i) => (
        <g key={`values-${proc.id}`}>
          <path
            d={`M ${CORE_CX + VALUES_RADIUS} ${VALUES_NODE.y} Q ${(CORE_CX + PROC_CX) / 2} ${(VALUES_NODE.y + proc.y) / 2} ${PROC_CX - PROC_RADIUS} ${proc.y}`}
            fill="none"
            className={`transition-all duration-500 ${
              activeNode === proc.id ? "stroke-emerald-400" : "stroke-emerald-400/15"
            }`}
            strokeWidth={activeNode === proc.id ? 2 : 1}
          />
          {activeNode === proc.id && (
            <path
              d={`M ${CORE_CX + VALUES_RADIUS} ${VALUES_NODE.y} Q ${(CORE_CX + PROC_CX) / 2} ${(VALUES_NODE.y + proc.y) / 2} ${PROC_CX - PROC_RADIUS} ${proc.y}`}
              fill="none"
              stroke="url(#emeraldCometGradient)"
              strokeWidth={3}
              className={isActive ? "animate-comet" : ""}
              strokeLinecap="round"
            />
          )}
          {!activeNode && i === 2 && (
            <path
              d={`M ${CORE_CX + VALUES_RADIUS} ${VALUES_NODE.y} Q ${(CORE_CX + PROC_CX) / 2} ${(VALUES_NODE.y + proc.y) / 2} ${PROC_CX - PROC_RADIUS} ${proc.y}`}
              fill="none"
              stroke="url(#emeraldCometGradient)"
              strokeWidth={2}
              className={ambientClass(((i + 4) % 5) + 1)}
              strokeLinecap="round"
            />
          )}
        </g>
      ))}

      {/* Connection: Core <-> Values (vertical link) */}
      <path
        d={`M ${CORE_CX} ${CORE_NODE.y + CORE_RADIUS} L ${CORE_CX} ${VALUES_NODE.y - VALUES_RADIUS}`}
        fill="none"
        className="stroke-white/10"
        strokeWidth={1}
        strokeDasharray="4 4"
      />

      {/* Connection paths: Processing -> Outputs */}
      {PROCESSING_NODES.map((proc, i) =>
        OUTPUT_NODES.map((output, j) => (
          <g key={`${proc.id}-${output.id}`}>
            <path
              d={`M ${PROC_CX + PROC_RADIUS} ${proc.y} Q ${(PROC_CX + OUTPUT_CX) / 2} ${(proc.y + output.y) / 2} ${OUTPUT_CX - OUTPUT_RADIUS} ${output.y}`}
              fill="none"
              className="stroke-indigo-400/15 transition-all duration-300"
              strokeWidth={1}
            />
            {(activeNode === proc.id || (!activeNode && i === j)) && (
              <path
                d={`M ${PROC_CX + PROC_RADIUS} ${proc.y} Q ${(PROC_CX + OUTPUT_CX) / 2} ${(proc.y + output.y) / 2} ${OUTPUT_CX - OUTPUT_RADIUS} ${output.y}`}
                fill="none"
                stroke="url(#cometGradient)"
                strokeWidth={2}
                className={activeNode === proc.id && isActive ? "animate-comet" : ambientClass(((i + j + 3) % 5) + 1)}
                strokeLinecap="round"
              />
            )}
          </g>
        ))
      )}

      {/* Input nodes */}
      {INPUT_NODES.map((node, i) => {
        const isLit = activeInputIndices.has(i);
        return (
          <g key={node.id}>
            {/* Glow ring when lit */}
            {isLit && (
              <circle
                cx={INPUT_CX}
                cy={node.y}
                r={INPUT_RADIUS + 4}
                fill="none"
                stroke="url(#nodeGradient)"
                strokeWidth={2}
                opacity={0.6}
                className="animate-pulse"
              />
            )}
            <circle
              cx={INPUT_CX}
              cy={node.y}
              r={INPUT_RADIUS}
              fill={isLit ? "url(#coreGradient)" : "rgba(255,255,255,0.05)"}
              stroke={isLit ? "url(#nodeGradient)" : "rgba(255,255,255,0.2)"}
              strokeWidth={isLit ? 2 : 1}
              filter={isLit ? "url(#glow)" : undefined}
              className="transition-all duration-500"
              style={{ backdropFilter: "blur(8px)" }}
            />
            <text
              x={INPUT_CX - INPUT_RADIUS - 8}
              y={node.y + 3}
              textAnchor="end"
              className={`text-[8px] font-mono transition-all duration-500 ${
                isLit ? "fill-white" : "fill-indigo-300"
              }`}
              filter="url(#textShadow)"
            >
              {node.label}
            </text>
          </g>
        );
      })}

      {/* Core node (clickable) */}
      <g {...nodeProps("core", "Core — about my technical background")}>
        {focusRing(CORE_CX, CORE_NODE.y, CORE_RADIUS, "core")}
        {(activeNode === "core" || activeNode) && (
          <circle
            cx={CORE_CX}
            cy={CORE_NODE.y}
            r={CORE_RADIUS + 6}
            fill="none"
            stroke="url(#nodeGradient)"
            strokeWidth={2}
            opacity={activeNode === "core" ? 0.7 : 0.4}
            className="animate-pulse"
          />
        )}
        <circle
          cx={CORE_CX}
          cy={CORE_NODE.y}
          r={CORE_RADIUS}
          fill={activeNode === "core" ? "url(#coreGradient)" : activeNode ? "url(#coreGradient)" : "rgba(255,255,255,0.08)"}
          stroke={activeNode === "core" ? "#f472b6" : activeNode ? "url(#nodeGradient)" : "rgba(255,255,255,0.25)"}
          strokeWidth={activeNode === "core" ? 3 : 2}
          filter={activeNode ? "url(#glow)" : undefined}
          className="transition-all duration-500 hover:stroke-indigo-400"
        />
        <text
          x={CORE_CX}
          y={CORE_NODE.y + 5}
          textAnchor="middle"
          className={`text-[11px] font-bold font-mono tracking-wider ${
            activeNode ? "fill-white" : "fill-indigo-300"
          }`}
          filter="url(#textShadow)"
        >
          CORE
        </text>
      </g>

      {/* Values node (clickable) */}
      <g {...nodeProps("values", "Values — what drives me")}>
        {focusRing(CORE_CX, VALUES_NODE.y, VALUES_RADIUS, "values")}
        {(activeNode === "values" || activeNode) && (
          <circle
            cx={CORE_CX}
            cy={VALUES_NODE.y}
            r={VALUES_RADIUS + 6}
            fill="none"
            stroke="url(#nodeGradient)"
            strokeWidth={2}
            opacity={activeNode === "values" ? 0.7 : 0.4}
            className="animate-pulse"
          />
        )}
        <circle
          cx={CORE_CX}
          cy={VALUES_NODE.y}
          r={VALUES_RADIUS}
          fill={activeNode === "values" ? "url(#coreGradient)" : activeNode ? "url(#coreGradient)" : "rgba(255,255,255,0.08)"}
          stroke={activeNode === "values" ? "#10b981" : activeNode ? "url(#nodeGradient)" : "rgba(255,255,255,0.25)"}
          strokeWidth={activeNode === "values" ? 3 : 2}
          filter={activeNode ? "url(#glow)" : undefined}
          className="transition-all duration-500 hover:stroke-emerald-400"
        />
        <text
          x={CORE_CX}
          y={VALUES_NODE.y + 4}
          textAnchor="middle"
          className={`text-[9px] font-bold font-mono tracking-wider ${
            activeNode ? "fill-white" : "fill-emerald-300"
          }`}
          filter="url(#textShadow)"
        >
          VALUES
        </text>
      </g>

      {/* Processing nodes (clickable) */}
      {PROCESSING_NODES.map((node) => (
        <g key={node.id} {...nodeProps(node.id as ActiveNode, `${node.label} — explore`)}>
          {focusRing(PROC_CX, node.y, PROC_RADIUS, node.id)}
          {activeNode === node.id && (
            <circle
              cx={PROC_CX}
              cy={node.y}
              r={PROC_RADIUS + 5}
              fill="none"
              stroke="url(#nodeGradient)"
              strokeWidth={2}
              opacity={0.7}
              className="animate-pulse"
            />
          )}
          <circle
            cx={PROC_CX}
            cy={node.y}
            r={PROC_RADIUS}
            fill={activeNode === node.id ? "url(#coreGradient)" : "rgba(255,255,255,0.08)"}
            stroke={activeNode === node.id ? "#f472b6" : "rgba(255,255,255,0.25)"}
            strokeWidth={activeNode === node.id ? 3 : 2}
            filter={activeNode === node.id ? "url(#glow)" : undefined}
            className="transition-all duration-500 hover:stroke-indigo-400"
          />
          <text
            x={PROC_CX}
            y={node.y + 4}
            textAnchor="middle"
            className={`text-[7px] font-bold font-mono tracking-wider ${
              activeNode === node.id ? "fill-white" : "fill-indigo-300"
            }`}
            filter="url(#textShadow)"
          >
            {node.label.toUpperCase()}
          </text>
        </g>
      ))}

      {/* Output nodes — the playable projects (navigation links) */}
      {OUTPUT_NODES.map((node) => (
        <Link
          key={node.id}
          to={node.path}
          aria-label={`Play ${node.label} — ${node.subtitle}`}
          tabIndex={isActive ? 0 : -1}
          className="group cursor-pointer outline-none"
          onFocus={() => setFocusedId(node.id)}
          onBlur={() => setFocusedId(null)}
        >
          <g>
            {focusRing(OUTPUT_CX, node.y, OUTPUT_RADIUS, node.id)}
            {/* Badge (scales on hover/focus); labels stay put */}
            <g
              className="transition-transform duration-200 ease-out group-hover:scale-110 group-focus-visible:scale-110"
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
            >
              {/* Idle "play me" pulse to invite interaction */}
              {isActive && (
                <circle cx={OUTPUT_CX} cy={node.y} r={OUTPUT_RADIUS + 4} fill="none" stroke="#f472b6" strokeWidth={1.5} opacity={0.35} className="animate-pulse" />
              )}
              <circle
                cx={OUTPUT_CX}
                cy={node.y}
                r={OUTPUT_RADIUS}
                fill="rgba(244,114,182,0.12)"
                stroke="#f472b6"
                strokeWidth={2}
                className="transition-all duration-300 group-hover:fill-pink-500/25"
                filter="url(#glow)"
              />
              {/* Play triangle */}
              <path
                d={`M ${OUTPUT_CX - 5} ${node.y - 7} L ${OUTPUT_CX + 8} ${node.y} L ${OUTPUT_CX - 5} ${node.y + 7} Z`}
                fill="#fde7f3"
                className="transition-colors duration-300 group-hover:fill-white"
              />
            </g>
            <text x={OUTPUT_CX} y={node.y + OUTPUT_RADIUS + 12} textAnchor="middle" className="fill-pink-100 text-[8px] font-bold font-mono tracking-wider" filter="url(#textShadow)">
              {node.label.toUpperCase()}
            </text>
            <text x={OUTPUT_CX} y={node.y + OUTPUT_RADIUS + 22} textAnchor="middle" className="fill-pink-300/80 text-[7px] font-mono tracking-wide" filter="url(#textShadow)">
              {node.subtitle.toUpperCase()}
            </text>
          </g>
        </Link>
      ))}

      {/* Interactivity hint */}
      {isActive && !activeNode && (
        <text
          x={225}
          y={290}
          textAnchor="middle"
          className="fill-indigo-300/60 text-[8px] font-mono tracking-[0.2em] animate-pulse"
        >
          ◂ CLICK A NODE TO EXPLORE ▸
        </text>
      )}
    </svg>
  );
});
