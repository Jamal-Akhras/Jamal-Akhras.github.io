// src/ai/aiControllers.ts
import type { Action, AIObservation } from "./types";

/**
 * Tunables
 * - FLOOR_Y must match your game (240 - 40 = 200)
 * - Low bird = bottom of bird is < LOW_CLEARANCE px above the ground → must DUCK
 * - We do NOT jump for birds (mid/high are safe, low is duck-only).
 */
const FLOOR_Y = 200;
const LOW_CLEARANCE = 34; // px; true low ~30 in your spawns, add a little margin

// Time-to-impact windows (seconds before contact) — for CACTI ONLY
const BASE_T_MIN = 0.15;
const BASE_T_MAX = 0.25;
const TALL_T_MIN = 0.2;
const TALL_T_MAX = 0.25;

// Endless mode jumps a touch later
const ENDLESS_TIME_SHIFT = -0.015;

/** Helpers */
function timeToImpact(dx: number, speed: number): number {
  return dx / Math.max(60, speed); // avoid div-by-zero / ultra low speed
}

function isLowBird(o: { yTop: number; height: number }): boolean {
  // clearance from ground to bottom of bird
  const bottom = o.yTop + o.height;
  const clearance = FLOOR_Y - bottom;
  return clearance < LOW_CLEARANCE;
}

/** ---------------- Rule-based controllers ---------------- */
export function challengeController(obs: AIObservation): Action {
  const { dinoVy, dinoY, obstacles, speed } = obs;
  if (obstacles.length === 0) return { jump: false, duck: false };

  const o = obstacles[0];
  const onGround = Math.abs(dinoVy) < 1e-3 || dinoY > 160;

  // Birds: never jump; duck only if low and close enough
  if (o.kind === "bird") {
    if (isLowBird(o)) {
      const t = timeToImpact(o.dx, speed);
      // Duck in a reasonable approach window
      if (t <= 0.40) return { jump: false, duck: true };
    }
    return { jump: false, duck: false };
  }

  // Cactus: time-window jump
  const t = timeToImpact(o.dx, speed);
  const tall = o.height >= 38;
  const tMin = tall ? TALL_T_MIN : BASE_T_MIN;
  const tMax = tall ? TALL_T_MAX : BASE_T_MAX;

  if (onGround && (t < tMin || (t >= tMin && t <= tMax))) {
    return { jump: true, duck: false };
  }
  return { jump: false, duck: false };
}

export function endlessController(obs: AIObservation): Action {
  const { dinoVy, dinoY, obstacles, speed } = obs;
  if (obstacles.length === 0) return { jump: false, duck: false };

  const o = obstacles[0];
  const onGround = Math.abs(dinoVy) < 1e-3 || dinoY > 160;

  // Birds: never jump; duck only if low and close enough
  if (o.kind === "bird") {
    if (isLowBird(o)) {
      const t = timeToImpact(o.dx, speed);
      if (t <= 0.42) return { jump: false, duck: true }; // tiny bit more conservative in Endless
    }
    return { jump: false, duck: false };
  }

  // Cactus: slightly later jump than Challenge
  const t = timeToImpact(o.dx, speed);
  const tall = o.height >= 38;
  const tMin = (tall ? TALL_T_MIN : BASE_T_MIN) + ENDLESS_TIME_SHIFT;
  const tMax = (tall ? TALL_T_MAX : BASE_T_MAX) + ENDLESS_TIME_SHIFT;

  if (onGround && (t < tMin || (t >= tMin && t <= tMax))) {
    return { jump: true, duck: false };
  }
  return { jump: false, duck: false };
}

export function baselineController(): Action {
  return { jump: false, duck: false };
}

/** --------------- Replay scaffolding (Phase 2) --------------- */
export type ReplayFrame = { t: number; action: Action };
export type ReplayTrack = ReplayFrame[];

export function makeReplayController(track: ReplayTrack) {
  let t = 0, i = 0;
  return (): Action => {
    t += 1 / 60;
    while (i + 1 < track.length && track[i + 1].t <= t) i++;
    return track[i]?.action ?? { jump: false, duck: false };
  };
}
