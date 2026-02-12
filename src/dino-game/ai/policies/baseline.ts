// src/ai/policies/baseline.ts
import type { AIObservation, Action } from '../types';

/**
 * Super simple, deterministic heuristic (non-ML) policy:
 * - Jump when the nearest obstacle is fairly close
 * - Duck if the nearest obstacle is a mid/high bird
 */
export function baselinePolicy(obs: AIObservation): Action {
  const o = obs.obstacles[0]; // nearest ahead
  if (!o) return { jump: false, duck: false };

  const isLowBird = o.kind === 'bird' && o.yTop > obs.dinoY - 10; // crude “low-ish” check
  const isHighBird = o.kind === 'bird' && o.yTop + o.height < obs.dinoY - 16;

  // crude “on ground” check (works for our sim since vy=0 at ground)
  const onGround = Math.abs(obs.dinoVy) < 0.01;

  // “close enough to react” window scales a bit with speed
  const reactDist = Math.max(90, Math.min(140, 70 + 0.2 * obs.speed));

  const jump =
    onGround &&
    o.dx < reactDist &&
    (o.kind === 'cactus' || isLowBird);

  const duck =
    !jump &&
    o.kind === 'bird' &&
    isHighBird &&
    o.dx < reactDist + 20;

  return { jump, duck };
}
