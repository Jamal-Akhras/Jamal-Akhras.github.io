// src/ai/types.ts

export type Action = { jump: boolean; duck: boolean };

export type AIObstacle = {
  dx: number;            // distance from dino (screen space)
  width: number;
  height: number;
  yTop: number;
  kind: 'cactus' | 'bird';
};

export type AIObservation = {
  dinoY: number;
  dinoVy: number;
  ducking: boolean;
  speed: number;
  score: number;
  obstacles: AIObstacle[];
};
