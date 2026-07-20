// src/constants/projects.ts
// Playable demos shown on the /projects page. The engineering/ML project
// history lives on the CV page.

export type DemoKind = "racer" | "runner" | "search";

export interface Demo {
  title: string;
  eyebrow: string;
  blurb: string;
  to: string;
  kind: DemoKind;
  status: string;
  accent: "indigo" | "emerald" | "pink";
  tags: string[];
  actions: string[];
}

export const DEMOS: Demo[] = [
  {
    title: "AI Racer",
    eyebrow: "Neuroevolution sandbox",
    blurb: "Draw a track and watch a population of cars learn racing lines with NEAT-style evolution.",
    to: "/ai-racer",
    kind: "racer",
    status: "Playable",
    accent: "indigo",
    tags: ["NEAT", "Canvas", "Track editor", "Training telemetry"],
    actions: ["Draw a custom circuit", "Tune AI population", "Watch fitness curves"],
  },
  {
    title: "Chrome Dino (Steve)",
    eyebrow: "AI runner modes",
    blurb: "The classic endless runner rebuilt with free play, AI challenge, and autonomous endless modes.",
    to: "/dino-game",
    kind: "runner",
    status: "Playable",
    accent: "emerald",
    tags: ["Game loop", "AI ghost", "Endless mode", "React"],
    actions: ["Play manually", "Race the AI ghost", "Let Steve run forever"],
  },
  {
    title: "Search Strategy Visualizer",
    eyebrow: "Route-planning lab",
    blurb: "Compare A*, bidirectional A*, Dijkstra, BFS, and DFS across weighted terrain.",
    to: "/search-visualizer",
    kind: "search",
    status: "Playable",
    accent: "pink",
    tags: ["A*", "Dijkstra", "Weighted terrain", "Overlay compare"],
    actions: ["Draw terrain", "Compare search frontiers", "Inspect route metrics"],
  },
];
