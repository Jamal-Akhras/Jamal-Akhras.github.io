// src/constants/projects.ts
// Playable demos shown on the /projects page. (The engineering/ML project
// history lives on the CV — see src/constants/cv.ts.)

export interface Demo {
  title: string;
  blurb: string;
  to: string;
}

export const DEMOS: Demo[] = [
  {
    title: "AI Racer",
    blurb: "Draw a track and watch a population of cars learn the racing line with NEAT.",
    to: "/ai-racer",
  },
  {
    title: "Chrome Dino (Steve)",
    blurb: "The classic endless runner — rebuilt, with optional AI players.",
    to: "/dino-game",
  },
];
